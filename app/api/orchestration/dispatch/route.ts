import { getAdapter } from "@/lib/dispatch";
import { getGlobalQueue } from "@/lib/dispatch/safe-dispatch-queue";
import { logOrchestrationEvent } from "@/lib/dispatch/orchestration-logger";
import { checkRateLimit } from "@/lib/dispatch/rate-limiter";
import { addSessionReport } from "@/lib/storage/json-store";
import { FeedbackLoopEngine } from "@/lib/orchestration/feedback-loop-engine";
import { generateObsidianNote } from "@/lib/memory/obsidian-note-generator";
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

function canDispatch(job: DispatchJob): { ok: true } | { ok: false; status: number; error: string } {
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

  return { ok: true };
}

function readBooleanEnv(name: string): boolean | undefined {
  const value = process.env[name];
  if (value === undefined) return undefined;
  return !["false", "0", "no"].includes(value.toLowerCase());
}

function shouldUseMockDispatch(agentId: AgentType): boolean {
  const globalMock = readBooleanEnv("MOCK_DISPATCH");
  if (globalMock !== undefined) return globalMock;

  if (agentId === "codex") {
    return readBooleanEnv("CODEX_MOCK_MODE") ?? true;
  }

  return true;
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

    const gate = canDispatch(job);
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
      detail: mockMode ? "mock" : "real",
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

      // Auto-handle redispatch for minor_fix + low risk
      if (feedbackOutput.decision === "redispatch" && feedbackOutput.nextDispatchJob) {
        try {
          // Auto-dispatch the retry job
          const redispatchResult = await getAdapter(feedbackOutput.nextDispatchJob.agentId, true).dispatch(
            feedbackOutput.nextDispatchJob,
          );
          console.log(`[dispatch] Auto-redispatched job for retry: ${feedbackOutput.nextDispatchJob.id}`);

          // Recursively process the redispatch result (could create infinite loop, but limited by maxRetries)
          // For now, just log it
          logOrchestrationEvent({
            event: "job_completed",
            jobId: feedbackOutput.nextDispatchJob.id,
            agentId: feedbackOutput.nextDispatchJob.agentId,
            riskLevel: feedbackOutput.nextDispatchJob.riskLevel,
            timestamp: new Date().toISOString(),
            detail: "auto_redispatched",
          });
        } catch (redispatchError) {
          console.warn("[dispatch] Failed to auto-redispatch:", redispatchError);
        }
      }
    } catch (feedbackError) {
      console.warn("[dispatch] Feedback loop processing failed:", feedbackError);
      // Don't fail the dispatch if feedback processing fails
    }

    return Response.json({ success: true, result });
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
