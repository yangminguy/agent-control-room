import type {
  SeniorDevCompiledPrompt,
  PromptCompilerInput,
  AgentRoleDefinition,
  SafetyRule,
  AgentRoutingDecision,
  RiskLevel,
  ParallelSafety,
  ConflictRisk,
  HighRiskAction,
} from "@/lib/prompts/senior-dev-compiler.types";
import type { AgentType } from "@/lib/types";
import {
  getAgentAvailability,
  getFallbackAgent,
} from "@/lib/agents/agent-status";

// ─────────────────────────────────────────────────────────
// Agent Role Definitions
// ─────────────────────────────────────────────────────────

const AGENT_ROLES: Record<string, AgentRoleDefinition> = {
  "claude-code": {
    agent: "claude-code",
    name: "Claude Code",
    strengths: [
      "complex reasoning",
      "architecture planning",
      "integration design",
      "refactoring",
      "connecting layers",
      "document review",
    ],
    weaknesses: ["not suitable for isolated bounded tasks", "slower for simple fixes"],
    bestFor: [
      "architecture decisions",
      "integration work",
      "refactoring",
      "connecting UI/data/model",
      "reviewing complex structure",
      "planning",
    ],
    avoidWhen: ["isolated trivial implementation", "simple bug fixes only"],
    isExecutionAgent: true,
    isBackgroundWorker: false,
    isApprovalGate: false,
  },
  codex: {
    agent: "codex",
    name: "Codex",
    strengths: ["bounded implementation", "tests", "type safety", "bug fixes", "documentation"],
    weaknesses: ["not for architecture decisions", "struggles with ambiguity"],
    bestFor: [
      "isolated implementation",
      "tests",
      "documentation",
      "CLI spikes",
      "safe utilities",
      "type-safe code",
    ],
    avoidWhen: ["architecture decisions", "ambiguous requirements", "integration work"],
    isExecutionAgent: true,
    isBackgroundWorker: false,
    isApprovalGate: false,
  },
  antigravity: {
    agent: "antigravity",
    name: "Antigravity",
    strengths: ["UI implementation", "visual iteration", "responsive design", "prototyping"],
    weaknesses: ["not for backend logic", "not for data models"],
    bestFor: ["UI polish", "visual QA", "responsive design", "screen-level iteration"],
    avoidWhen: ["backend logic", "data models", "CLI work"],
    isExecutionAgent: true,
    isBackgroundWorker: false,
    isApprovalGate: false,
  },
  hermes: {
    agent: "hermes",
    name: "Hermes",
    strengths: [
      "background monitoring",
      "summaries",
      "memory",
      "handoff generation",
      "non-critical analysis",
    ],
    weaknesses: ["NOT for primary coding", "NOT for high-risk changes"],
    bestFor: [
      "background monitoring",
      "summaries",
      "context packs",
      "handoff packs",
      "Obsidian notes",
      "session reports",
    ],
    avoidWhen: [
      "primary coding",
      "critical implementation",
      "high-risk changes",
      "deployment",
      "migrations",
    ],
    isExecutionAgent: false,
    isBackgroundWorker: true,
    isApprovalGate: false,
  },
  "vibe-kanban": {
    agent: "vibe-kanban",
    name: "Vibe Kanban",
    strengths: ["workspace management", "execution tracking", "diff review", "session handling"],
    weaknesses: ["not a product brain", "not for orchestration"],
    bestFor: ["execution workbench", "board management", "workspace launch", "diff review"],
    avoidWhen: ["product decisions", "routing logic", "handoff generation"],
    isExecutionAgent: false,
    isBackgroundWorker: false,
    isApprovalGate: false,
  },
  manual: {
    agent: "manual",
    name: "Manual / User",
    strengths: ["product decision", "approval", "judgment"],
    weaknesses: ["slow", "requires human", "not for routine work"],
    bestFor: ["product direction", "approval gates", "risk acceptance", "final judgment"],
    avoidWhen: ["routine implementation", "simple fixes"],
    isExecutionAgent: false,
    isBackgroundWorker: false,
    isApprovalGate: true,
  },
};

// ─────────────────────────────────────────────────────────
// Safety Rules for High-Risk Actions
// ─────────────────────────────────────────────────────────

const SAFETY_RULES: SafetyRule[] = [
  {
    pattern: /deploy|release|production|shipping/i,
    action: "deployment",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /migration|migrate|alter\s+table|create\s+table|drop\s+table/i,
    action: "db-migration",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /package\.json|npm install|yarn add|add dependency/i,
    action: "package-change",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /delete.*file|remove.*file|rm\s+-rf|git\s+rm/i,
    action: "file-deletion",
    severity: "warning",
    requiresApproval: true,
  },
  {
    pattern: /git\s+push|push\s+to|upload\s+to\s+remote/i,
    action: "git-push",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /auto.?merge|automerge|merge.*automatically/i,
    action: "auto-merge",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /auth|secret|password|credential|token|security|encryption/i,
    action: "auth-security",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /install\s+unknown|run\s+unknown|execute\s+script/i,
    action: "unknown-install",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /hermes.*execute|spawn.*hermes|auto.*hermes/i,
    action: "hermes-autonomous",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /runner|spawn.?runner|git.?worktree.*auto/i,
    action: "runner-changes",
    severity: "critical",
    requiresApproval: true,
  },
  {
    pattern: /environment.*variable|\.env|process\.env.*set/i,
    action: "env-variable",
    severity: "warning",
    requiresApproval: true,
  },
];

// ─────────────────────────────────────────────────────────
// Core Compiler Functions
// ─────────────────────────────────────────────────────────

/**
 * Analyze user request and detect high-risk actions
 */
function detectHighRiskActions(requestText: string): HighRiskAction[] {
  const actions: HighRiskAction[] = [];

  for (const rule of SAFETY_RULES) {
    if (rule.pattern.test(requestText)) {
      actions.push(rule.action);
    }
  }

  return actions;
}

/**
 * Determine risk level based on detected actions
 */
function assessRiskLevel(highRiskActions: HighRiskAction[]): {
  riskLevel: RiskLevel;
  description: string;
} {
  if (highRiskActions.length === 0) {
    return {
      riskLevel: "low",
      description: "No high-risk actions detected.",
    };
  }

  const criticalActions = highRiskActions.filter(
    (action) =>
      [
        "deployment",
        "db-migration",
        "package-change",
        "auto-merge",
        "auth-security",
        "unknown-install",
        "hermes-autonomous",
        "runner-changes",
      ].includes(action),
  );

  if (criticalActions.length > 0) {
    return {
      riskLevel: "high",
      description: `Critical risk actions detected: ${criticalActions.join(", ")}. User approval required.`,
    };
  }

  return {
    riskLevel: "medium",
    description: `Medium-risk actions detected: ${highRiskActions.join(", ")}. Please review carefully.`,
  };
}

/**
 * Recommend target agent based on work type
 */
function routeAgent(
  requestText: string,
  riskLevel: RiskLevel,
  preferredAgent?: AgentType | "auto",
): AgentRoutingDecision {
  const text = requestText.toLowerCase();

  if (preferredAgent && preferredAgent !== "auto") {
    if (riskLevel === "high") {
      return {
        recommendedAgent: "manual",
        primaryReason:
          `Preferred agent ${AGENT_ROLES[preferredAgent]?.name || preferredAgent} was overridden because high-risk work requires explicit user approval first.`,
        fallbackAgent: preferredAgent,
        fallbackReason:
          "After the user approves the risk, the preferred agent can be used if it remains within the approved file boundaries.",
        handoffRequired: true,
      };
    }

    return {
      recommendedAgent: preferredAgent,
      primaryReason:
        `User preferred ${AGENT_ROLES[preferredAgent]?.name || preferredAgent}; this preference is honored because no high-risk action was detected.`,
      handoffRequired: false,
    };
  }

  // Architecture/integration → Claude Code (check first for specificity)
  if (/(architecture|integrate|integration|refactor|connect|model.*layer|data.*layer|bridge|redesign.*architecture)/i.test(text)) {
    return {
      recommendedAgent: "claude-code",
      primaryReason:
        "Architecture, integration, and refactoring are Claude Code's core strengths.",
      handoffRequired: false,
    };
  }

  // Hermes packet work → Hermes (check early as it's specific)
  if (/(hermes|summary|context.?pack|handoff|obsidian|memory|note)/i.test(text)) {
    return {
      recommendedAgent: "hermes",
      primaryReason:
        "This is background/memory work suitable for Hermes packet generation (not execution).",
      handoffRequired: false,
    };
  }

  // Isolated implementation/tests → Codex (but check token limit)
  if (/(test|docs?|utility|util|simple.*implement|bug.?fix|type.*error)/i.test(text)) {
    // Note: Codex is token-limited in current state, so suggest Claude Code as fallback
    return {
      recommendedAgent: "codex",
      primaryReason: "Bounded implementation or test work is Codex's strength.",
      fallbackAgent: "claude-code",
      fallbackReason:
        "Codex is currently token-limited. Claude Code can handle this with more context.",
      handoffRequired: true,
    };
  }

  // UI/visual work → Antigravity (check after more specific patterns)
  if (/(ui|screen|component|visual|layout|responsive|prototype|polish|styling)/i.test(text)) {
    return {
      recommendedAgent: "antigravity",
      primaryReason:
        "UI and visual work is best handled by Antigravity for rapid iteration and polish.",
      handoffRequired: false,
    };
  }

  // High-risk or unknown work → Manual/Claude Code
  if (riskLevel === "high") {
    return {
      recommendedAgent: "manual",
      primaryReason:
        "High-risk work requires explicit user approval and judgment before execution.",
      fallbackAgent: "claude-code",
      fallbackReason:
        "Claude Code can help analyze and plan, but user approval is required before execution.",
      handoffRequired: true,
    };
  }

  // Default: Claude Code for planning/analysis
  return {
    recommendedAgent: "claude-code",
    primaryReason:
      "Claude Code is best for planning and analysis when the work type is ambiguous.",
    handoffRequired: false,
  };
}

/**
 * Determine parallel safety based on work type
 */
function assessParallelSafety(
  targetAgent: string,
  highRiskActions: HighRiskAction[],
): { parallelSafety: ParallelSafety; conflictRisk: ConflictRisk } {
  // High-risk actions are never safe to run in parallel
  if (highRiskActions.length > 0) {
    return {
      parallelSafety: "unsafe",
      conflictRisk: "high",
    };
  }

  // UI work is generally safe in parallel with backend
  if (targetAgent === "antigravity") {
    return {
      parallelSafety: "safe",
      conflictRisk: "low",
    };
  }

  // Isolated implementation/tests are safe
  if (targetAgent === "codex") {
    return {
      parallelSafety: "safe",
      conflictRisk: "low",
    };
  }

  // Architecture/integration work should not run in parallel
  if (targetAgent === "claude-code") {
    return {
      parallelSafety: "caution",
      conflictRisk: "medium",
    };
  }

  // Default: unsafe
  return {
    parallelSafety: "unsafe",
    conflictRisk: "high",
  };
}

/**
 * Generate standard prompt markdown template
 */
function generatePromptMarkdown(input: {
  projectName: string;
  projectContext: string;
  taskTitle: string;
  goal: string;
  scope: string;
  nonGoals: string[];
  allowedFiles: string[];
  doNotTouchFiles: string[];
  requiredWork: string[];
  doNotDoRules: string[];
  acceptanceCriteria: string[];
  targetAgent: string;
  riskLevel: RiskLevel;
  userApprovalRequired: boolean;
}): string {
  const sections: string[] = [
    `# ${input.taskTitle}`,
    ``,
    `**Project:** ${input.projectName}`,
    `**Agent:** ${input.targetAgent}`,
    `**Risk Level:** ${input.riskLevel.toUpperCase()}`,
    input.userApprovalRequired
      ? `**⚠️ User Approval Required:** This task requires explicit approval before execution.`
      : "",
    ``,
    `## Context`,
    input.projectContext || "No context provided.",
    ``,
    `## Goal`,
    input.goal,
    ``,
    `## Scope`,
    input.scope,
    ``,
    input.nonGoals.length > 0
      ? `## Non-Goals\n${input.nonGoals.map((ng) => `- ${ng}`).join("\n")}\n`
      : "",
    `## Files to Read First`,
    `- CLAUDE.md`,
    `- docs/CONTROL_TOWER_DIRECTION.md`,
    `- docs/PRD.md`,
    `- docs/ARCHITECTURE.md`,
    `- docs/TASKS.md`,
    `- docs/AGENT_STATE.md`,
    ``,
    `## Allowed Files to Edit`,
    input.allowedFiles.length > 0
      ? input.allowedFiles.map((f) => `- ${f}`).join("\n")
      : "- Files directly relevant to this task only",
    ``,
    `## Do Not Touch`,
    input.doNotTouchFiles.map((f) => `- ${f}`).join("\n"),
    ``,
    `## Required Work`,
    input.requiredWork.map((w) => `- ${w}`).join("\n"),
    ``,
    `## Do Not Do`,
    input.doNotDoRules.map((rule) => `- ${rule}`).join("\n"),
    ``,
    `## Acceptance Criteria`,
    input.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n"),
    ``,
    `## Validation`,
    `Run after completion:`,
    `\`\`\`bash`,
    `npm run typecheck`,
    `npm run lint`,
    `npm run build`,
    `\`\`\``,
    ``,
    `## Final Handoff Output`,
    `After completion, provide:`,
    `- Summary of changes`,
    `- Changed files list`,
    `- Test results (if applicable)`,
    `- Any remaining issues`,
    `- Recommended next task`,
  ];

  return sections.filter((s) => s !== "").join("\n");
}

// ─────────────────────────────────────────────────────────
// Main Compiler Function
// ─────────────────────────────────────────────────────────

export async function compileSeniorDevPrompt(
  input: PromptCompilerInput,
): Promise<SeniorDevCompiledPrompt> {
  const id = `prompt-${Date.now()}`;
  const now = new Date().toISOString();

  // Step 1: Detect high-risk actions
  const highRiskActions = detectHighRiskActions(input.userRequest);

  // Step 2: Assess risk level
  const { riskLevel, description: riskDescriptionBase } = assessRiskLevel(highRiskActions);
  let riskDescription = riskDescriptionBase;

  // Step 3: Route to appropriate agent
  const routing = routeAgent(input.userRequest, riskLevel, input.preferredAgent);
  const targetAgent = routing.recommendedAgent;

  // Step 4: Assess parallel safety
  const { parallelSafety, conflictRisk } = assessParallelSafety(
    targetAgent,
    highRiskActions,
  );

  // Step 5: Determine user approval requirement
  let userApprovalRequired =
    riskLevel === "high" ||
    targetAgent === "manual" ||
    highRiskActions.some((action) => {
      const rule = SAFETY_RULES.find((r) => r.action === action);
      return rule?.requiresApproval ?? false;
    });

  // Step 6: Build work scope
  const goal = input.userRequest.split(".")[0] || input.userRequest;
  const scope = `Implement: ${input.taskTitle || "Task"} as described in the user request.`;
  const nonGoals = [
    "Do not implement automatic execution of other agents",
    "Do not add unrelated features",
    "Do not refactor unrelated code",
  ];

  // Step 7: Build file boundaries
  const allowedFiles = input.acceptanceCriteria?.length
    ? ["lib/**/*", "app/**/*", "components/**/*", "data/**/*"]
    : ["Only files directly relevant to this task"];

  const doNotTouchFiles = [
    ".env*",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.js",
    "supabase/**",
    "database/**",
  ];

  // Step 8: Build required work
  const requiredWork = [
    `Complete: ${input.taskTitle || "Task"}`,
    ...(input.acceptanceCriteria || []),
  ];

  // Step 9: Build do-not-do rules
  const doNotDoRules = [
    "Do not execute agents automatically",
    "Do not add runner/spawn-runner changes",
    "Do not add package dependencies",
    "Do not change database schema",
    "Do not deploy or push to git",
    "Do not create auto-merge workflows",
    "Do not add Hermes autonomous execution",
    ...(highRiskActions.length > 0
      ? [
          `Do not perform high-risk actions without explicit user approval: ${highRiskActions.join(", ")}`,
        ]
      : []),
  ];

  // Step 10: Availability and safety checks
  // Enhancement 1: Agent availability check
  const agentStatus = getAgentAvailability(targetAgent);
  const isAgentUnavailable =
    agentStatus === "token_limited" || agentStatus === "cooling_down";

  // Only escalate approval when unavailable AND there is no pre-computed fallback in routing.
  // If routing already provided a fallbackAgent, it has handled the token-limit gracefully.
  if (isAgentUnavailable && !routing.fallbackAgent) {
    userApprovalRequired = true;
    riskDescription = `${riskDescription} Agent "${targetAgent}" is currently ${agentStatus} — user approval required before proceeding.`;
  }

  // Enhancement 2: Hermes safety — never primary coding agent for non-background work
  // (The routeAgent function already routes background work to hermes correctly;
  //  this guard catches any edge case where hermes would be selected for coding.)
  // Background work keywords aligned with routeAgent's hermes detection pattern.
  const HERMES_BACKGROUND_PATTERN = /(hermes|summary|summaries|context.?pack|handoff|obsidian|memory|note)/i;
  const isBackgroundWork = HERMES_BACKGROUND_PATTERN.test(
    [input.userRequest, input.taskTitle ?? ""].join(" "),
  );
  let effectiveTargetAgent = targetAgent;
  if (targetAgent === "hermes" && !isBackgroundWork) {
    effectiveTargetAgent = "claude-code";
  }

  // Enhancement 3: Vibe Kanban is never a primary execution agent
  if (effectiveTargetAgent === "vibe-kanban") {
    effectiveTargetAgent = "claude-code";
  }

  // Enhancement 4: Handoff recommendation
  // Suggest handoff when the task is high-risk AND the agent is token-limited
  const suggestedHandoffRequired = riskLevel === "high" && isAgentUnavailable;
  const suggestedFallbackAgent = suggestedHandoffRequired
    ? (getFallbackAgent(effectiveTargetAgent) ?? undefined)
    : undefined;

  // Enhancement 5: Context pack recommendation
  // Suggest context pack when description is long OR many acceptance criteria
  const LONG_REQUEST_THRESHOLD = 2000;
  const MANY_CRITERIA_THRESHOLD = 5;
  const suggestedContextPackRequired =
    input.userRequest.length > LONG_REQUEST_THRESHOLD ||
    (input.acceptanceCriteria?.length ?? 0) >= MANY_CRITERIA_THRESHOLD;
  const contextPackNotes = suggestedContextPackRequired
    ? "Context pack recommended: include project goal, completed work, changed files, decisions, blockers, next task, acceptance criteria, do-not-do rules, and next prompt."
    : undefined;

  // Step 11: Generate markdown prompt (after availability checks so it reflects final state)
  const generatedPromptMarkdown = generatePromptMarkdown({
    projectName: input.projectName,
    projectContext: input.projectContext,
    taskTitle: input.taskTitle || "Task",
    goal,
    scope,
    nonGoals,
    allowedFiles,
    doNotTouchFiles,
    requiredWork,
    doNotDoRules,
    acceptanceCriteria: input.acceptanceCriteria || [],
    targetAgent: AGENT_ROLES[effectiveTargetAgent]?.name || effectiveTargetAgent,
    riskLevel,
    userApprovalRequired,
  });

  // Step 12: Assemble final compiled prompt
  const compiled: SeniorDevCompiledPrompt = {
    id,
    title: input.taskTitle || "Compiled Prompt",
    targetAgent: effectiveTargetAgent as AgentType | "hermes" | "vibe-kanban" | "manual",
    agentReason: routing.primaryReason,
    riskLevel,
    riskDescription,
    highRiskActions,
    userApprovalRequired,
    parallelSafety,
    conflictRisk,
    context: input.projectContext,
    goal,
    scope,
    nonGoals,
    allowedFiles,
    doNotTouchFiles,
    requiredWork,
    doNotDoRules,
    acceptanceCriteria: input.acceptanceCriteria || [],
    validationCommands: ["npm run typecheck", "npm run lint", "npm run build"],
    finalHandoffOutput: "Summary of changes, changed files, tests run, remaining issues.",
    suggestedHandoffRequired,
    suggestedFallbackAgent,
    suggestedContextPackRequired,
    contextPackNotes,
    generatedPromptMarkdown,
    createdAt: now,
    updatedAt: now,
  };

  return compiled;
}

/**
 * Get agent role definition
 */
export function getAgentRole(agent: string): AgentRoleDefinition | undefined {
  return AGENT_ROLES[agent];
}

/**
 * Check if an agent can execute code
 */
export function canAgentExecuteCode(agent: string): boolean {
  const role = AGENT_ROLES[agent];
  return role?.isExecutionAgent ?? false;
}

/**
 * Check if work is safe to run in parallel
 */
export function isSafeToRunInParallel(compilation: SeniorDevCompiledPrompt): boolean {
  return compilation.parallelSafety === "safe" && compilation.riskLevel !== "high";
}
