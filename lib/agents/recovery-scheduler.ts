/**
 * Recovery Scheduler
 *
 * Dry-run worker that:
 * - Reads waiting tasks
 * - Inspects agent/model status
 * - Checks nextRetryAt times
 * - Proposes resume/handoff
 * - Generates recovery reports
 * - Does NOT execute (dry-run only)
 */

import type { AgentRuntimeProfile } from "./runtime-registry";
import { getAllAgentRuntimes } from "./runtime-registry";
import { getAllModels, getModelsByQuotaStatus } from "./model-registry";

export type WaitingTask = {
  id: string;
  taskKind: string;
  primaryAgent: AgentRuntimeProfile["id"];
  primaryModel?: string;
  status: "waiting_for_recovery";
  createdAt: string;
  nextRetryAt: string;
  reason: string;
};

export type RecoveryProposal = {
  taskId: string;
  action: "retry" | "handoff" | "continue_waiting";
  reason: string;
  targetAgent: AgentRuntimeProfile["id"];
  targetModel?: string;
  estimatedReadyTime?: string;
};

export type RecoveryReport = {
  timestamp: string;
  totalWaitingTasks: number;
  readyToRetry: WaitingTask[];
  proposals: RecoveryProposal[];
  agentStatus: Array<{
    agentId: AgentRuntimeProfile["id"];
    status: string;
    nextRetryAt?: string;
  }>;
  modelStatus: Array<{
    modelId: string;
    quotaStatus: string;
    nextRefreshAt?: string;
  }>;
  summary: string;
};

/**
 * Check if a waiting task is ready to retry
 */
function isTaskReadyToRetry(task: WaitingTask): boolean {
  if (!task.nextRetryAt) return true;

  const nextRetryTime = new Date(task.nextRetryAt).getTime();
  const now = Date.now();

  return now >= nextRetryTime;
}

/**
 * Generate recovery proposals for waiting tasks
 */
export function generateRecoveryProposals(
  waitingTasks: WaitingTask[]
): RecoveryProposal[] {
  const proposals: RecoveryProposal[] = [];

  for (const task of waitingTasks) {
    if (isTaskReadyToRetry(task)) {
      proposals.push({
        taskId: task.id,
        action: "retry",
        reason: `Task ready for retry (was waiting for ${task.reason})`,
        targetAgent: task.primaryAgent,
        targetModel: task.primaryModel,
      });
    } else {
      const readyTime = new Date(task.nextRetryAt);
      proposals.push({
        taskId: task.id,
        action: "continue_waiting",
        reason: `Task will be ready at ${readyTime.toLocaleString('ko-KR')}`,
        targetAgent: task.primaryAgent,
        targetModel: task.primaryModel,
        estimatedReadyTime: task.nextRetryAt,
      });
    }
  }

  return proposals;
}

/**
 * Dry-run: Generate recovery report without execution
 */
export function generateRecoveryReport(
  waitingTasks: WaitingTask[]
): RecoveryReport {
  const readyTasks = waitingTasks.filter(isTaskReadyToRetry);
  const proposals = generateRecoveryProposals(waitingTasks);

  const agents = getAllAgentRuntimes();
  const models = getAllModels();

  const agentStatus = agents.map((agent) => ({
    agentId: agent.id,
    status: agent.status,
    nextRetryAt: agent.nextRetryAt,
  }));

  const rateLimitedModels = getModelsByQuotaStatus("rate_limited");
  const modelStatus = models.map((model) => ({
    modelId: model.id,
    quotaStatus: model.quotaStatus,
    nextRefreshAt: rateLimitedModels.find((m) => m.id === model.id)
      ?.nextRefreshAt,
  }));

  const summary =
    readyTasks.length > 0
      ? `${readyTasks.length}개 작업이 재개 준비 완료. ${waitingTasks.length - readyTasks.length}개는 계속 대기 중.`
      : `대기 중인 모든 작업이 재개 준비 미완료. (${waitingTasks.length}개 대기 중)`;

  return {
    timestamp: new Date().toISOString(),
    totalWaitingTasks: waitingTasks.length,
    readyToRetry: readyTasks,
    proposals,
    agentStatus,
    modelStatus,
    summary,
  };
}

/**
 * Format recovery report for display/logging
 */
export function formatRecoveryReport(report: RecoveryReport): string {
  let output = `\n=== Recovery Report ===\nTimestamp: ${report.timestamp}\n\n`;

  output += `Summary: ${report.summary}\n`;
  output += `Total Waiting Tasks: ${report.totalWaitingTasks}\n`;
  output += `Ready to Retry: ${report.readyToRetry.length}\n\n`;

  if (report.readyToRetry.length > 0) {
    output += "Tasks Ready for Retry:\n";
    for (const task of report.readyToRetry) {
      output += `  - [${task.id}] ${task.taskKind} (${task.primaryAgent})\n`;
    }
    output += "\n";
  }

  output += "Agent Status:\n";
  for (const agent of report.agentStatus) {
    output += `  - ${agent.agentId}: ${agent.status}`;
    if (agent.nextRetryAt) {
      output += ` (retry at ${new Date(agent.nextRetryAt).toLocaleString('ko-KR')})`;
    }
    output += "\n";
  }
  output += "\n";

  output += "Model Status (Rate Limited):\n";
  const rateLimited = report.modelStatus.filter(
    (m) => m.quotaStatus === "rate_limited"
  );
  if (rateLimited.length > 0) {
    for (const model of rateLimited) {
      output += `  - ${model.modelId}`;
      if (model.nextRefreshAt) {
        output += ` (refresh at ${new Date(model.nextRefreshAt).toLocaleString('ko-KR')})`;
      }
      output += "\n";
    }
  } else {
    output += "  (none)\n";
  }

  return output;
}

/**
 * Check if all agents are recovered
 */
export function areAllAgentsRecovered(): boolean {
  const agents = getAllAgentRuntimes();

  // Check if any critical agent is down
  const criticalAgents = ["claude-code", "codex"];
  const criticalDown = criticalAgents.some((agentId) => {
    const agent = agents.find((a) => a.id === agentId);
    return (
      agent &&
      (agent.status.includes("rate_limited") ||
        agent.status.includes("exhausted") ||
        agent.status.includes("not_"))
    );
  });

  return !criticalDown;
}

/**
 * Get estimated recovery time for a specific agent
 */
export function getEstimatedRecoveryTime(
  agentId: AgentRuntimeProfile["id"]
): Date | null {
  const agents = getAllAgentRuntimes();
  const agent = agents.find((a) => a.id === agentId);

  if (agent?.nextRetryAt) {
    return new Date(agent.nextRetryAt);
  }

  return null;
}

/**
 * Dry-run worker command
 * Usage: npm run agent:worker -- --dry
 * Returns recovery report without making changes
 */
export function dryRunWorker(waitingTasks: WaitingTask[]): {
  report: RecoveryReport;
  formatted: string;
} {
  const report = generateRecoveryReport(waitingTasks);
  const formatted = formatRecoveryReport(report);

  return {
    report,
    formatted,
  };
}
