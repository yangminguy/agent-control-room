import fs from "fs";
import path from "path";
import type { OrchestrationLogEvent, OrchestrationMetrics, AgentMetricBreakdown } from "@/lib/types";

export const runtime = "nodejs";

const LOG_FILE = process.env.ORCHESTRATION_LOG_PATH
  ? path.resolve(process.cwd(), process.env.ORCHESTRATION_LOG_PATH)
  : path.resolve(process.cwd(), "data/orchestration-logs.ndjson");

const EMPTY_METRICS: OrchestrationMetrics = {
  totalJobs: 0,
  successCount: 0,
  failedCount: 0,
  skippedCount: 0,
  retryCount: 0,
  timeoutCount: 0,
  avgDurationMs: null,
  perAgent: [],
  computedAt: new Date().toISOString(),
};

export async function GET() {
  if (!fs.existsSync(LOG_FILE)) {
    return Response.json({ metrics: { ...EMPTY_METRICS, computedAt: new Date().toISOString() } });
  }

  let events: OrchestrationLogEvent[] = [];
  try {
    const raw = fs.readFileSync(LOG_FILE, "utf8");
    events = raw
      .split("\n")
      .filter((line) => line.trim().length > 0)
      .flatMap((line) => {
        try {
          return [JSON.parse(line) as OrchestrationLogEvent];
        } catch {
          return [];
        }
      });
  } catch {
    return Response.json({ metrics: { ...EMPTY_METRICS, computedAt: new Date().toISOString() } });
  }

  // Group events by jobId
  const byJob = new Map<string, OrchestrationLogEvent[]>();
  for (const event of events) {
    const list = byJob.get(event.jobId) ?? [];
    list.push(event);
    byJob.set(event.jobId, list);
  }

  let successCount = 0;
  let failedCount = 0;
  let skippedCount = 0;
  let retryCount = 0;
  let timeoutCount = 0;
  const durations: number[] = [];

  // Per-agent accumulator
  const agentMap = new Map<
    string,
    { totalJobs: number; successCount: number; failedCount: number; durations: number[] }
  >();

  for (const [, jobEvents] of byJob) {
    const agentId =
      jobEvents.find((e) => e.agentId)?.agentId ?? "unknown";

    const agent = agentMap.get(agentId) ?? {
      totalJobs: 0,
      successCount: 0,
      failedCount: 0,
      durations: [],
    };
    agent.totalJobs++;

    let isSuccess = false;
    let isFailed = false;

    for (const e of jobEvents) {
      if (e.event === "result_collected") {
        if (e.detail === "pass") {
          successCount++;
          isSuccess = true;
        } else {
          failedCount++;
          isFailed = true;
        }
      }
      if (e.event === "status_changed" && e.detail?.includes("skipped_due_to_risk")) {
        skippedCount++;
      }
      if (e.event === "approval_timeout") {
        timeoutCount++;
      }
      if (e.event === "feedback_generated") {
        retryCount++;
      }
    }

    if (isSuccess) agent.successCount++;
    if (isFailed) agent.failedCount++;

    // Pair job_dispatched with job_completed
    const dispatched = jobEvents.find((e) => e.event === "job_dispatched");
    const completed = jobEvents.find((e) => e.event === "job_completed");
    if (dispatched && completed) {
      const durationMs =
        new Date(completed.timestamp).getTime() - new Date(dispatched.timestamp).getTime();
      if (durationMs >= 0) {
        durations.push(durationMs);
        agent.durations.push(durationMs);
      }
    }

    agentMap.set(agentId, agent);
  }

  const totalJobs = byJob.size;
  const avgDurationMs =
    durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;

  const perAgent: AgentMetricBreakdown[] = Array.from(agentMap.entries()).map(([id, data]) => ({
    agentId: id,
    totalJobs: data.totalJobs,
    successCount: data.successCount,
    failedCount: data.failedCount,
    avgDurationMs:
      data.durations.length > 0
        ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
        : null,
  }));

  const metrics: OrchestrationMetrics = {
    totalJobs,
    successCount,
    failedCount,
    skippedCount,
    retryCount,
    timeoutCount,
    avgDurationMs,
    perAgent,
    computedAt: new Date().toISOString(),
  };

  return Response.json({ metrics });
}
