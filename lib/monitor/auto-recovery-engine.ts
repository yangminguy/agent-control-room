import {
  readHermesPackets,
  getPacketsByTask,
} from "@/lib/storage/hermes-packet-store";
import type { MonitorPacket } from "./types";

export type RecoveryStrategy =
  | "retry"
  | "escalate"
  | "skip"
  | "manual_review";

export interface RecoveryAction {
  taskId: string;
  strategy: RecoveryStrategy;
  reason: string;
  recommendedAgent?: string;
  priority: "low" | "medium" | "high";
  estimatedRecoveryTime: number; // minutes
  retryCount: number;
  maxRetries: number;
}

export interface RecoveryPlan {
  totalFailures: number;
  recoveryActions: RecoveryAction[];
  estimatedTotalTime: number; // minutes
  readyForAutomation: RecoveryAction[];
  requiresApproval: RecoveryAction[];
}

/**
 * 실패한 패킷 분석 및 복구 계획 생성
 */
export function generateRecoveryPlan(): RecoveryPlan {
  const packets = readHermesPackets();
  const failurePackets = packets.filter(
    (p) => p.kind === "failure" || p.kind === "drift-detection"
  );

  const recoveryActions: RecoveryAction[] = [];
  let totalTime = 0;

  for (const packet of failurePackets) {
    const taskId = packet.content.metadata?.taskId as string | undefined;
    if (!taskId) continue;

    const action = analyzeFailureForRecovery(packet, taskId);
    if (action) {
      recoveryActions.push(action);
      totalTime += action.estimatedRecoveryTime;
    }
  }

  // 자동화 가능 vs 승인 필요 분류
  const readyForAutomation = recoveryActions.filter(
    (a) => a.strategy === "retry" && a.priority !== "high"
  );
  const requiresApproval = recoveryActions.filter(
    (a) => a.strategy !== "retry" || a.priority === "high"
  );

  return {
    totalFailures: failurePackets.length,
    recoveryActions,
    estimatedTotalTime: totalTime,
    readyForAutomation,
    requiresApproval,
  };
}

/**
 * 개별 실패 분석 및 복구 액션 결정
 */
function analyzeFailureForRecovery(
  packet: MonitorPacket,
  taskId: string
): RecoveryAction | null {
  const metadata = packet.content.metadata || {};
  const description = packet.description.toLowerCase();

  // 재시도 횟수 파악
  const taskPackets = getPacketsByTask(taskId);
  const retryCount = taskPackets.filter((p) => p.kind === "failure").length;
  const maxRetries = 3;

  // 실패 원인 분석
  let strategy: RecoveryStrategy = "manual_review";
  let estimatedTime = 15;
  let reason = "Unknown failure";
  let priority: "low" | "medium" | "high" = "medium";

  if (description.includes("timeout")) {
    strategy = retryCount < maxRetries ? "retry" : "escalate";
    estimatedTime = 10 + retryCount * 5;
    reason = "Timeout detected — retry with backoff";
    priority = "low";
  } else if (description.includes("dependency")) {
    strategy = "escalate";
    estimatedTime = 20;
    reason = "Dependency issue — requires manual intervention";
    priority = "high";
  } else if (description.includes("boundary") || description.includes("file")) {
    strategy = "manual_review";
    estimatedTime = 30;
    reason = "Boundary violation — review required";
    priority = "high";
  } else if (description.includes("network") || description.includes("api")) {
    strategy = retryCount < maxRetries ? "retry" : "escalate";
    estimatedTime = 15 + retryCount * 3;
    reason = "Network/API issue — retry with exponential backoff";
    priority = "medium";
  } else if (retryCount < maxRetries) {
    strategy = "retry";
    estimatedTime = 10 + retryCount * 5;
    reason = "Retry recommended";
    priority = "low";
  }

  return {
    taskId,
    strategy,
    reason,
    recommendedAgent: (metadata.recommendedAgent as string | undefined) || "claude-code",
    priority,
    estimatedRecoveryTime: estimatedTime,
    retryCount,
    maxRetries,
  };
}

/**
 * 복구 액션 실행 (dry-run 모드)
 */
export async function executeRecoveryAction(
  action: RecoveryAction,
  dryRun: boolean = true
): Promise<{ success: boolean; message: string }> {
  const baseMessage = `[${action.strategy.toUpperCase()}] Task ${action.taskId}: ${action.reason}`;

  if (dryRun) {
    return {
      success: true,
      message: `${baseMessage} (dry-run)`,
    };
  }

  // 실제 자동화는 orchestration dispatch를 통해 수행
  try {
    const response = await fetch("/api/orchestration/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        taskId: action.taskId,
        agent: action.recommendedAgent,
        isAutoRecovery: true,
        recoveryStrategy: action.strategy,
      }),
    });

    if (!response.ok) {
      throw new Error(`Dispatch failed: ${response.status}`);
    }

    return {
      success: true,
      message: `${baseMessage} — dispatched for execution`,
    };
  } catch (error) {
    return {
      success: false,
      message: `${baseMessage} — failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * 전체 복구 계획 실행
 */
export async function executeRecoveryPlan(
  plan: RecoveryPlan,
  options: { dryRun?: boolean; maxConcurrent?: number } = {}
): Promise<{
  executed: number;
  succeeded: number;
  failed: number;
  results: Array<{ action: RecoveryAction; result: { success: boolean; message: string } }>;
}> {
  const { dryRun = true, maxConcurrent = 2 } = options;
  const actions = options.dryRun ? plan.readyForAutomation : plan.recoveryActions;

  const results: Array<{ action: RecoveryAction; result: { success: boolean; message: string } }> = [];
  let succeeded = 0;
  let failed = 0;

  // 동시성 제한하며 실행
  for (let i = 0; i < actions.length; i += maxConcurrent) {
    const batch = actions.slice(i, i + maxConcurrent);
    const batchResults = await Promise.all(
      batch.map((action) => executeRecoveryAction(action, dryRun))
    );

    batch.forEach((action, idx) => {
      const result = batchResults[idx];
      results.push({ action, result });
      if (result.success) {
        succeeded++;
      } else {
        failed++;
      }
    });
  }

  return {
    executed: actions.length,
    succeeded,
    failed,
    results,
  };
}

/**
 * 복구 계획 요약
 */
export function summarizeRecoveryPlan(plan: RecoveryPlan): string {
  const autoCount = plan.readyForAutomation.length;
  const approvalCount = plan.requiresApproval.length;

  let summary = `*[Auto Recovery Plan]*\n\n`;
  summary += `📋 Total Failures: ${plan.totalFailures}\n`;
  summary += `🤖 Auto-Recoverable: ${autoCount}\n`;
  summary += `🔐 Requires Approval: ${approvalCount}\n`;
  summary += `⏱️ Est. Recovery Time: ${plan.estimatedTotalTime}min\n`;

  if (plan.readyForAutomation.length > 0) {
    summary += `\n*Ready for Automation:*\n`;
    plan.readyForAutomation.slice(0, 3).forEach((action) => {
      summary += `• ${action.taskId}: ${action.reason}\n`;
    });
  }

  if (plan.requiresApproval.length > 0) {
    summary += `\n*Requires Approval:*\n`;
    plan.requiresApproval.slice(0, 3).forEach((action) => {
      summary += `• ${action.taskId}: ${action.reason} (${action.priority})\n`;
    });
  }

  return summary;
}
