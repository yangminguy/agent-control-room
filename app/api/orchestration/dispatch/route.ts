import { getAdapter } from "@/lib/dispatch";
import { logOrchestrationEvent } from "@/lib/dispatch/orchestration-logger";
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

export async function POST(req: Request) {
  try {
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

    const mockMode = process.env.MOCK_DISPATCH !== "false";

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
