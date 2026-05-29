import { checkUncommittedChanges, createBranch, generateBranchName, validateCwdSafety, getDiffSummary, getLogTail, commitAll } from "@/lib/runner/git-utils";
import { runAgentWithVerification, promptExpectsFileChanges } from "@/lib/runner/spawn-with-verification";
import { coordinateMerge, type MergeCoordinationResult } from "@/lib/runner/merge-coordinator";
import { addExecutionLog, updateExecutionLog } from "@/lib/storage/execution-log-store";
import { getFeaturePlanById, updatePlanTaskStatus } from "@/lib/storage/feature-plan-store";
import { listCTOTaskMetadataByPlan } from "@/lib/storage/cto-task-metadata-store";
import { getProjects } from "@/lib/storage/json-store";
import { validateAndConsumeApprovalToken } from "@/lib/orchestration/approval-token-store";
import {
  checkFileBoundaries,
  collectChangedFiles,
  extractFileBoundariesFromPrompt,
} from "@/lib/runner/file-boundary";
import { getAgentRuntime } from "@/lib/agents/runtime-registry";
import { parseQuotaError, applyQuotaParseResult } from "@/lib/agents/quota-parser";
import { updateRuntimeDecisionStatus } from "@/lib/storage/runtime-decision-store";
import { notifyExecutionResult } from "@/lib/monitor/hermes-packet-notifier";
import { updateWorkspaceStatus, addChangedFile } from "@/lib/workspace/workspace-store";
import { resolveWorkspace } from "@/lib/workspace/workspace-resolver";
import { detectDangerousCommand } from "@/lib/agents/dangerous-command-detector";
import { createActionEnvelope, verifyActionEnvelopeExecution } from "@/lib/agents/action-envelope";
import { saveActionEnvelope, getActionEnvelope } from "@/lib/agents/action-envelope-store";
import { writeSubagentPerformanceRecord } from "@/lib/storage/subagent-memory-store";
import crypto from "crypto";

/**
 * /api/runner — Internal Local Runner Endpoint
 *
 * IMPORTANT: This is NOT a paid external AI API endpoint.
 * This is an internal endpoint that runs LOCAL terminal commands.
 *
 * What it does:
 * 1. Validates server-issued approval token (5-min TTL, one-time use, context-bound)
 * 2. Validates project path safety (no path traversal, within project scope)
 * 3. Confirms uncomitted changes are stashed
 * 4. Creates isolated git branch
 * 5. Spawns LOCAL tool process (e.g. spawn("claude", ["-p", prompt], { cwd }))
 * 6. Captures stdout/stderr logs as SSE stream
 * 7. Returns logs and exit code to UI
 *
 * What it does NOT do:
 * - Call external OpenAI API
 * - Call external Anthropic API
 * - Deploy or push to git
 * - Auto-merge or create PRs
 * - Run DB migrations
 * - Call external paid AI APIs
 *
 * The user must already be authenticated into the local tool.
 * No external credentials are used in this flow.
 */

const SUPPORTED_RUNNER_AGENTS = new Set(["claude-code", "codex", "antigravity"]);

export async function POST(request: Request) {
  let responseStarted = false;
  const textEncoder = new TextEncoder();

  const encode = (log: string, type: "stdout" | "stderr" | "system") => {
    const json = JSON.stringify({ log, type });
    return textEncoder.encode(`data: ${json}\n\n`);
  };

  try {
    const body = await request.json() as {
      planId: string;
      taskId: string;
      prompt: string;
      cwd: string;
      agent: "claude-code" | "codex" | "antigravity";
      approvalToken?: string;
    };

    const { planId, taskId, prompt, cwd, agent, approvalToken } = body;

    // Validate server-issued approval token
    if (!approvalToken) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: "[ERROR] Execution requires approval token. Missing token.", type: "system" })}\n\n`),
        { status: 403, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // Validate token against execution context
    const tokenContext = validateAndConsumeApprovalToken(approvalToken, {
      planId,
      taskId,
      agent: agent as "claude-code" | "codex" | "antigravity",
      cwd,
    });

    if (!tokenContext) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: "[ERROR] Invalid, expired, or mismatched approval token. Request a new token from the workbench.", type: "system" })}\n\n`),
        { status: 403, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // Security: Validate cwd against path traversal.
    // Allowed roots: ACR process.cwd() (legacy in-tree runs) + every registered project.path
    // so L5 CTO dispatches targeting external repos succeed without disabling the guard.
    const acrRoot = process.cwd();
    const registeredProjects = await getProjects();
    const allowedRoots = [acrRoot, ...registeredProjects.map((p) => p.path).filter((p): p is string => typeof p === "string" && p.length > 0)];
    const cwdAllowed = allowedRoots.some((root) => validateCwdSafety(cwd, root));
    if (!cwdAllowed) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: "[ERROR] Invalid working directory path. cwd must be ACR root or a registered project path.", type: "system" })}\n\n`),
        { status: 403, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    if (!SUPPORTED_RUNNER_AGENTS.has(agent)) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] ${agent} CLI execution is not supported yet. Use the copy-ready prompt for manual execution.`, type: "system" })}\n\n`),
        { status: 400, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // MULTI-AGENT RUNTIME: Check agent quota status
    const agentProfile = getAgentRuntime(agent as "claude-code" | "codex" | "antigravity");
    if (agentProfile && (agentProfile.status === "rate_limited" || agentProfile.status === "token_exhausted")) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] Agent ${agent} is ${agentProfile.status}. ${agentProfile.lastFailureReason || "Not available for execution."} Retry time: ${agentProfile.nextRetryAt || "unknown"}`, type: "system" })}\n\n`),
        { status: 503, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // planTask 조회
    const plan = await getFeaturePlanById(planId);
    if (!plan) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] Plan not found: ${planId}`, type: "system" })}\n\n`),
        { status: 404, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    const planTask = plan.tasks.find((t) => t.id === taskId);
    if (!planTask) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] Task not found: ${taskId}`, type: "system" })}\n\n`),
        { status: 404, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // Phase B: Workspace 생성 또는 기존 workspace 조회
    let workspace;
    try {
      workspace = await resolveWorkspace(taskId, agent as "claude-code" | "codex" | "antigravity");
      await updateWorkspaceStatus(workspace.id, "running");
    } catch (error) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] Failed to resolve/update workspace: ${error instanceof Error ? error.message : String(error)}`, type: "system" })}\n\n`),
        { status: 500, headers: { "Content-Type": "text/event-stream" } }
      );
    }

    // SSE 스트림 생성
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          responseStarted = true;

          // 미커밋된 변경사항 확인
          const hasUncommitted = await checkUncommittedChanges(cwd);
          if (hasUncommitted) {
            controller.enqueue(encode(
              "[ERROR] Uncommitted changes detected. Commit, stash, or discard existing changes before running an agent so the analyzer can inspect only this execution.",
              "system",
            ));
            controller.close();
            return;
          }

          // 브랜치명 생성 및 생성
          const branchName = generateBranchName(taskId, planTask.title);
          controller.enqueue(encode(`[INFO] Creating branch: ${branchName}`, "system"));

          try {
            await createBranch(branchName, cwd);
            controller.enqueue(encode(`[INFO] Branch created: ${branchName}`, "system"));
          } catch (error) {
            controller.enqueue(encode(`[ERROR] Failed to create branch: ${error instanceof Error ? error.message : String(error)}`, "system"));
            controller.close();
            return;
          }

          // 태스크 상태를 running으로 업데이트
          try {
            await updatePlanTaskStatus(planId, taskId, "running");
          } catch (error) {
            controller.enqueue(encode(`[ERROR] Failed to update task status: ${error instanceof Error ? error.message : String(error)}`, "system"));
          }

          // ExecutionLog 생성
          const executionLog = await addExecutionLog({
            planTaskId: taskId,
            agent,
            branchName,
            startedAt: new Date().toISOString(),
            logLines: [],
            status: "running",
          });

          controller.enqueue(encode(`[INFO] Execution started. Log ID: ${executionLog.id}`, "system"));
          controller.enqueue(encode(`[INFO] Executing: ${agent} -p "..."`, "system"));
          controller.enqueue(encode("", "system")); // 빈 줄

          // Phase 1: dangerous-command gate (before execution)
          const logBuffer: string[] = [];
          const onLogLine = (line: string) => {
            logBuffer.push(line);
            const type = line.startsWith("[stderr]") ? "stderr" : "stdout";
            const cleanedLine = line.startsWith("[stderr] ") ? line.slice("[stderr] ".length) : line;
            controller.enqueue(encode(cleanedLine, type));
          };

          const dangerDetection = detectDangerousCommand(prompt);
          if (dangerDetection.isDangerous) {
            const actionType = dangerDetection.actionType || "destructive_git";
            const envelope = createActionEnvelope({
              taskId,
              actionType,
              command: prompt,
              changedFiles: [],
              riskLevel: "high",
              riskExplanation: dangerDetection.reason || "Dangerous operation detected",
              rollbackPlan: "Revert commit or manual intervention required",
              requiredChecks: ["code_review", "safety_validation"],
              expiresInMinutes: 30,
            });
            try {
              await saveActionEnvelope(envelope);
              controller.enqueue(encode(`[SAFETY] Dangerous command detected: ${dangerDetection.reason}`, "system"));
              controller.enqueue(encode(`[SAFETY] ActionEnvelope created: ${envelope.id}`, "system"));
              controller.enqueue(encode(`[SAFETY] Execution blocked pending approval. Please review and approve in Control Room.`, "system"));
              await updateExecutionLog(executionLog.id, {
                completedAt: new Date().toISOString(),
                exitCode: 403,
                logLines: [
                  `[SAFETY] Dangerous command detected: ${dangerDetection.reason}`,
                  `[SAFETY] ActionEnvelope: ${envelope.id}`,
                  `[SAFETY] Execution blocked. Approval required.`,
                ],
                status: "boundary_violation",
              }).catch((error) => {
                controller.enqueue(encode(`[WARNING] Failed to update execution log: ${error instanceof Error ? error.message : String(error)}`, "system"));
              });
            } catch (error) {
              controller.enqueue(encode(`[ERROR] Failed to create ActionEnvelope: ${error instanceof Error ? error.message : String(error)}`, "system"));
            }
            controller.close();
            return;
          }

          // Phase 1: run with timeout + retry + empty-output verification.
          const expectsChanges = promptExpectsFileChanges(planTask.generatedPrompt || prompt);
          const verify = await runAgentWithVerification({
            agent,
            prompt,
            cwd,
            expectsChanges,
            onLog: onLogLine,
          });
          const exitCode = verify.exitCode;
          const emptyOutput = verify.emptyOutput;

          // MULTI-AGENT RUNTIME: Check for quota errors in output
          const fullLog = logBuffer.join("\n");
          const quotaError = parseQuotaError(fullLog);
          if (quotaError) {
            applyQuotaParseResult(quotaError);
            controller.enqueue(encode(`[QUOTA] ${quotaError.reason}. Retry time: ${quotaError.nextRetryAt || "unknown"}`, "system"));
          }

          const promptBoundaries = extractFileBoundariesFromPrompt(planTask.generatedPrompt || prompt);
          const changedFilesAtCompletion = collectChangedFiles(cwd);
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
            controller.enqueue(encode(`[WARNING] Failed to record changed files in workspace: ${error instanceof Error ? error.message : String(error)}`, "system"));
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
            controller.enqueue(encode(`[WARNING] Failed to update workspace status: ${error instanceof Error ? error.message : String(error)}`, "system"));
          }

          // ExecutionLog 업데이트
          await updateExecutionLog(executionLog.id, {
            completedAt: new Date().toISOString(),
            exitCode,
            logLines: [...logBuffer, ...boundaryLogLines],
            status: executionStatus,
          });

          // 태스크 상태 업데이트
          try {
            await updatePlanTaskStatus(planId, taskId, planTaskStatus);
          } catch (error) {
            controller.enqueue(encode(`[ERROR] Failed to update task status: ${error instanceof Error ? error.message : String(error)}`, "system"));
          }

          // Commit a clean, successful phase so the next phase / merge starts from a
          // clean tree. Skip on failure, boundary violation, or empty output.
          if (exitCode === 0 && !boundaryViolation && !emptyOutput) {
            const committed = await commitAll(cwd, `ACR phase: ${planTask.title} [${branchName}]`);
            controller.enqueue(encode(committed ? `[COMMIT] Phase changes committed on ${branchName}` : "[COMMIT] No changes to commit", "system"));
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
              controller.enqueue(encode(`[MERGE] ${mergeInfo.action}: ${mergeInfo.detail}${mergeInfo.prUrl ? ` (${mergeInfo.prUrl})` : ""}`, "system"));
            } catch (error) {
              controller.enqueue(encode(`[WARNING] Merge coordination failed: ${error instanceof Error ? error.message : String(error)}`, "system"));
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
            controller.enqueue(encode("[REVIEW_BLOCKED] File boundary violation detected. This run is not a clean success.", "system"));
            controller.enqueue(encode(`[REVIEW_BLOCKED] Forbidden files touched: ${boundaryCheck.forbiddenFiles.join(", ")}`, "system"));
            controller.enqueue(encode(`[REVIEW_BLOCKED] Why it matters: ${boundaryCheck.reason}`, "system"));
            controller.enqueue(encode(`[REVIEW_BLOCKED] What to do next: ${boundaryCheck.nextAction}`, "system"));
          }
          if (emptyOutput) {
            controller.enqueue(encode(`[REVIEW_BLOCKED] Agent finished with exit 0 but produced no file changes (empty branch) after ${verify.attempts} attempt(s). Flagged for review.`, "system"));
          }

          // Telegram 알림 (비동기, non-blocking)
          const notifyStatus = boundaryViolation ? "drift" : emptyOutput ? "failure" : exitCode === 0 ? "success" : "failure";
          const notifySummary = boundaryViolation
            ? `File boundary violation: ${boundaryCheck.forbiddenFiles.join(", ")}`
            : emptyOutput
              ? `Task "${planTask.title}" produced no file changes (empty output)`
              : exitCode === 0
                ? `Task "${planTask.title}" completed by ${agent}`
                : `Task "${planTask.title}" failed (exit ${exitCode})`;
          notifyExecutionResult(taskId, notifyStatus, notifySummary).catch(() => {});

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
            controller.enqueue(encode(`[WARNING] Failed to record subagent performance: ${error instanceof Error ? error.message : String(error)}`, "system"));
          }

          controller.enqueue(encode(`[DONE] Exit code: ${exitCode}`, "system"));
          controller.close();
        } catch (error) {
          if (!responseStarted) {
            controller.enqueue(encode(
              `[ERROR] ${error instanceof Error ? error.message : String(error)}`,
              "system"
            ));
          }
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (error) {
    return new Response(
      textEncoder.encode(`data: ${JSON.stringify({ log: `[ERROR] ${error instanceof Error ? error.message : String(error)}`, type: "system" })}\n\n`),
      { status: 400, headers: { "Content-Type": "text/event-stream" } }
    );
  }
}
