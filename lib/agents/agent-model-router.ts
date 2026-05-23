/**
 * Agent × Model Router
 *
 * Makes intelligent routing decisions based on:
 * - Task kind
 * - Agent availability and status
 * - Model quota and capability
 * - Risk level
 *
 * Implements fallback logic: primary agent/model → secondary → waiting_for_recovery
 */

import type {
  AgentRuntimeProfile,
  AgentRuntimeStatus,
  AutoRunScope,
} from "./runtime-registry";
import type { ModelProfile, ModelQuotaStatus } from "./model-registry";
import {
  getAgentRuntime,
  isAgentAvailable,
  getAllAgentRuntimes,
  canAgentAutoRun,
} from "./runtime-registry";
import {
  getModelsForAgent,
  getModel,
  getModelsForTaskKind,
  getModelsByQuotaStatus,
} from "./model-registry";

export type TaskKind =
  | "implementation"
  | "qa"
  | "test"
  | "code_review"
  | "ui"
  | "ux_copy"
  | "architecture"
  | "security"
  | "release"
  | "database"
  | "deployment"
  | "documentation"
  | "monitoring"
  | "unknown";

export type ExecutionMode =
  | "auto"
  | "manual_confirm"
  | "release_gate"
  | "waiting_for_recovery"
  | "blocked";

export type ModelSwitchStrategy =
  | "cli_flag"
  | "antigravity_slash_command"
  | "antigravity_app_state"
  | "handoff_instead"
  | "none";

export type AgentModelRoutingDecision = {
  taskKind: TaskKind;
  recommendedAgentId: AgentRuntimeProfile["id"];
  recommendedModelId?: string;
  fallbackAgentId?: AgentRuntimeProfile["id"];
  fallbackModelId?: string;
  reason: string;
  canAutoRun: boolean;
  requiresApproval: boolean;
  requiresModelSwitch: boolean;
  modelSwitchStrategy?: ModelSwitchStrategy;
  executionMode: ExecutionMode;
  riskNotes: string[];
};

/**
 * Get preferred auto-run scope for a task kind
 */
function getAutoRunScopeForTask(taskKind: TaskKind): AutoRunScope | null {
  const scopeMap: Record<TaskKind, AutoRunScope | null> = {
    implementation: "safe_code",
    qa: "qa",
    test: "qa",
    code_review: "review",
    ui: "ui_only",
    ux_copy: "ui_only",
    architecture: "safe_code",
    security: null,
    release: "release_gate_only",
    database: null,
    deployment: "release_gate_only",
    documentation: "safe_code",
    monitoring: "supervisor",
    unknown: null,
  };
  return scopeMap[taskKind];
}

/**
 * Get preferred agent for a task kind
 */
function getPreferredAgentForTask(
  taskKind: TaskKind
): AgentRuntimeProfile["id"][] {
  const agentPreferences: Record<TaskKind, AgentRuntimeProfile["id"][]> = {
    implementation: ["claude-code"],
    qa: ["codex"],
    test: ["codex"],
    code_review: ["codex"],
    ui: ["antigravity"],
    ux_copy: ["antigravity"],
    architecture: ["claude-code"],
    security: ["claude-code"],
    release: ["claude-code"],
    database: ["claude-code"],
    deployment: ["claude-code"],
    documentation: ["claude-code"],
    monitoring: ["hermes"],
    unknown: ["claude-code"],
  };
  return agentPreferences[taskKind];
}

/**
 * Get preferred models for an agent and task kind
 */
function getPreferredModelsForTask(
  agentId: AgentRuntimeProfile["id"],
  taskKind: TaskKind
): string[] {
  const modelPreferences: Record<
    AgentRuntimeProfile["id"],
    Record<TaskKind, string[]>
  > = {
    "claude-code": {
      implementation: ["claude-sonnet-4-6"],
      qa: [],
      test: [],
      code_review: [],
      ui: [],
      ux_copy: [],
      architecture: ["claude-opus-4-7"],
      security: ["claude-opus-4-7"],
      release: ["claude-opus-4-7"],
      database: ["claude-sonnet-4-6"],
      deployment: ["claude-opus-4-7"],
      documentation: ["claude-haiku-4-5"],
      monitoring: [],
      unknown: ["claude-sonnet-4-6"],
    },
    codex: {
      implementation: [],
      qa: ["gpt-5.5"],
      test: ["gpt-5.5"],
      code_review: ["gpt-5.5"],
      ui: [],
      ux_copy: [],
      architecture: [],
      security: [],
      release: [],
      database: [],
      deployment: [],
      documentation: [],
      monitoring: [],
      unknown: [],
    },
    antigravity: {
      implementation: [],
      qa: [],
      test: [],
      code_review: [],
      ui: [
        "gemini-3.5-flash-high",
        "gemini-3.1-pro-low",
        "gemini-3.1-pro-high",
      ],
      ux_copy: ["gemini-3.5-flash-medium"],
      architecture: [],
      security: [],
      release: [],
      database: [],
      deployment: [],
      documentation: [],
      monitoring: [],
      unknown: [],
    },
    hermes: {
      implementation: [],
      qa: [],
      test: [],
      code_review: [],
      ui: [],
      ux_copy: [],
      architecture: [],
      security: [],
      release: [],
      database: [],
      deployment: [],
      documentation: [],
      monitoring: ["hermes-supervisor-default"],
      unknown: [],
    },
    omc: {
      implementation: [],
      qa: [],
      test: [],
      code_review: [],
      ui: [],
      ux_copy: [],
      architecture: [],
      security: [],
      release: [],
      database: [],
      deployment: [],
      documentation: [],
      monitoring: [],
      unknown: [],
    },
    omx: {
      implementation: [],
      qa: [],
      test: [],
      code_review: [],
      ui: [],
      ux_copy: [],
      architecture: [],
      security: [],
      release: [],
      database: [],
      deployment: [],
      documentation: [],
      monitoring: [],
      unknown: [],
    },
  };

  return modelPreferences[agentId]?.[taskKind] ?? [];
}

/**
 * Find the best available model from a list
 */
function findBestAvailableModel(
  modelIds: string[]
): ModelProfile | undefined {
  for (const modelId of modelIds) {
    const model = getModel(modelId);
    if (model && model.quotaStatus !== "exhausted") {
      return model;
    }
  }
  return undefined;
}

/**
 * Check if model switch is possible and recommended
 */
function analyzeModelSwitchNeed(
  agentId: AgentRuntimeProfile["id"],
  currentModel: string | undefined,
  preferredModels: string[]
): {
  needsSwitch: boolean;
  strategy?: ModelSwitchStrategy;
  reason: string;
} {
  // If no current model set, model switch is not needed
  if (!currentModel) {
    return {
      needsSwitch: false,
      reason: "No current model set",
    };
  }

  // If current model is in preferred list, no switch needed
  if (preferredModels.includes(currentModel)) {
    return {
      needsSwitch: false,
      reason: "Current model is suitable for task",
    };
  }

  // Model switch is needed
  if (agentId === "antigravity") {
    return {
      needsSwitch: true,
      strategy: "antigravity_slash_command",
      reason: "Model switch needed via /model command",
    };
  }

  // For other agents, fall back instead of switching
  return {
    needsSwitch: true,
    strategy: "handoff_instead",
    reason: "Model switch not supported, will fallback to suitable agent",
  };
}

/**
 * Main routing decision function
 */
export function routeAgentAndModel(
  taskKind: TaskKind,
  currentAgent?: AgentRuntimeProfile["id"],
  currentModel?: string,
  riskLevel: "low" | "medium" | "high" | "critical" = "medium"
): AgentModelRoutingDecision {
  const preferredAgents = getPreferredAgentForTask(taskKind);
  const autoRunScope = getAutoRunScopeForTask(taskKind);

  // Find primary agent - check AVAILABLE agents only
  let primaryAgent: AgentRuntimeProfile["id"] | undefined;
  let primaryAgentStatus: AgentRuntimeStatus = "unknown";

  for (const agentId of preferredAgents) {
    if (isAgentAvailable(agentId)) {
      const agent = getAgentRuntime(agentId);
      if (agent) {
        primaryAgent = agentId;
        primaryAgentStatus = agent.status;
        break;
      }
    }
  }

  // If preferred agent not available, still consider it for decision
  // but flag as unavailable in execution mode
  if (!primaryAgent && preferredAgents.length > 0) {
    primaryAgent = preferredAgents[0];
    const agent = getAgentRuntime(primaryAgent);
    if (agent) {
      primaryAgentStatus = agent.status;
    }
  }

  // If primary agent not available, try fallback
  let fallbackAgent: AgentRuntimeProfile["id"] | undefined;
  if (!primaryAgent || !isAgentAvailable(primaryAgent)) {
    const allAgents = getAllAgentRuntimes();
    for (const agent of allAgents) {
      if (isAgentAvailable(agent.id) && agent.id !== currentAgent && agent.id !== primaryAgent) {
        fallbackAgent = agent.id;
        break;
      }
    }
  }

  // Get preferred models for primary agent
  const preferredModelIds =
    primaryAgent && isAgentAvailable(primaryAgent)
      ? getPreferredModelsForTask(primaryAgent, taskKind)
      : [];

  // Find best available model
  const primaryModel =
    primaryAgent && isAgentAvailable(primaryAgent)
      ? findBestAvailableModel(preferredModelIds)
      : undefined;

  // Determine if model switch is needed
  const modelSwitchAnalysis = primaryAgent
    ? analyzeModelSwitchNeed(primaryAgent, currentModel, preferredModelIds)
    : { needsSwitch: false, reason: "No primary agent" };

  // Determine execution mode
  let executionMode: ExecutionMode = "manual_confirm";
  let requiresApproval = false;

  // Check if primary agent is actually available
  const primaryAvailable = primaryAgent && isAgentAvailable(primaryAgent);

  if (!primaryAvailable && !fallbackAgent) {
    // No primary and no fallback available
    executionMode = "waiting_for_recovery";
  } else if (riskLevel === "high" || riskLevel === "critical") {
    executionMode = "release_gate";
    requiresApproval = true;
  } else if (primaryAvailable && primaryAgent && autoRunScope && canAgentAutoRun(primaryAgent, autoRunScope)) {
    // Primary is available and can auto-run
    executionMode = "auto";
  } else if (riskLevel !== "low" || (primaryAgent && !primaryAvailable)) {
    // High risk or primary unavailable needs approval
    requiresApproval = true;
  }

  // Build decision
  const decision: AgentModelRoutingDecision = {
    taskKind,
    recommendedAgentId: primaryAgent || fallbackAgent || "claude-code",
    recommendedModelId: primaryModel?.id,
    fallbackAgentId: fallbackAgent,
    fallbackModelId: fallbackAgent
      ? findBestAvailableModel(
          getPreferredModelsForTask(fallbackAgent, taskKind)
        )?.id
      : undefined,
    reason: buildDecisionReason(
      taskKind,
      primaryAgent,
      primaryAgentStatus,
      fallbackAgent,
      primaryModel,
      modelSwitchAnalysis
    ),
    canAutoRun: executionMode === "auto",
    requiresApproval,
    requiresModelSwitch: modelSwitchAnalysis.needsSwitch,
    modelSwitchStrategy: modelSwitchAnalysis.strategy,
    executionMode,
    riskNotes: buildRiskNotes(
      riskLevel,
      requiresApproval,
      modelSwitchAnalysis.needsSwitch,
      !primaryAvailable
    ),
  };

  return decision;
}

/**
 * Build human-readable reason for the decision
 */
function buildDecisionReason(
  taskKind: TaskKind,
  primaryAgent: AgentRuntimeProfile["id"] | undefined,
  primaryAgentStatus: AgentRuntimeStatus,
  fallbackAgent: AgentRuntimeProfile["id"] | undefined,
  primaryModel: ModelProfile | undefined,
  modelSwitchAnalysis: ReturnType<typeof analyzeModelSwitchNeed>
): string {
  if (primaryAgent && primaryModel) {
    return `Task '${taskKind}' routes to ${primaryAgent} with ${primaryModel.displayName} (${primaryModel.speed} speed, ${primaryModel.reasoningDepth} reasoning depth)`;
  }

  if (primaryAgent && !primaryModel) {
    return `Task '${taskKind}' routes to ${primaryAgent} (no model available, may need manual config)`;
  }

  if (fallbackAgent) {
    return `Primary agent unavailable; falling back to ${fallbackAgent} for task '${taskKind}'`;
  }

  return `No suitable agent available for task '${taskKind}' - waiting for recovery`;
}

/**
 * Build risk notes
 */
function buildRiskNotes(
  riskLevel: "low" | "medium" | "high" | "critical",
  requiresApproval: boolean,
  requiresModelSwitch: boolean,
  primaryUnavailable: boolean = false
): string[] {
  const notes: string[] = [];

  if (riskLevel === "high" || riskLevel === "critical") {
    notes.push(`Risk level: ${riskLevel}`);
  }

  if (requiresApproval) {
    notes.push("Approval required");
  }

  if (requiresModelSwitch) {
    notes.push("Model switching may be required");
  }

  if (primaryUnavailable) {
    notes.push("Primary agent unavailable, may use fallback");
  }

  return notes;
}

/**
 * Export for testing
 */
export function resetModuleState(): void {
  // No internal state to reset; registries handle their own state
}
