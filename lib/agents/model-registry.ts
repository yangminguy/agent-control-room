/**
 * Model Registry
 *
 * Tracks available models, their capabilities, strengths/weaknesses, and quota status.
 * Used by the agent × model router to make intelligent model selection decisions.
 */

export type ModelQuotaStatus =
  | "available"
  | "low"
  | "exhausted"
  | "rate_limited"
  | "unknown";

export type ModelSpeed = "fast" | "medium" | "slow";
export type ReasoningDepth = "low" | "medium" | "high" | "very_high";

export type ModelProfile = {
  id: string;
  agentId: "claude-code" | "codex" | "antigravity" | "hermes" | "omc" | "omx";
  displayName: string;
  provider: "anthropic" | "openai" | "google" | "oss" | "unknown";
  cliModelValue?: string; // Value to pass to CLI flag
  selectionMode:
    | "cli_flag"
    | "slash_command"
    | "app_setting"
    | "runtime_config"
    | "detected_only"
    | "not_applicable";
  strengths: string[];
  weaknesses?: string[];
  speed: ModelSpeed;
  reasoningDepth: ReasoningDepth;
  quotaStatus: ModelQuotaStatus;
  nextRefreshAt?: string;
  recommendedFor: string[];
  autoRunAllowed: boolean;
};

// Seed models data
const INITIAL_MODELS: ModelProfile[] = [
  // Claude Code models
  {
    id: "claude-sonnet-4-6",
    agentId: "claude-code",
    displayName: "Claude Sonnet 4.6",
    provider: "anthropic",
    cliModelValue: "claude-sonnet-4-6",
    selectionMode: "cli_flag",
    strengths: [
      "Fast implementation",
      "Good balance of speed and reasoning",
      "Multi-step orchestration",
    ],
    weaknesses: ["Not ideal for highest complexity"],
    speed: "fast",
    reasoningDepth: "high",
    quotaStatus: "available",
    recommendedFor: [
      "implementation",
      "orchestration",
      "runner",
      "approval_logic",
    ],
    autoRunAllowed: true,
  },
  {
    id: "claude-opus-4-7",
    agentId: "claude-code",
    displayName: "Claude Opus 4.7",
    provider: "anthropic",
    cliModelValue: "claude-opus-4-7",
    selectionMode: "cli_flag",
    strengths: [
      "Highest reasoning capability",
      "Complex architecture decisions",
      "Security review",
    ],
    weaknesses: ["Slower than Sonnet"],
    speed: "slow",
    reasoningDepth: "very_high",
    quotaStatus: "available",
    recommendedFor: [
      "architecture",
      "security",
      "final_review",
      "high_stakes",
    ],
    autoRunAllowed: false,
  },
  {
    id: "claude-haiku-4-5",
    agentId: "claude-code",
    displayName: "Claude Haiku 4.5",
    provider: "anthropic",
    cliModelValue: "claude-haiku-4-5-20251001",
    selectionMode: "cli_flag",
    strengths: ["Very fast", "Good for simple tasks", "Low cost"],
    weaknesses: ["Limited reasoning for complex tasks"],
    speed: "fast",
    reasoningDepth: "low",
    quotaStatus: "available",
    recommendedFor: ["docs", "small_edits", "simple_tasks"],
    autoRunAllowed: true,
  },

  // Codex models
  {
    id: "gpt-5.5",
    agentId: "codex",
    displayName: "GPT-5.5",
    provider: "openai",
    cliModelValue: "gpt-5-5",
    selectionMode: "cli_flag",
    strengths: ["Default QA model", "Good test writing", "Code review"],
    weaknesses: [],
    speed: "medium",
    reasoningDepth: "high",
    quotaStatus: "rate_limited", // Currently rate-limited
    nextRefreshAt: "2026-05-27T15:58:00Z",
    recommendedFor: ["qa", "tests", "code_review"],
    autoRunAllowed: false,
  },
  {
    id: "gpt-5.4",
    agentId: "codex",
    displayName: "GPT-5.4",
    provider: "openai",
    cliModelValue: "gpt-5-4",
    selectionMode: "cli_flag",
    strengths: ["Deeper QA", "Bug isolation", "Complex SWE"],
    weaknesses: ["Higher cost than 5.5"],
    speed: "medium",
    reasoningDepth: "very_high",
    quotaStatus: "available",
    recommendedFor: ["deeper_qa", "bug_isolation", "complex_swe"],
    autoRunAllowed: false,
  },
  {
    id: "gpt-5.4-mini",
    agentId: "codex",
    displayName: "GPT-5.4 Mini",
    provider: "openai",
    cliModelValue: "gpt-5-4-mini",
    selectionMode: "cli_flag",
    strengths: ["Fast subagent", "Small test updates"],
    weaknesses: [],
    speed: "fast",
    reasoningDepth: "medium",
    quotaStatus: "available",
    recommendedFor: ["fast_subagent", "small_test_updates"],
    autoRunAllowed: false,
  },

  // Antigravity models
  {
    id: "gemini-3.5-flash-medium",
    agentId: "antigravity",
    displayName: "Gemini 3.5 Flash (Medium)",
    provider: "google",
    selectionMode: "slash_command",
    strengths: ["Quick UI copy", "Light screen edits"],
    weaknesses: ["Limited reasoning"],
    speed: "fast",
    reasoningDepth: "low",
    quotaStatus: "available",
    recommendedFor: ["quick_ui_copy", "light_screen_edits"],
    autoRunAllowed: false,
  },
  {
    id: "gemini-3.5-flash-high",
    agentId: "antigravity",
    displayName: "Gemini 3.5 Flash (High)",
    provider: "google",
    selectionMode: "slash_command",
    strengths: ["Light-to-medium UI work"],
    weaknesses: [],
    speed: "fast",
    reasoningDepth: "medium",
    quotaStatus: "available",
    recommendedFor: ["light_medium_ui_work"],
    autoRunAllowed: false,
  },
  {
    id: "gemini-3.1-pro-low",
    agentId: "antigravity",
    displayName: "Gemini 3.1 Pro (Low)",
    provider: "google",
    selectionMode: "slash_command",
    strengths: ["Medium UI structure"],
    weaknesses: ["Slower than Flash"],
    speed: "medium",
    reasoningDepth: "medium",
    quotaStatus: "available",
    recommendedFor: ["medium_ui_structure"],
    autoRunAllowed: false,
  },
  {
    id: "gemini-3.1-pro-high",
    agentId: "antigravity",
    displayName: "Gemini 3.1 Pro (High)",
    provider: "google",
    selectionMode: "slash_command",
    strengths: ["Complex UI/UX layout"],
    weaknesses: ["Slower than Flash"],
    speed: "medium",
    reasoningDepth: "high",
    quotaStatus: "available",
    recommendedFor: ["complex_ui_ux_layout"],
    autoRunAllowed: false,
  },
  {
    id: "claude-sonnet-4.6-thinking",
    agentId: "antigravity",
    displayName: "Claude Sonnet 4.6 (Thinking)",
    provider: "anthropic",
    selectionMode: "slash_command",
    strengths: ["Complex UI + code reasoning"],
    weaknesses: ["Slower"],
    speed: "slow",
    reasoningDepth: "very_high",
    quotaStatus: "available",
    recommendedFor: ["complex_ui_code_reasoning"],
    autoRunAllowed: false,
  },
  {
    id: "claude-opus-4.6-thinking",
    agentId: "antigravity",
    displayName: "Claude Opus 4.6 (Thinking)",
    provider: "anthropic",
    selectionMode: "slash_command",
    strengths: ["Hardest UX/architecture review"],
    weaknesses: ["Slowest"],
    speed: "slow",
    reasoningDepth: "very_high",
    quotaStatus: "available",
    recommendedFor: ["hardest_ux_architecture_review"],
    autoRunAllowed: false,
  },
  {
    id: "gpt-oss-120b-medium",
    agentId: "antigravity",
    displayName: "GPT-OSS 120B (Medium)",
    provider: "oss",
    selectionMode: "slash_command",
    strengths: ["Low-cost review", "Docs", "Summary"],
    weaknesses: [],
    speed: "fast",
    reasoningDepth: "medium",
    quotaStatus: "available",
    recommendedFor: ["low_cost_review", "docs", "summary"],
    autoRunAllowed: false,
  },

  // Hermes model
  {
    id: "hermes-supervisor-default",
    agentId: "hermes",
    displayName: "Hermes Supervisor",
    provider: "anthropic",
    selectionMode: "not_applicable",
    strengths: ["Logs analysis", "Insights", "Recovery"],
    weaknesses: [],
    speed: "fast",
    reasoningDepth: "medium",
    quotaStatus: "available",
    recommendedFor: ["supervisor", "monitoring", "recovery"],
    autoRunAllowed: false,
  },
];

// In-memory model registry
let modelRegistry: ModelProfile[] = [...INITIAL_MODELS];

/**
 * Get all models
 */
export function getAllModels(): ModelProfile[] {
  return [...modelRegistry];
}

/**
 * Get models for a specific agent
 */
export function getModelsForAgent(
  agentId: ModelProfile["agentId"]
): ModelProfile[] {
  return modelRegistry.filter((m) => m.agentId === agentId);
}

/**
 * Get a specific model by ID
 */
export function getModel(modelId: string): ModelProfile | undefined {
  return modelRegistry.find((m) => m.id === modelId);
}

/**
 * Update a model profile
 */
export function updateModel(
  modelId: string,
  updates: Partial<Omit<ModelProfile, "id" | "agentId" | "displayName" | "provider">>
): ModelProfile | undefined {
  const index = modelRegistry.findIndex((m) => m.id === modelId);
  if (index === -1) return undefined;

  modelRegistry[index] = {
    ...modelRegistry[index],
    ...updates,
  };

  return modelRegistry[index];
}

/**
 * Get models by quota status
 */
export function getModelsByQuotaStatus(
  status: ModelQuotaStatus
): ModelProfile[] {
  return modelRegistry.filter((m) => m.quotaStatus === status);
}

/**
 * Get available models for a task kind
 */
export function getModelsForTaskKind(
  taskKind: string,
  agentId: ModelProfile["agentId"]
): ModelProfile[] {
  return getModelsForAgent(agentId).filter((m) =>
    m.recommendedFor.includes(taskKind)
  );
}

/**
 * Export for testing
 */
export function resetModelRegistry(): void {
  modelRegistry = [...INITIAL_MODELS];
}

/**
 * Set custom registry for testing
 */
export function setModelRegistry(models: ModelProfile[]): void {
  modelRegistry = [...models];
}
