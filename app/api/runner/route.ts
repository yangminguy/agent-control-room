import { checkUncommittedChanges, createBranch, generateBranchName, validateCwdSafety } from "@/lib/runner/git-utils";
import { spawnAgent } from "@/lib/runner/spawn-runner";
import { addExecutionLog, updateExecutionLog } from "@/lib/storage/execution-log-store";
import { getFeaturePlanById, updatePlanTaskStatus } from "@/lib/storage/feature-plan-store";
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

    // Security: Validate cwd against path traversal
    const projectRoot = process.cwd();
    if (!validateCwdSafety(cwd, projectRoot)) {
      return new Response(
        textEncoder.encode(`data: ${JSON.stringify({ log: "[ERROR] Invalid working directory path. Path traversal detected or path is outside project scope.", type: "system" })}\n\n`),
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

          // spawnAgent 실행
          let logBuffer: string[] = [];

          await new Promise<void>((resolve, reject) => {
            // Phase E: ActionEnvelope — Dangerous command detection & gate (before execution)
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

              saveActionEnvelope(envelope).then(() => {
                controller.enqueue(encode(`[SAFETY] Dangerous command detected: ${dangerDetection.reason}`, "system"));
                controller.enqueue(encode(`[SAFETY] ActionEnvelope created: ${envelope.id}`, "system"));
                controller.enqueue(encode(`[SAFETY] Execution blocked pending approval. Please review and approve in Control Room.`, "system"));

                // Update execution log with boundary_violation status (using existing type)
                updateExecutionLog(executionLog.id, {
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
                }).finally(() => {
                  controller.close();
                  resolve();
                });
              }).catch((error) => {
                controller.enqueue(encode(`[ERROR] Failed to create ActionEnvelope: ${error instanceof Error ? error.message : String(error)}`, "system"));
                controller.close();
                reject(error);
              });
              return;
            }

            // Safe command execution
            spawnAgent({
              agent,
              prompt,
              cwd,
              onLog: (line: string) => {
                logBuffer.push(line);

                // stdout/stderr 타입 분류
                const type = line.startsWith("[stderr]") ? "stderr" : "stdout";
                const cleanedLine = line.startsWith("[stderr] ") ? line.slice("[stderr] ".length) : line;

                controller.enqueue(encode(cleanedLine, type));
              },
              onComplete: async (exitCode: number) => {
                try {
                  // MULTI-AGENT RUNTIME: Check for quota errors in output
                  const fullLog = logBuffer.join("\n");
                  const quotaError = parseQuotaError(fullLog);
                  if (quotaError) {
                    applyQuotaParseResult(quotaError);
                    controller.enqueue(encode(`[QUOTA] ${quotaError.reason}. Retry time: ${quotaError.nextRetryAt || "unknown"}`, "system"));
                  }

                  const promptBoundaries = extractFileBoundariesFromPrompt(planTask.generatedPrompt || prompt);
                  const boundaryCheck = checkFileBoundaries(collectChangedFiles(cwd), {
                    allowedFiles: planTask.allowedFiles ?? promptBoundaries.allowedFiles,
                    doNotTouchFiles: planTask.doNotTouchFiles ?? promptBoundaries.doNotTouchFiles,
                  });
                  const boundaryViolation = boundaryCheck.hasViolation;

                  // ExecutionLog 상태: boundary violations are review-blocked even with exitCode 0.
                  const executionStatus = boundaryViolation
                    ? "boundary_violation"
                    : exitCode === 0
                      ? "done"
                      : "failed";
                  // PlanTask 상태: boundary violations require human review, not clean success.
                  const planTaskStatus = boundaryViolation
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
                    const changedFiles = collectChangedFiles(cwd);
                    for (const filePath of changedFiles) {
                      await addChangedFile(workspace.id, filePath);
                    }
                  } catch (error) {
                    controller.enqueue(encode(`[WARNING] Failed to record changed files in workspace: ${error instanceof Error ? error.message : String(error)}`, "system"));
                  }

                  // Phase B: Workspace 상태 업데이트
                  const workspaceStatus = boundaryViolation
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

                  if (boundaryViolation) {
                    controller.enqueue(encode("[REVIEW_BLOCKED] File boundary violation detected. This run is not a clean success.", "system"));
                    controller.enqueue(encode(`[REVIEW_BLOCKED] Forbidden files touched: ${boundaryCheck.forbiddenFiles.join(", ")}`, "system"));
                    controller.enqueue(encode(`[REVIEW_BLOCKED] Why it matters: ${boundaryCheck.reason}`, "system"));
                    controller.enqueue(encode(`[REVIEW_BLOCKED] What to do next: ${boundaryCheck.nextAction}`, "system"));
                  }

                  // Telegram 알림 (비동기, non-blocking)
                  const notifyStatus = boundaryViolation ? "drift" : exitCode === 0 ? "success" : "failure";
                  const notifySummary = boundaryViolation
                    ? `File boundary violation: ${boundaryCheck.forbiddenFiles.join(", ")}`
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
                      : exitCode === 0
                        ? "success"
                        : "failure";

                    const changedFiles = collectChangedFiles(cwd);

                    const performanceRecord: Parameters<typeof writeSubagentPerformanceRecord>[0] = {
                      id: recordId,
                      subagentId: agent,
                      parentAgent: agent as "claude-code" | "codex" | "antigravity",
                      taskId,
                      workspaceId: workspace.id,
                      executedAt: executionLog.startedAt,
                      durationMs,
                      status: performanceStatus,
                      qualityScore: exitCode === 0 && !boundaryViolation ? 100 : boundaryViolation ? 50 : 0,
                      changedFiles,
                      drift: boundaryViolation,
                      scopeCreep: boundaryViolation,
                      summary: `${agent} executed task "${planTask.title}". Status: ${performanceStatus}. Exit code: ${exitCode}. Duration: ${durationMs}ms.`,
                      errorMessage: exitCode !== 0 || boundaryViolation ? `Exit code: ${exitCode}. Boundary violation: ${boundaryViolation}.` : undefined,
                      recommendReuse: exitCode === 0 && !boundaryViolation,
                      recommendRetire: false,
                    };

                    await writeSubagentPerformanceRecord(performanceRecord);
                  } catch (error) {
                    // Log but don't fail execution
                    controller.enqueue(encode(`[WARNING] Failed to record subagent performance: ${error instanceof Error ? error.message : String(error)}`, "system"));
                  }

                  controller.enqueue(encode(`[DONE] Exit code: ${exitCode}`, "system"));
                  controller.close();
                  resolve();
                } catch (error) {
                  const msg = error instanceof Error ? error.message : String(error);
                  controller.enqueue(encode(`[ERROR] ${msg}`, "system"));
                  controller.close();
                  reject(error);
                }
              },
            }).catch((error) => {
              controller.enqueue(encode(`[ERROR] spawn failed: ${error instanceof Error ? error.message : String(error)}`, "system"));
              controller.close();
              reject(error);
            });
          });
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
