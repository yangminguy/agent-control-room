// Shared phase-finalize logic — extracted verbatim from /api/runner's post-spawn
// block so it can be invoked from BOTH the inline SSE runner and (later) a
// separate-process local runner that spawns the CLI outside acr-web and then
// calls back here to finalize. Behavior is identical to the original inline code;
// the only change is `controller.enqueue(encode(line, type))` → `emit(line, type)`.
//
// Covered: quota-error parse, file-boundary check, status derivation, workspace
// updates, execution-log update, phase commit, merge coordination, the L5
// taskCallback (the ONLY path by which L5 learns a phase/plan finished), per-phase
// telegram, and the subagent-performance record.

import { getDiffSummary, getLogTail, commitAll } from "@/lib/runner/git-utils";
import { coordinateMerge, type MergeCoordinationResult } from "@/lib/runner/merge-coordinator";
import { updateExecutionLog } from "@/lib/storage/execution-log-store";
import { updatePlanTaskStatus } from "@/lib/storage/feature-plan-store";
import { listCTOTaskMetadataByPlan } from "@/lib/storage/cto-task-metadata-store";
import {
  checkFileBoundaries,
  collectChangedFiles,
  countModifiedExistingFiles,
  extractFileBoundariesFromPrompt,
} from "@/lib/runner/file-boundary";
import { parseQuotaError, applyQuotaParseResult } from "@/lib/agents/quota-parser";
import { notifyExecutionResult } from "@/lib/monitor/hermes-packet-notifier";
import { updateWorkspaceStatus, addChangedFile } from "@/lib/workspace/workspace-store";
import { writeSubagentPerformanceRecord } from "@/lib/storage/subagent-memory-store";
import crypto from "crypto";

type RunnerAgent = "claude-code" | "codex" | "antigravity";
type EmitType = "stdout" | "stderr" | "system";

interface FinalizePlanTask {
  // title is required (PlanTask.title: string) so `plan.title || planTask.title`
  // resolves to `string` for coordinateMerge's `planTitle: string`.
  title: string;
  generatedPrompt?: string;
  allowedFiles?: string[];
  doNotTouchFiles?: string[];
}

interface FinalizePlan {
  title: string;
  projectId?: string;
  tasks: Array<{ id: string; status?: string }>;
}

export interface FinalizePhaseArgs {
  planId: string;
  taskId: string;
  agent: RunnerAgent;
  cwd: string;
  prompt: string;
  plan: FinalizePlan;
  planTask: FinalizePlanTask;
  branchName: string;
  executionLog: { id: string; startedAt: string };
  workspace: { id: string };
  verify: { exitCode: number; emptyOutput: boolean; attempts: number };
  logBuffer: string[];
  tokenAcc: { input_tokens: number; output_tokens: number; total_tokens: number; estimated_cost_usd: number };
  gotTokens: boolean;
  /** Progress sink — the inline runner forwards these to its SSE controller. */
  emit: (line: string, type: EmitType) => void;
}

/**
 * Finalize a single phase execution after the agent CLI has exited. Pure of any
 * transport concern: all progress goes through `emit`. Returns the resolved exit
 * code for the caller's convenience.
 */
export async function finalizePhaseExecution(args: FinalizePhaseArgs): Promise<{ exitCode: number }> {
  const {
    planId, taskId, agent, cwd, prompt,
    plan, planTask, branchName, executionLog, workspace,
    verify, logBuffer, tokenAcc, gotTokens, emit,
  } = args;

  const exitCode = verify.exitCode;
  const emptyOutput = verify.emptyOutput;

  // MULTI-AGENT RUNTIME: Check for quota errors in output
  const fullLog = logBuffer.join("\n");
  const quotaError = parseQuotaError(fullLog);
  if (quotaError) {
    applyQuotaParseResult(quotaError);
    emit(`[QUOTA] ${quotaError.reason}. Retry time: ${quotaError.nextRetryAt || "unknown"}`, "system");
  }

  const promptBoundaries = extractFileBoundariesFromPrompt(planTask.generatedPrompt || prompt);
  const changedFilesAtCompletion = collectChangedFiles(cwd);
  // Read before the phase commit (porcelain is empty afterward). Lets the L5
  // verifier flag an integrate phase that only added new files without wiring
  // them into any existing entry point.
  const modifiedExistingCount = countModifiedExistingFiles(cwd);
  const boundaryCheck = checkFileBoundaries(changedFilesAtCompletion, {
    allowedFiles: planTask.allowedFiles ?? promptBoundaries.allowedFiles,
    doNotTouchFiles: planTask.doNotTouchFiles ?? promptBoundaries.doNotTouchFiles,
  });
  const boundaryViolation = boundaryCheck.hasViolation;

  // ExecutionLog/PlanTask status. emptyOutput (exit 0 but no file changes)
  // is review-blocked, not a clean success — this is the "empty branch" guard.
  const executionStatus = boundaryViolation
    ? "boundary_violation"
    : emptyOutput
      ? "review_blocked"
      : exitCode === 0
        ? "done"
        : "failed";
  const planTaskStatus = boundaryViolation
    ? "needs_review"
    : emptyOutput
      ? "needs_review"
      : exitCode === 0
        ? "done"
        : "blocked";
  const boundaryLogLines = boundaryViolation
    ? [
        `[BOUNDARY] Forbidden files touched: ${boundaryCheck.forbiddenFiles.join(", ")}`,
        `[BOUNDARY] Why it matters: ${boundaryCheck.reason}`,
        `[BOUNDARY] Next action: ${boundaryCheck.nextAction}`,
      ]
    : [];

  // Phase B: Workspace에 changed files 추가
  try {
    for (const filePath of changedFilesAtCompletion) {
      await addChangedFile(workspace.id, filePath);
    }
  } catch (error) {
    emit(`[WARNING] Failed to record changed files in workspace: ${error instanceof Error ? error.message : String(error)}`, "system");
  }

  // Phase B: Workspace 상태 업데이트
  const workspaceStatus = boundaryViolation
    ? "needs_review"
    : emptyOutput
      ? "needs_review"
      : exitCode === 0
        ? "needs_review"
        : "qa_failed";
  try {
    await updateWorkspaceStatus(workspace.id, workspaceStatus);
  } catch (error) {
    emit(`[WARNING] Failed to update workspace status: ${error instanceof Error ? error.message : String(error)}`, "system");
  }

  // ExecutionLog 업데이트 (+ Phase 6 measured tokens when captured)
  await updateExecutionLog(executionLog.id, {
    completedAt: new Date().toISOString(),
    exitCode,
    logLines: [...logBuffer, ...boundaryLogLines],
    status: executionStatus,
    ...(gotTokens
      ? {
          input_tokens: tokenAcc.input_tokens,
          output_tokens: tokenAcc.output_tokens,
          total_tokens: tokenAcc.total_tokens,
          estimated_cost_usd: Number(tokenAcc.estimated_cost_usd.toFixed(4)),
        }
      : {}),
  });

  // 태스크 상태 업데이트
  try {
    await updatePlanTaskStatus(planId, taskId, planTaskStatus);
  } catch (error) {
    emit(`[ERROR] Failed to update task status: ${error instanceof Error ? error.message : String(error)}`, "system");
  }

  // Commit a clean, successful phase so the next phase / merge starts from a
  // clean tree. Skip on failure, boundary violation, or empty output.
  if (exitCode === 0 && !boundaryViolation && !emptyOutput) {
    const committed = await commitAll(cwd, `ACR phase: ${planTask.title} [${branchName}]`);
    emit(committed ? `[COMMIT] Phase changes committed on ${branchName}` : "[COMMIT] No changes to commit", "system");
  }

  // Phase 16: phase-context handoff payload — computed AFTER the commit (so
  // this phase's work is in the diff) but BEFORE any merge moves HEAD to the
  // base branch (which would empty `git diff base...HEAD`).
  const diffSummary = getDiffSummary(cwd);
  const logTail = getLogTail(logBuffer);

  const allDone = plan.tasks.every((t) => t.id === taskId ? true : t.status === "done");

  // Phase 2: review & merge once the whole plan completed cleanly.
  // D3+ gating + PR-vs-local-merge decisions live in coordinateMerge.
  let mergeInfo: MergeCoordinationResult | null = null;
  if (allDone && exitCode === 0 && !boundaryViolation && !emptyOutput) {
    let riskLevel: string | undefined;
    try {
      const metas = await listCTOTaskMetadataByPlan(planId);
      riskLevel = metas.find((m) => m.taskId === taskId)?.risk_level;
    } catch {
      // best-effort; treat as low-risk
    }
    try {
      mergeInfo = coordinateMerge({
        cwd,
        branch: branchName,
        planTitle: plan.title || planTask.title,
        riskLevel,
      });
      emit(`[MERGE] ${mergeInfo.action}: ${mergeInfo.detail}${mergeInfo.prUrl ? ` (${mergeInfo.prUrl})` : ""}`, "system");
    } catch (error) {
      emit(`[WARNING] Merge coordination failed: ${error instanceof Error ? error.message : String(error)}`, "system");
    }
  }

  // L5 Business OS callback (projectId가 "l5-"로 시작하면 L5에서 온 태스크)
  if (plan.projectId?.startsWith("l5-")) {
    const l5TaskId = plan.projectId.slice(3);
    const cbStatus = boundaryViolation
      ? "blocked"
      : emptyOutput
        ? "empty_output"
        : exitCode !== 0
          ? "failed"
          : mergeInfo?.conflict
            ? "merge_conflict"
            : allDone
              ? "all_done"
              : "phase_complete";
    const cbSummary = emptyOutput
      ? `ACR: ${planTask.title} produced no file changes after ${verify.attempts} attempt(s) — needs review`
      : exitCode === 0
        ? `ACR: ${planTask.title} completed by ${agent}`
        : `ACR: ${planTask.title} failed (exit ${exitCode})`;
    fetch(`${process.env.L5_BASE_URL ?? "http://localhost:13001"}/api/agent:taskCallback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Non-expiring machine auth for unattended operation.
        ...(process.env.L5_SHARED_SECRET ? { "x-l5-shared-secret": process.env.L5_SHARED_SECRET } : {}),
        // Legacy JWT kept for backward compat (expires ~17h).
        ...(process.env.L5_ADMIN_TOKEN ? { Authorization: `Bearer ${process.env.L5_ADMIN_TOKEN}` } : {}),
      },
      body: JSON.stringify({
        l5_task_id: l5TaskId,
        phase: planTask.title,
        status: cbStatus,
        output_summary: cbSummary,
        diff_summary: diffSummary,
        log_tail: logTail,
        exit_code: exitCode,
        // Phase 17: file-change counts for the L5 verifier's orphan detection.
        changed_files: changedFilesAtCompletion.length,
        modified_existing_files: modifiedExistingCount,
        branch: branchName,
        // Phase 2: merge outcome
        merged: mergeInfo?.action === "merged",
        merge_action: mergeInfo?.action,
        merge_target: mergeInfo?.base,
        pr_url: mergeInfo?.prUrl,
      }),
      signal: AbortSignal.timeout(4000),
    }).catch(() => {}); // non-blocking, L5 서버 없어도 ACR 실행에 영향 없음
  }

  if (boundaryViolation) {
    emit("[REVIEW_BLOCKED] File boundary violation detected. This run is not a clean success.", "system");
    emit(`[REVIEW_BLOCKED] Forbidden files touched: ${boundaryCheck.forbiddenFiles.join(", ")}`, "system");
    emit(`[REVIEW_BLOCKED] Why it matters: ${boundaryCheck.reason}`, "system");
    emit(`[REVIEW_BLOCKED] What to do next: ${boundaryCheck.nextAction}`, "system");
  }
  if (emptyOutput) {
    emit(`[REVIEW_BLOCKED] Agent finished with exit 0 but produced no file changes (empty branch) after ${verify.attempts} attempt(s). Flagged for review.`, "system");
  }

  // Telegram 알림 (비동기, non-blocking). 사람이 읽기 쉬운 형식:
  //   <기능명>\n<phase> <상태> · <agent>
  // 기능명 = plan 제목에서 "[L5]" 접두/괄호설명 제거.
  const notifyStatus = boundaryViolation ? "drift" : emptyOutput ? "failure" : exitCode === 0 ? "success" : "failure";
  const feature = String(plan.title || planTask.title || "작업")
    .replace(/^\[L5\]\s*/i, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim();
  const phaseLabel = String(planTask.title || "").trim() || "phase";
  const agentLabel = { "claude-code": "Claude", codex: "Codex", antigravity: "Antigravity" }[agent] || agent;
  const notifySummary = boundaryViolation
    ? `*${feature}*\n${phaseLabel} ⚠️ 경계 위반 (${boundaryCheck.forbiddenFiles.slice(0, 2).join(", ")})`
    : emptyOutput
      ? `*${feature}*\n${phaseLabel} — 변경 없음(검토 필요)`
      : exitCode === 0
        ? `*${feature}*\n${phaseLabel} 완료 · ${agentLabel}`
        : `*${feature}*\n${phaseLabel} 실패 (exit ${exitCode}) · ${agentLabel}`;
  // Per-phase Telegram is OFF by default (set ACR_PHASE_NOTIFY=1 to re-enable).
  // For the CMO run the cmo-driver sends consolidated notifications (failure +
  // feature/plan completion + final, with progress %) instead of one-per-phase spam.
  if (process.env.ACR_PHASE_NOTIFY === "1") {
    notifyExecutionResult(taskId, notifyStatus, notifySummary).catch(() => {});
  }

  // Phase D: SubagentPerformance auto-record (비동기, non-blocking)
  try {
    const recordId = crypto.randomUUID();
    const executionStartedAt = new Date(executionLog.startedAt).getTime();
    const executionEndedAt = new Date().getTime();
    const durationMs = executionEndedAt - executionStartedAt;

    const performanceStatus: "success" | "failure" | "partial" = boundaryViolation
      ? "partial"
      : emptyOutput
        ? "failure"
        : exitCode === 0
          ? "success"
          : "failure";

    const performanceRecord: Parameters<typeof writeSubagentPerformanceRecord>[0] = {
      id: recordId,
      subagentId: agent,
      parentAgent: agent as "claude-code" | "codex" | "antigravity",
      taskId,
      workspaceId: workspace.id,
      executedAt: executionLog.startedAt,
      durationMs,
      status: performanceStatus,
      qualityScore: exitCode === 0 && !boundaryViolation && !emptyOutput ? 100 : boundaryViolation ? 50 : 0,
      changedFiles: changedFilesAtCompletion,
      drift: boundaryViolation,
      scopeCreep: boundaryViolation,
      summary: `${agent} executed task "${planTask.title}". Status: ${performanceStatus}. Exit code: ${exitCode}. Duration: ${durationMs}ms.`,
      errorMessage: exitCode !== 0 || boundaryViolation || emptyOutput ? `Exit code: ${exitCode}. Boundary violation: ${boundaryViolation}. Empty output: ${emptyOutput}.` : undefined,
      recommendReuse: exitCode === 0 && !boundaryViolation && !emptyOutput,
      recommendRetire: false,
    };

    await writeSubagentPerformanceRecord(performanceRecord);
  } catch (error) {
    // Log but don't fail execution
    emit(`[WARNING] Failed to record subagent performance: ${error instanceof Error ? error.message : String(error)}`, "system");
  }

  emit(`[DONE] Exit code: ${exitCode}`, "system");
  return { exitCode };
}
