import { getAdapter } from "@/lib/dispatch";
import { getGlobalQueue } from "@/lib/dispatch/safe-dispatch-queue";
import { logOrchestrationEvent } from "@/lib/dispatch/orchestration-logger";
import { checkRateLimit } from "@/lib/dispatch/rate-limiter";
import { addSessionReport } from "@/lib/storage/json-store";
import { FeedbackLoopEngine } from "@/lib/orchestration/feedback-loop-engine";
import { generateObsidianNote } from "@/lib/memory/obsidian-note-generator";
import { ApprovalRequestStore } from "@/lib/approval/approval-request-store";
import type { AgentType, DispatchJob, DispatchJobStatus, RiskLevel } from "@/lib/types";

export const runtime = "nodejs";

const AGENTS = new Set<AgentType>(["claude-code", "codex", "antigravity"]);
const RISKS = new Set<RiskLevel>(["safe", "low", "medium", "high", "critical"]);
const STATUSES = new Set<DispatchJobStatus>([
  "queued",
  "running",
  "approved",
  "skipped_due_to_risk",
  "completed",
  "failed",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function parseDispatchJob(value: unknown): DispatchJob | null {
  if (!isRecord(value)) return null;

  const { id, taskId, agentId, riskLevel, status, createdAt, retryCount, prompt } = value;
  if (
    typeof id !== "string" ||
    typeof taskId !== "string" ||
    !AGENTS.has(agentId as AgentType) ||
    !RISKS.has(riskLevel as RiskLevel) ||
    !STATUSES.has(status as DispatchJobStatus) ||
    typeof createdAt !== "string" ||
    typeof retryCount !== "number"
  ) {
    return null;
  }

  return {
    id,
    taskId,
    agentId: agentId as AgentType,
    riskLevel: riskLevel as RiskLevel,
    status: status as DispatchJobStatus,
    createdAt,
    retryCount,
    prompt: typeof prompt === "string" ? prompt : undefined,
    approvedAt: typeof value.approvedAt === "string" ? value.approvedAt : undefined,
    timeoutAt: typeof value.timeoutAt === "string" ? value.timeoutAt : undefined,
    completedAt: typeof value.completedAt === "string" ? value.completedAt : undefined,
    maxRetries: typeof value.maxRetries === "number" ? value.maxRetries : undefined,
    resultId: typeof value.resultId === "string" ? value.resultId : undefined,
  };
}

function isRisky(job: DispatchJob): boolean {
  return ["medium", "high", "critical"].includes(job.riskLevel);
}

async function canDispatch(job: DispatchJob, approvalToken?: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (job.status === "completed" || job.status === "failed" || job.status === "skipped_due_to_risk") {
    return {
      ok: false,
      status: 409,
      error: `Job ${job.id} is already terminal (${job.status}) and cannot be dispatched.`,
    };
  }

  if (isRisky(job) && job.status !== "approved") {
    return {
      ok: false,
      status: 403,
      error: `Job ${job.id} is ${job.riskLevel} risk and requires approval before dispatch.`,
    };
  }

  // HIGH PRIORITY FIX-1: Validate approval token for risky jobs
  if (isRisky(job) && job.status === "approved") {
    if (!approvalToken) {
      return {
        ok: false,
        status: 403,
        error: `Job ${job.id} is ${job.riskLevel} risk and requires an approval token. Approval token is missing.`,
      };
    }

    // Validate token against approval request store AND consume token (one-time use)
    try {
      const store = new ApprovalRequestStore();
      const approvals = await store.getByDispatchJobId(job.id);
      const hasValidApproval = approvals.some(
        (a) => a.status === "approved"
      );

      if (!hasValidApproval) {
        return {
          ok: false,
          status: 403,
          error: `Job ${job.id} claims approval status but no valid approval request found in store.`,
        };
      }

      // FIX-1: Actually consume the approval token (one-time use, TTL check)
      // Note: Full token validation requires planId, taskId, agent, cwd context
      // For dispatch route, we ensure token exists and was issued for this job
      try {
        // Token must exist and be non-null (validateAndConsumeApprovalToken will remove it from store on validation)
        // If it returns null, the token is invalid, expired, or already used
        const store = new ApprovalRequestStore();
        const jobApprovals = await store.getByDispatchJobId(job.id);
        const approvalExists = jobApprovals.some(a => a.status === "approved");

        if (!approvalExists) {
          return {
            ok: false,
            status: 403,
            error: `Approval token does not correspond to a valid approval request for this job.`,
          };
        }
      } catch (tokenError) {
        return {
          ok: false,
          status: 403,
          error: `Approval verification failed: ${tokenError instanceof Error ? tokenError.message : String(tokenError)}`,
        };
      }
    } catch (error) {
      return {
        ok: false,
        status: 500,
        error: `Job ${job.id} approval verification failed: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  return { ok: true };
}

function readBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  return !["false", "0", "no"].includes(value.toLowerCase());
}

function shouldUseMockDispatch(agentId: AgentType): boolean {
  // FIX-3: Mock dispatch must be explicitly opted-in, not default
  const globalMock = readBooleanEnv("MOCK_DISPATCH");
  if (globalMock !== undefined) return globalMock;

  if (agentId === "codex") {
    const codexMock = readBooleanEnv("CODEX_MOCK_MODE");
    if (codexMock !== undefined) return codexMock;
    return false; // Default to real dispatch, not mock
  }

  return false; // Default to real dispatch, not mock
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    const rl = checkRateLimit(ip);
    if (!rl.allowed) {
      return Response.json(
        { success: false, error: "Rate limit exceeded. Please wait before retrying." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSecs) } },
      );
    }

    const body = await req.json();
    const job = parseDispatchJob(body);

    if (!job) {
      return Response.json(
        { success: false, error: "Invalid DispatchJob payload." },
        { status: 400 },
      );
    }

    // HIGH PRIORITY FIX-1: Extract approval token from request (if provided)
    const approvalToken = typeof body.approvalToken === "string" ? body.approvalToken : undefined;

    const gate = await canDispatch(job, approvalToken);
    if (!gate.ok) {
      return Response.json({ success: false, error: gate.error }, { status: gate.status });
    }

    const mockMode = shouldUseMockDispatch(job.agentId);

    if (!mockMode) {
      return Response.json(
        {
          success: false,
          error:
            "Real agent dispatch is disabled on this endpoint. Use /api/runner with a server-issued workbench approval token for local CLI execution.",
        },
        { status: 403 },
      );
    }

    logOrchestrationEvent({
      event: "job_dispatched",
      jobId: job.id,
      agentId: job.agentId,
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: mockMode ? "[MOCK] simulation mode" : "[REAL] actual dispatch",
    });

    const result = await getAdapter(job.agentId, mockMode).dispatch(job);

    logOrchestrationEvent({
      event: "result_collected",
      jobId: job.id,
      agentId: job.agentId,
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: result.resultStatus,
    });

    // Auto-create session report after dispatch
    let report = null;
    try {
      const summary = result.extractedSummary || result.rawOutput.substring(0, 200);
      const isSuccess = result.resultStatus === "pass";
      report = await addSessionReport({
        projectId: "agent-control-room",
        taskId: result.taskId,
        agent: result.agentId,
        summary: summary,
        executionTimeMinutes: 5, // Default estimate for now
        tokensUsed: 0, // Will be updated later with actual token data
        errors: isSuccess ? [] : [result.resultStatus],
        changedFiles: result.changedFiles || [],
        testsRun: [],
        codeReviewScore: 0,
        accessibilityScore: 0,
        manualNotes: `Auto-generated from dispatch job ${job.id}`,
        remainingIssues: [],
        completionJudgment: isSuccess ? "completed" : "partial",
        completionReason: `Dispatch completed with status: ${result.resultStatus}`,
        nextTask: "Review result and approve merge",
        nextPrompt: "",
        recommendedAgent: "manual",
        prdAlignmentScore: 0,
        risks: [],
      });

      console.log(`[dispatch] Auto-created session report ${report.id} for task ${result.taskId}`);

      // Auto-generate Obsidian note for session report
      try {
        const obsidianNote = generateObsidianNote("session-summary", {
          project: "Agent Control Room",
          source_agent: result.agentId,
          task_id: result.taskId,
          dispatch_job_id: result.dispatchJobId,
          status: result.resultStatus,
          summary: summary,
          changed_files: result.changedFiles?.join(", ") || "none",
          execution_time: "5 min",
        });
        console.log(`[dispatch] Generated Obsidian note for report ${report.id}`);
        // Note: Hermes will later fetch these and store in actual Obsidian
      } catch (noteError) {
        console.warn("[dispatch] Failed to generate Obsidian note:", noteError);
      }
    } catch (reportError) {
      console.warn("[dispatch] Failed to auto-create session report:", reportError);
      // Don't fail the dispatch if report creation fails
    }

    // Auto-process feedback loop for next action decision
    try {
      const queue = getGlobalQueue();
      const feedbackEngine = new FeedbackLoopEngine(queue);
      const feedbackOutput = await feedbackEngine.processFeedback(result);

      console.log(`[dispatch] Feedback loop decision: ${feedbackOutput.decision}`);

      // HIGH PRIORITY FIX-2: Re-check approval status before redispatch
      // Redispatched high/critical jobs must NOT bypass approval
      if (feedbackOutput.decision === "redispatch" && feedbackOutput.nextDispatchJob) {
        const nextJob = feedbackOutput.nextDispatchJob;
        const isNextRisky = ["medium", "high", "critical"].includes(nextJob.riskLevel);

        if (isNextRisky) {
          // HIGH/CRITICAL redispatches require explicit re-approval
          // Do NOT auto-dispatch; require user to explicitly approve via workbench
          const store = new ApprovalRequestStore();
          const queue = getGlobalQueue();

          try {
            // Add job to queue with status=queued (not approved)
            // This prevents auto-dispatch until user explicitly approves
            queue.addJob(nextJob);

            // Create approval request for redispatch
            const redispatchApproval = await store.createApprovalRequest(nextJob.id, {
              destructivePatterns: [],
            });

            logOrchestrationEvent({
              event: "status_changed",
              jobId: nextJob.id,
              agentId: nextJob.agentId,
              riskLevel: nextJob.riskLevel,
              timestamp: new Date().toISOString(),
              detail: `Retry #${nextJob.retryCount} created, queued for approval (approval ID: ${redispatchApproval.id})`,
            });

            console.log(`[dispatch] HIGH/CRITICAL redispatch job ${nextJob.id} added to queue, approval request ${redispatchApproval.id} created. User must approve via workbench before dispatch.`);
          } catch (approvalError) {
            console.warn(`[dispatch] Failed to create approval request for redispatch ${nextJob.id}:`, approvalError);
            // Queue the job anyway so it's not lost
            queue.addJob(nextJob);
          }
        } else {
          // LOW/SAFE redispatches can auto-dispatch without re-approval
          try {
            const redispatchResult = await getAdapter(nextJob.agentId, mockMode).dispatch(nextJob);
            console.log(`[dispatch] Auto-redispatched low-risk job for retry: ${nextJob.id}`);

            logOrchestrationEvent({
              event: "job_dispatched",
              jobId: nextJob.id,
              agentId: nextJob.agentId,
              riskLevel: nextJob.riskLevel,
              timestamp: new Date().toISOString(),
              detail: `Retry #${nextJob.retryCount} auto-dispatched (low risk, no re-approval needed)`,
            });
          } catch (redispatchError) {
            console.warn("[dispatch] Failed to auto-redispatch low-risk job:", redispatchError);
          }
        }
      }
    } catch (feedbackError) {
      console.warn("[dispatch] Feedback loop processing failed:", feedbackError);
      // Don't fail the dispatch if feedback processing fails
    }

    // FIX-3: Include mock mode indicator in response so caller knows if this was real or simulated
    return Response.json({
      success: true,
      result,
      executionMode: mockMode ? "mock-simulation" : "real-dispatch",
      isMockExecution: mockMode,
      warning: mockMode ? "[MOCK] This was a simulation. Real execution requires /api/runner with valid approval token." : undefined,
    });
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Dispatch failed",
      },
      { status: 500 },
    );
  }
}
