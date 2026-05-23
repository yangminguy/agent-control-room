/**
 * Agent Runtime Registry
 *
 * Tracks the installation, availability, and capability status of each agent.
 * The system uses this to make automatic routing and fallback decisions.
 *
 * Statuses:
 * - available_verified: Agent is installed and working
 * - installed_unverified: Agent is installed but not verified
 * - rate_limited: Agent is temporarily unavailable due to quota
 * - token_exhausted: Agent quota exhausted
 * - not_installed: Agent not found
 * - not_authenticated: Agent not authenticated
 * - wrong_project: Agent pointing to wrong directory
 * - cooldown: Agent in cooldown period
 * - manual_required: User manual intervention needed
 * - unknown: Status unknown
 */

export type AgentRuntimeStatus =
  | "available_verified"
  | "installed_unverified"
  | "rate_limited"
  | "token_exhausted"
  | "not_installed"
  | "not_authenticated"
  | "wrong_project"
  | "cooldown"
  | "manual_required"
  | "unknown";

export type ModelSelectionMode =
  | "cli_flag"
  | "slash_command"
  | "app_setting"
  | "runtime_config"
  | "not_applicable"
  | "unknown";

export type AutoRunScope =
  | "safe_code"
  | "low_risk_code"
  | "qa"
  | "ui_only"
  | "review"
  | "supervisor"
  | "release_gate_only";

export type AgentRuntimeProfile = {
  id: "claude-code" | "codex" | "antigravity" | "hermes" | "omc" | "omx";
  displayName: string;
  command: string;
  commandPath?: string;
  version?: string;
  status: AgentRuntimeStatus;
  capabilities: string[];
  constraints: string[];
  modelSelectionMode: ModelSelectionMode;
  autoRunScopes: AutoRunScope[];
  lastCheckedAt: string;
  lastFailureReason?: string;
  nextRetryAt?: string;
};

// Initialize runtime registry with known agents
const INITIAL_PROFILES: AgentRuntimeProfile[] = [
  {
    id: "claude-code",
    displayName: "Claude Code",
    command: "claude",
    status: "available_verified",
    capabilities: [
      "implementation",
      "architecture",
      "complex_reasoning",
      "orchestration",
      "approval_gate",
    ],
    constraints: [
      "no_auto_merge",
      "no_deploy",
      "limited_auto_run",
    ],
    modelSelectionMode: "cli_flag",
    autoRunScopes: ["safe_code", "low_risk_code"],
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: "codex",
    displayName: "Codex",
    command: "codex",
    status: "available_verified",
    capabilities: [
      "testing",
      "bug_fixing",
      "code_review",
      "qa",
      "bounded_implementation",
    ],
    constraints: [
      "no_auto_run",
      "qa_focused",
    ],
    modelSelectionMode: "cli_flag",
    autoRunScopes: ["review"],
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: "antigravity",
    displayName: "Antigravity",
    command: "agy",
    status: "available_verified",
    capabilities: [
      "ui_implementation",
      "ux_design",
      "visual_qa",
      "screen_iteration",
    ],
    constraints: [
      "no_cli_execution",
      "no_auto_run",
      "no_data_model_changes",
    ],
    modelSelectionMode: "slash_command",
    autoRunScopes: ["ui_only"],
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: "hermes",
    displayName: "Hermes",
    command: "hermes",
    status: "available_verified",
    capabilities: [
      "background_monitoring",
      "logs_analysis",
      "insight_generation",
      "recovery_recommendation",
    ],
    constraints: [
      "no_code_editing",
      "no_execution",
      "supervisor_only",
    ],
    modelSelectionMode: "not_applicable",
    autoRunScopes: ["supervisor"],
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: "omc",
    displayName: "OMC (Oh My Claude)",
    command: "omc",
    status: "not_installed",
    capabilities: [
      "claude_runtime",
      "team_workflows",
    ],
    constraints: [
      "optional",
      "runtime_adapter_only",
    ],
    modelSelectionMode: "runtime_config",
    autoRunScopes: [],
    lastCheckedAt: new Date().toISOString(),
  },
  {
    id: "omx",
    displayName: "OMX (Oh My Codex)",
    command: "omx",
    status: "not_installed",
    capabilities: [
      "codex_runtime",
      "workflow_adapter",
    ],
    constraints: [
      "optional",
      "runtime_adapter_only",
    ],
    modelSelectionMode: "runtime_config",
    autoRunScopes: [],
    lastCheckedAt: new Date().toISOString(),
  },
];

// In-memory registry (can be persisted to file or database)
let runtimeRegistry: AgentRuntimeProfile[] = [...INITIAL_PROFILES];

/**
 * Get all agent runtime profiles
 */
export function getAllAgentRuntimes(): AgentRuntimeProfile[] {
  return [...runtimeRegistry];
}

/**
 * Get a specific agent runtime profile
 */
export function getAgentRuntime(
  agentId: AgentRuntimeProfile["id"]
): AgentRuntimeProfile | undefined {
  return runtimeRegistry.find((p) => p.id === agentId);
}

/**
 * Update an agent runtime profile
 */
export function updateAgentRuntime(
  agentId: AgentRuntimeProfile["id"],
  updates: Partial<Omit<AgentRuntimeProfile, "id" | "displayName" | "command">>
): AgentRuntimeProfile | undefined {
  const index = runtimeRegistry.findIndex((p) => p.id === agentId);
  if (index === -1) return undefined;

  runtimeRegistry[index] = {
    ...runtimeRegistry[index],
    ...updates,
    lastCheckedAt: new Date().toISOString(),
  };

  return runtimeRegistry[index];
}

/**
 * Check if an agent is available for execution
 */
export function isAgentAvailable(agentId: AgentRuntimeProfile["id"]): boolean {
  const profile = getAgentRuntime(agentId);
  if (!profile) return false;

  return (
    profile.status === "available_verified" &&
    !profile.nextRetryAt &&
    (!profile.status.includes("limited") &&
      !profile.status.includes("exhausted") &&
      !profile.status.includes("not_"))
  );
}

/**
 * Get available agents for a given scope
 */
export function getAvailableAgentsForScope(scope: AutoRunScope): AgentRuntimeProfile[] {
  return runtimeRegistry.filter(
    (p) =>
      isAgentAvailable(p.id) &&
      p.autoRunScopes.includes(scope)
  );
}

/**
 * Check if an agent can run on a specific auto-run scope
 */
export function canAgentAutoRun(
  agentId: AgentRuntimeProfile["id"],
  scope: AutoRunScope
): boolean {
  const profile = getAgentRuntime(agentId);
  if (!profile || !isAgentAvailable(agentId)) return false;
  return profile.autoRunScopes.includes(scope);
}

/**
 * Get all agents with a specific status
 */
export function getAgentsByStatus(status: AgentRuntimeStatus): AgentRuntimeProfile[] {
  return runtimeRegistry.filter((p) => p.status === status);
}

/**
 * Export for testing
 */
export function resetRuntimeRegistry(): void {
  runtimeRegistry = [...INITIAL_PROFILES];
}

/**
 * Set custom registry for testing
 */
export function setRuntimeRegistry(profiles: AgentRuntimeProfile[]): void {
  runtimeRegistry = [...profiles];
}
