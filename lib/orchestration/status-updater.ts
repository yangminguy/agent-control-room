/**
 * Status Updater
 * Phase E Task 4: Roadmap & Kanban Status Update
 *
 * Takes an ExecutionResultSummary (from the runner-result subagent) and a
 * DecisionClassification (from classifyExecutionResult) and applies the
 * correct status to the PlanTask and KanbanCard fields.
 *
 * Mapping:
 *   decision "pass"           → PlanTask status "done"
 *   decision "fail"           → PlanTask status "blocked"
 *   decision "qa_needed"      → PlanTask status "needs_review"
 *   decision "retry_needed"   → PlanTask status "ready"
 *   decision "blocked"        → PlanTask status "blocked"
 *   decision "drift_detected" → PlanTask status "needs_review"
 *   decision "manual_review"  → PlanTask status "needs_review"
 */

import type { PlanTaskStatus, CompletionJudgment, DecisionClassification, RoadmapStatus } from "@/lib/types";
import {
  updatePlanTaskStatus,
  updateKanbanCardResult,
  getFeaturePlanById,
} from "@/lib/storage/feature-plan-store";
import { updateRoadmapStageStatus } from "@/lib/storage/roadmap-store";

// ─── Public input types ───────────────────────────────────────────────────────

/**
 * Subset of execution output that the runner-result subagent delivers.
 * All fields optional — the updater guards against missing data.
 */
export type ExecutionResultSummary = {
  changedFiles?: string[];
  diffSummary?: string;
  /** True if typecheck / lint / build all passed. Used as a safety gate. */
  checksPass?: boolean;
  exitCode?: number;
  rawOutput?: string;
};

/** Returned after a successful update so callers can inspect what changed. */
export type StatusUpdateSummary = {
  planId: string;
  taskId: string;
  previousDecision: DecisionClassification["decision"];
  appliedStatus: PlanTaskStatus;
  kanbanUpdated: boolean;
  roadmapUpdated: boolean;
  skipped: boolean;
  skipReason?: string;
  auditLog: string[];
};

// ─── Decision → PlanTask status mapping ──────────────────────────────────────

const DECISION_TO_STATUS: Record<DecisionClassification["decision"], PlanTaskStatus> = {
  pass: "done",
  fail: "blocked",
  qa_needed: "needs_review",
  retry_needed: "ready",
  blocked: "blocked",
  drift_detected: "needs_review",
  manual_review: "needs_review",
};

// ─── Decision → Roadmap status mapping ───────────────────────────────────────

const DECISION_TO_ROADMAP_STATUS: Record<DecisionClassification["decision"], RoadmapStatus | null> = {
  pass: "completed",
  fail: "failed",
  qa_needed: "user_input_required",
  retry_needed: "active",
  blocked: "blocked",
  drift_detected: "user_input_required",
  manual_review: "user_input_required",
};

// ─── CompletionJudgment mapping ───────────────────────────────────────────────

function toCompletionJudgment(decision: DecisionClassification["decision"]): CompletionJudgment {
  switch (decision) {
    case "pass":
      return "completed";
    case "fail":
    case "blocked":
      return "not_completed";
    case "qa_needed":
    case "drift_detected":
    case "manual_review":
      return "partial";
    case "retry_needed":
      return "partial";
    default:
      return "pending";
  }
}

// ─── Validation helpers ───────────────────────────────────────────────────────

/**
 * Returns a skip reason string if the update should be aborted, or null
 * if it is safe to proceed.
 */
function validateInputs(
  planId: string,
  taskId: string,
  result: ExecutionResultSummary,
  decisionResult: DecisionClassification,
): string | null {
  if (!planId || !planId.trim()) return "planId is missing or empty";
  if (!taskId || !taskId.trim()) return "taskId is missing or empty";
  if (!decisionResult.decision) return "decisionResult.decision is missing";

  // Guard: do not mark done when checks explicitly failed
  if (
    decisionResult.decision === "pass" &&
    result.checksPass === false
  ) {
    return "decision is 'pass' but checksPass is false — refusing to mark done";
  }

  // Guard: do not mark done when exit code indicates failure
  if (
    decisionResult.decision === "pass" &&
    typeof result.exitCode === "number" &&
    result.exitCode !== 0
  ) {
    return `decision is 'pass' but exitCode is ${result.exitCode} — refusing to mark done`;
  }

  return null;
}

// ─── Adapter ─────────────────────────────────────────────────────────────────

/**
 * applyStatusUpdate — main entry point.
 *
 * 1. Validates inputs; skips gracefully when data is missing or contradictory.
 * 2. Resolves the target PlanTaskStatus from the decision.
 * 3. Updates the PlanTask status via feature-plan-store.
 * 4. Updates KanbanCard fields (changedFiles, diffSummary, completionJudgment,
 *    nextPrompt) on the same task record.
 * 5. Attempts to update the Roadmap stage status (non-fatal if it fails).
 * 6. Returns a StatusUpdateSummary for the caller / audit trail.
 */
export async function applyStatusUpdate(
  planId: string,
  taskId: string,
  result: ExecutionResultSummary,
  decisionResult: DecisionClassification,
): Promise<StatusUpdateSummary> {
  const auditLog: string[] = [];
  const timestamp = new Date().toISOString();

  const log = (msg: string) => {
    const line = `[status-updater] ${timestamp} planId=${planId} taskId=${taskId} | ${msg}`;
    auditLog.push(line);
    console.log(line);
  };

  log(`Starting status update. decision=${decisionResult.decision} reason=${decisionResult.reason ?? "(none)"}`);

  // ── 1. Validate ──────────────────────────────────────────────────────────
  const skipReason = validateInputs(planId, taskId, result, decisionResult);
  if (skipReason) {
    log(`SKIP: ${skipReason}`);
    return {
      planId,
      taskId,
      previousDecision: decisionResult.decision,
      appliedStatus: "blocked",
      kanbanUpdated: false,
      roadmapUpdated: false,
      skipped: true,
      skipReason,
      auditLog,
    };
  }

  // ── 2. Resolve target status ─────────────────────────────────────────────
  const appliedStatus = DECISION_TO_STATUS[decisionResult.decision];
  log(`Resolved PlanTask status: ${appliedStatus}`);

  // ── 3. Update PlanTask status ────────────────────────────────────────────
  try {
    await updatePlanTaskStatus(planId, taskId, appliedStatus);
    log(`PlanTask status updated to "${appliedStatus}"`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    log(`ERROR updating PlanTask status: ${message}`);
    return {
      planId,
      taskId,
      previousDecision: decisionResult.decision,
      appliedStatus,
      kanbanUpdated: false,
      roadmapUpdated: false,
      skipped: true,
      skipReason: `PlanTask update failed: ${message}`,
      auditLog,
    };
  }

  // ── 4. Update KanbanCard fields ──────────────────────────────────────────
  const completionJudgment = toCompletionJudgment(decisionResult.decision);

  const diffSummary =
    result.diffSummary ??
    (result.rawOutput ? result.rawOutput.slice(0, 400) : undefined);

  const nextPrompt =
    decisionResult.decision === "retry_needed"
      ? undefined // DecisionClassification has no nextPrompt field
      : undefined;

  let kanbanUpdated = false;
  try {
    await updateKanbanCardResult(planId, taskId, {
      ...(result.changedFiles !== undefined && { changedFiles: result.changedFiles }),
      ...(diffSummary !== undefined && { diffSummary }),
      completionJudgment,
      ...(nextPrompt !== undefined && { nextPrompt }),
      status: appliedStatus,
    });
    kanbanUpdated = true;
    log(
      `KanbanCard updated: completionJudgment=${completionJudgment}` +
        ` changedFiles=${result.changedFiles?.length ?? 0}` +
        ` diffSummary=${diffSummary ? "yes" : "none"}`,
    );
  } catch (err) {
    // KanbanCard update failure is non-fatal: PlanTask was already updated.
    const message = err instanceof Error ? err.message : String(err);
    log(`WARN: KanbanCard update failed (non-fatal): ${message}`);
  }

  // ── 5. Update Roadmap stage status ───────────────────────────────────────
  // Look up projectId from the FeaturePlan so we can find the roadmap.
  // The roadmap uses projectId as its key and stageId = planId (plans map 1:1 to stages).
  let roadmapUpdated = false;
  try {
    const plan = await getFeaturePlanById(planId);
    if (!plan) {
      log(`WARN: Roadmap update skipped — FeaturePlan not found for planId=${planId}`);
    } else {
      const roadmapStatus = DECISION_TO_ROADMAP_STATUS[decisionResult.decision];
      if (roadmapStatus === null) {
        log(`Roadmap update skipped — no roadmap status mapped for decision=${decisionResult.decision}`);
      } else {
        const completionPercentage = appliedStatus === "done" ? 100 : undefined;
        const updated = await updateRoadmapStageStatus(plan.projectId, planId, {
          status: roadmapStatus,
          ...(completionPercentage !== undefined && { completionPercentage }),
        });
        if (updated) {
          roadmapUpdated = true;
          log(`Roadmap stage updated: projectId=${plan.projectId} stageId=${planId} status=${roadmapStatus}`);
        } else {
          log(`WARN: Roadmap stage not found for projectId=${plan.projectId} stageId=${planId}`);
        }
      }
    }
  } catch (err) {
    // Roadmap update failure is non-fatal: Kanban and PlanTask were already updated.
    const message = err instanceof Error ? err.message : String(err);
    log(`WARN: Roadmap update failed (non-fatal): ${message}`);
  }

  log(`Status update complete. appliedStatus=${appliedStatus} kanbanUpdated=${kanbanUpdated} roadmapUpdated=${roadmapUpdated}`);

  return {
    planId,
    taskId,
    previousDecision: decisionResult.decision,
    appliedStatus,
    kanbanUpdated,
    roadmapUpdated,
    skipped: false,
    auditLog,
  };
}
