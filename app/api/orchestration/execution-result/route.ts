import { getExecutionLogByTaskId } from "@/lib/storage/execution-log-store";
import { getFeaturePlanById } from "@/lib/storage/feature-plan-store";
import { normalizeExecutionResult } from "@/lib/runner/execution-result-normalizer";
import { buildHermesPacket } from "@/lib/hermes/packet-builder";
import { classifyExecutionResult } from "@/lib/orchestration/decision-classifier";
import { applyStatusUpdate } from "@/lib/orchestration/status-updater";
import type {
  HermesExecutionInput,
  RiskLevel,
  CheckResult,
} from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/orchestration/execution-result
 *
 * Post-execution orchestration step. Accepts planId + taskId, then:
 *   1. Fetches the stored ExecutionLog for the task.
 *   2. Normalises it into an ExecutionResultSummary.
 *   3. Builds a typed Hermes supervision packet.
 *   4. Classifies the result into a DecisionClassification.
 *   5. Applies Kanban + Roadmap status updates via applyStatusUpdate.
 *   6. Returns { summary, packet, decision, statusUpdate } to the caller.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { planId: string; taskId: string };
    const { planId, taskId } = body;

    if (!planId || !taskId) {
      return Response.json(
        { error: "planId and taskId are required" },
        { status: 400 },
      );
    }

    // ── Step 1: Fetch execution log ──────────────────────────────────────────
    const log = await getExecutionLogByTaskId(taskId);
    if (!log) {
      return Response.json(
        { error: `No execution log found for taskId: ${taskId}` },
        { status: 404 },
      );
    }

    // ── Step 2: Fetch task boundary fields from the plan ────────────────────
    const plan = await getFeaturePlanById(planId);
    const planTask = plan?.tasks.find((t) => t.id === taskId);

    // Extract changedFiles from log lines (same approach as result-summary GET)
    const changedFiles = extractChangedFilesFromLog(log.logLines);

    // ── Step 3: Normalise into ExecutionResultSummary ───────────────────────
    const summary = normalizeExecutionResult(log, planId, changedFiles);

    // Enrich summary with task boundary fields when available
    if (planTask) {
      if (planTask.allowedFiles) summary.allowedFiles = planTask.allowedFiles;
      if (planTask.doNotTouchFiles) summary.doNotTouchFiles = planTask.doNotTouchFiles;
      summary.changesExpected = true; // Task existed and ran — changes were expected
    }

    // ── Step 4: Build HermesExecutionInput ──────────────────────────────────
    // Map ExecutionResultSummary.checksRun ("passed"|"failed"|"not_run")
    // to HermesExecutionInput.checksResult ("pass"|"fail"|"skipped").
    const checksResult = mapChecksRun(summary.checksRun);

    // Derive executionStatus for the Hermes packet from the log status.
    const hermesStatus = deriveHermesStatus(log.status);

    // phaseId: PlanTask does not carry a phaseId — use planId as proxy so the
    // packet builder has a non-empty string. The UI can refine this if needed.
    const phaseId = planTask?.planId ?? planId;

    // riskLevel: derive from execution outcome; boundary violations are high risk.
    const riskLevel = deriveRiskLevel(log.status);

    const hermesInput: HermesExecutionInput = {
      taskId,
      phaseId,
      planId,
      assignedAgent: log.agent,
      executionStatus: hermesStatus,
      logSummary: summary.logSummary,
      changedFiles: summary.changedFiles,
      checksResult,
      riskLevel,
      failureReason: summary.failureReason,
      exitCode: log.exitCode ?? null,
      errorMessages: extractErrorMessages(log.logLines),
      allowedFiles: planTask?.allowedFiles ?? [],
      doNotTouchFiles: planTask?.doNotTouchFiles ?? [],
      changesExpected: summary.changesExpected ?? true,
    };

    // ── Step 5: Build Hermes packet ──────────────────────────────────────────
    const packet = buildHermesPacket(hermesInput);

    // ── Step 6: Classify the result ─────────────────────────────────────────
    const decision = classifyExecutionResult(hermesInput);

    // ── Step 7: Apply Kanban + Roadmap status update ─────────────────────────
    // Build the lightweight ExecutionResultSummary the updater needs for its
    // safety gates (checksPass, exitCode) from data we already have.
    const allChecksPassed =
      Object.keys(checksResult).length > 0 &&
      Object.values(checksResult).every((v) => v === "pass" || v === "skipped");
    const checksPass = Object.keys(checksResult).length > 0 ? allChecksPassed : undefined;

    const statusResult = await applyStatusUpdate(planId, taskId, {
      changedFiles: summary.changedFiles,
      diffSummary: summary.logSummary?.slice(0, 400),
      exitCode: log.exitCode ?? undefined,
      checksPass,
    }, decision);

    return Response.json({ summary, packet, decision, statusUpdate: statusResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

// ── Private helpers ──────────────────────────────────────────────────────────

/**
 * Extracts changed file paths from boundary-violation log lines.
 * Mirrors the logic in /api/runner/result-summary GET handler.
 */
function extractChangedFilesFromLog(logLines: string[]): string[] {
  for (const line of logLines) {
    if (line.startsWith("[BOUNDARY] Forbidden files touched: ")) {
      return line
        .replace("[BOUNDARY] Forbidden files touched: ", "")
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }
  return [];
}

/**
 * Maps ExecutionResultSummary.checksRun values to the "pass"|"fail"|"skipped"
 * vocabulary that HermesExecutionInput.checksResult requires.
 */
function mapChecksRun(
  checksRun: {
    typecheck?: CheckResult;
    lint?: CheckResult;
    test?: CheckResult;
    build?: CheckResult;
  },
): Record<string, "pass" | "fail" | "skipped"> {
  const map: Record<CheckResult, "pass" | "fail" | "skipped"> = {
    passed: "pass",
    failed: "fail",
    not_run: "skipped",
  };

  const result: Record<string, "pass" | "fail" | "skipped"> = {};
  for (const [key, value] of Object.entries(checksRun)) {
    if (value !== undefined) {
      result[key] = map[value];
    }
  }
  return result;
}

/**
 * Converts the runner's ExecutionLog.status into the four-value vocabulary
 * that HermesExecutionInput.executionStatus accepts.
 */
function deriveHermesStatus(
  status: "running" | "done" | "failed" | "review_blocked" | "boundary_violation",
): HermesExecutionInput["executionStatus"] {
  switch (status) {
    case "done":
      return "success";
    case "boundary_violation":
      return "boundary_violation";
    case "review_blocked":
      return "needs_approval";
    default:
      // "failed" and "running" (edge case — task queried before completion)
      return "failure";
  }
}

/**
 * Derives a conservative risk level from the execution outcome.
 * Boundary violations are treated as high risk; failures as medium.
 */
function deriveRiskLevel(
  status: "running" | "done" | "failed" | "review_blocked" | "boundary_violation",
): RiskLevel {
  switch (status) {
    case "done":
      return "low";
    case "boundary_violation":
      return "high";
    case "review_blocked":
      return "medium";
    default:
      return "medium";
  }
}

/**
 * Pulls the first [ERROR] line from log output as a single-element error
 * message array for the decision classifier.
 */
function extractErrorMessages(logLines: string[]): string[] {
  return logLines
    .filter((line) => line.startsWith("[ERROR]"))
    .map((line) => line.replace(/^\[ERROR\]\s*/, "").trim())
    .slice(0, 5); // cap at 5 messages; classifier only needs the first
}
