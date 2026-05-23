/**
 * Handoff Engine
 *
 * Implements automatic fallback planning when primary agent/model is unavailable.
 * Supports:
 * - Codex rate limit → Claude fallback or waiting_for_recovery
 * - Antigravity model mismatch → attempt auto-switch or fallback
 * - Claude overload → use fallback-model or handoff
 * - All unavailable → waiting_for_recovery with Hermes insight
 */

import type {
  AgentModelRoutingDecision,
  TaskKind,
} from "./agent-model-router";
import { routeAgentAndModel } from "./agent-model-router";
import type { AgentRuntimeProfile } from "./runtime-registry";
import { getAgentRuntime, isAgentAvailable } from "./runtime-registry";

export type HandoffScenario =
  | "codex_rate_limited"
  | "antigravity_model_mismatch"
  | "claude_overloaded"
  | "all_unavailable"
  | "none";

export type HandoffPlan = {
  scenario: HandoffScenario;
  primaryAgent: AgentRuntimeProfile["id"];
  primaryModel?: string;
  fallbackAgent: AgentRuntimeProfile["id"] | null;
  fallbackModel?: string;
  reason: string;
  shouldWaitForRecovery: boolean;
  recoveryInfo?: {
    taskId: string;
    agentId: AgentRuntimeProfile["id"];
    nextRetryAt: string;
    reason: string;
  };
};

/**
 * Analyze current situation and determine handoff plan
 */
export function analyzeHandoffNeed(
  taskKind: TaskKind,
  currentDecision: AgentModelRoutingDecision,
  isUrgent: boolean = false
): HandoffPlan {
  const primaryAgent = currentDecision.recommendedAgentId;
  const primaryModel = currentDecision.recommendedModelId;
  const fallbackAgent = currentDecision.fallbackAgentId;
  const fallbackModel = currentDecision.fallbackModelId;

  // Check primary agent status directly, not just the decision
  const primaryAgentProfile = getAgentRuntime(primaryAgent);

  // Check for Codex rate limit scenario
  if (primaryAgent === "codex" || (primaryAgentProfile && primaryAgentProfile.status.includes("rate_limited"))) {
    if (isUrgent) {
      // Fallback to Claude for urgent QA tasks
      return {
        scenario: "codex_rate_limited",
        primaryAgent,
        primaryModel,
        fallbackAgent: "claude-code",
        fallbackModel: "claude-sonnet-4-6",
        reason:
          "Codex rate-limited; falling back to Claude Code Sonnet for urgent task",
        shouldWaitForRecovery: false,
      };
    } else {
      // Wait for recovery
      const profile = getAgentRuntime(primaryAgent === "codex" ? "codex" : primaryAgent);
      return {
        scenario: "codex_rate_limited",
        primaryAgent,
        primaryModel,
        fallbackAgent: null,
        reason: "Agent rate-limited; waiting for recovery",
        shouldWaitForRecovery: true,
        recoveryInfo: {
          taskId: `task-${Date.now()}`,
          agentId: primaryAgent,
          nextRetryAt: profile?.nextRetryAt || new Date(Date.now() + 3600000).toISOString(),
          reason: profile?.lastFailureReason || "Rate limit reached",
        },
      };
    }
  }

  // Check for Antigravity model mismatch
  if (primaryAgent === "antigravity") {
    if (currentDecision.requiresModelSwitch && currentDecision.modelSwitchStrategy === "handoff_instead") {
      return {
        scenario: "antigravity_model_mismatch",
        primaryAgent: "antigravity",
        primaryModel,
        fallbackAgent: "claude-code",
        fallbackModel: "claude-sonnet-4-6",
        reason:
          "Antigravity model switch not supported; falling back to Claude Code Sonnet",
        shouldWaitForRecovery: false,
      };
    }
  }

  // Check for Claude overload
  if (primaryAgent === "claude-code") {
    const claudeProfile = getAgentRuntime("claude-code");
    if (claudeProfile?.status === "rate_limited") {
      // Try to fall back to Antigravity if it's a UI task
      if (taskKind === "ui" || taskKind === "ux_copy") {
        return {
          scenario: "claude_overloaded",
          primaryAgent: "claude-code",
          primaryModel,
          fallbackAgent: "antigravity",
          fallbackModel: "gemini-3.5-flash-high",
          reason:
            "Claude overloaded; falling back to Antigravity for UI task",
          shouldWaitForRecovery: false,
        };
      }

      // Otherwise wait for recovery
      return {
        scenario: "claude_overloaded",
        primaryAgent: "claude-code",
        primaryModel,
        fallbackAgent: null,
        reason: "Claude Code overloaded; waiting for recovery",
        shouldWaitForRecovery: true,
        recoveryInfo: {
          taskId: `task-${Date.now()}`,
          agentId: "claude-code",
          nextRetryAt: claudeProfile.nextRetryAt || new Date(Date.now() + 300000).toISOString(),
          reason: claudeProfile.lastFailureReason || "Rate limit or overload",
        },
      };
    }
  }

  // Check if all agents unavailable
  if (!fallbackAgent && currentDecision.executionMode === "waiting_for_recovery") {
    return {
      scenario: "all_unavailable",
      primaryAgent,
      primaryModel,
      fallbackAgent: null,
      reason:
        "No suitable agent available; all agents unavailable or rate-limited",
      shouldWaitForRecovery: true,
      recoveryInfo: {
        taskId: `task-${Date.now()}`,
        agentId: primaryAgent,
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
        reason: "Waiting for agent recovery",
      },
    };
  }

  // No handoff needed
  return {
    scenario: "none",
    primaryAgent,
    primaryModel,
    fallbackAgent: null,
    reason: "Primary agent available; no handoff needed",
    shouldWaitForRecovery: false,
  };
}

/**
 * Execute handoff to fallback agent
 */
export function executeHandoff(
  plan: HandoffPlan,
  originalTaskKind: TaskKind
): {
  newDecision: AgentModelRoutingDecision;
  handoffReason: string;
} {
  if (plan.fallbackAgent) {
    // Route with fallback agent
    const newDecision = routeAgentAndModel(originalTaskKind);

    return {
      newDecision,
      handoffReason: plan.reason,
    };
  }

  // Return original decision (no fallback)
  return {
    newDecision: {
      taskKind: originalTaskKind,
      recommendedAgentId: plan.primaryAgent,
      recommendedModelId: plan.primaryModel,
      reason: plan.reason,
      canAutoRun: false,
      requiresApproval: true,
      requiresModelSwitch: false,
      executionMode: "waiting_for_recovery",
      riskNotes: ["Waiting for agent recovery before retry"],
    },
    handoffReason: plan.reason,
  };
}

/**
 * Build user-facing handoff message
 */
export function buildHandoffMessage(plan: HandoffPlan): string {
  switch (plan.scenario) {
    case "codex_rate_limited":
      if (plan.fallbackAgent) {
        return `Codex가 사용량 제한되어 ${plan.fallbackAgent}로 대체 실행합니다. (사용자 개입 불필요)`;
      } else {
        return `Codex가 사용량 제한되어 재개를 대기합니다. (${plan.recoveryInfo?.nextRetryAt ? `${new Date(plan.recoveryInfo.nextRetryAt).toLocaleString('ko-KR')} 이후 재시도` : '이후 재시도'})`;
      }

    case "antigravity_model_mismatch":
      return `Antigravity 모델 전환 자동화가 아직 지원되지 않아 Claude Code Sonnet으로 대체 실행합니다.`;

    case "claude_overloaded":
      if (plan.fallbackAgent) {
        return `Claude Code가 과부하 상태여서 ${plan.fallbackAgent}로 대체 실행합니다.`;
      } else {
        return `Claude Code가 과부하 상태여서 복구를 대기합니다.`;
      }

    case "all_unavailable":
      return `사용 가능한 에이전트가 없어 작업을 대기 중입니다. 복구 후 자동으로 재시도됩니다.`;

    default:
      return `작업이 준비되었습니다.`;
  }
}

/**
 * Check if a task should wait for recovery
 */
export function shouldWaitForRecovery(plan: HandoffPlan): boolean {
  return plan.shouldWaitForRecovery;
}

/**
 * Get recovery deadline
 */
export function getRecoveryDeadline(plan: HandoffPlan): Date | null {
  if (plan.recoveryInfo?.nextRetryAt) {
    return new Date(plan.recoveryInfo.nextRetryAt);
  }
  return null;
}
