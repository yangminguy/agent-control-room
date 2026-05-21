/**
 * Agent Status Data
 *
 * Static agent status information for the Agent Control Room.
 * This is the current state of each AI agent and execution system.
 */

import type { AgentStatus } from "@/components/agents/types";

export const agentStatusData: AgentStatus[] = [
  {
    id: "agent-claude-code",
    type: "claude_code",
    name: "Claude Code",
    role: "Roadmap and architecture review",
    availability: "available",
    currentTask: "Agent Status Panel integration complete; ready for T028",
    bestFor: [
      "Architecture decisions",
      "Integration planning",
      "Complex refactoring",
      "Documentation understanding",
    ],
    notFor: [
      "Uncontrolled deployment",
      "Auto-merge without approval",
    ],
    nextRecommendedAction:
      "Begin Senior Dev Prompt Compiler structure (T028: standardize prompt sections and boundaries)",
  },

  {
    id: "agent-codex",
    type: "codex",
    name: "Codex",
    role: "Hermes installation and integration spike",
    availability: "working",
    currentTask:
      "Verifying Hermes Agent installation and integration options",
    bestFor: [
      "Implementation and execution",
      "Test writing",
      "CLI investigation",
      "Bug fixing",
    ],
    notFor: [
      "Production Hermes wiring without approval",
    ],
    nextRecommendedAction:
      "Complete Hermes installation spike (T032), then implement T029 Agent Availability Manager",
  },

  {
    id: "agent-antigravity",
    type: "antigravity",
    name: "Antigravity",
    role: "UI implementation and visual QA",
    availability: "working",
    currentTask: "Visual QA on integrated /plan roadmap-first control panel",
    bestFor: [
      "UI implementation",
      "Visual polish and refinement",
      "Responsive design QA",
      "Screen-level iteration",
    ],
    notFor: [
      "Data model changes",
      "Backend execution logic",
    ],
    nextRecommendedAction:
      "Complete /plan visual review and polish, then design T028 Senior Dev Prompt Compiler UI",
  },

  {
    id: "agent-hermes",
    type: "hermes",
    name: "Hermes",
    role: "Background operations worker",
    availability: "background_worker",
    currentTask: "Not connected yet",
    bestFor: [
      "Background monitoring",
      "Development summaries",
      "Obsidian knowledge export",
      "Context pack generation",
      "Handoff pack generation",
      "Recurring checks",
    ],
    notFor: [
      "Primary implementation",
      "Database migration",
      "Deployment",
      "Auto-merge",
      "Security-sensitive changes",
    ],
    nextRecommendedAction:
      "Install and configure after T032 spike completion",
  },

  {
    id: "agent-vibe-kanban",
    type: "vibe_kanban",
    name: "Vibe Kanban",
    role: "Execution workbench",
    availability: "idle",
    currentTask: "Available as future execution bridge",
    bestFor: [
      "Session management",
      "Task card organization",
      "Diff review and preview",
      "Workspace visualization",
    ],
    notFor: [
      "Product judgment",
      "Autonomous risky execution",
    ],
    nextRecommendedAction:
      "Bridge implementation in Phase 10 (T033-T035)",
  },

  {
    id: "agent-manual-user",
    type: "manual_user",
    name: "Manual / User",
    role: "Product direction and approval",
    availability: "approval_required",
    currentTask: "Approve Phase 9 completion and guide Phase 10 planning",
    bestFor: [
      "Product decisions",
      "Feature approval",
      "Direction correction",
      "Final judgment",
    ],
    notFor: [
      "Repetitive manual execution",
    ],
    nextRecommendedAction:
      "Review integrated /plan Control Tower, approve Phase 9 completion, then approve Phase 10 (Vibe Kanban Bridge) scope",
  },
];

/**
 * Get all agent statuses
 */
export function getAgentStatuses(): AgentStatus[] {
  return agentStatusData;
}

/**
 * Get a specific agent status by type
 */
export function getAgentByType(
  type: import("@/components/agents/types").AgentType,
): AgentStatus | undefined {
  return agentStatusData.find((agent) => agent.type === type);
}

/**
 * Get all working agents
 */
export function getWorkingAgents(): AgentStatus[] {
  return agentStatusData.filter((agent) => agent.availability === "working");
}

/**
 * Get all available/idle agents
 */
export function getAvailableAgents(): AgentStatus[] {
  return agentStatusData.filter((agent) =>
    ["available", "idle"].includes(agent.availability)
  );
}

/**
 * Get all blocked agents
 */
export function getBlockedAgents(): AgentStatus[] {
  return agentStatusData.filter((agent) =>
    ["blocked", "token_limited", "context_overloaded", "disconnected"].includes(
      agent.availability
    )
  );
}

/**
 * Get agent availability status (for prompt compiler routing)
 */
export function getAgentAvailability(
  agent: string
): "available" | "cooling_down" | "token_limited" | "blocked" {
  const agentData = agentStatusData.find(
    (a) => a.type === agent.replace("-", "_")
  );

  if (!agentData) return "available";

  const availability = agentData.availability;
  if (availability === "token_limited" || availability === "context_overloaded") {
    return "token_limited";
  }
  if (availability === "blocked" || availability === "disconnected") {
    return "blocked";
  }
  if (availability === "working" || availability === "background_worker") {
    return "cooling_down";
  }

  return "available";
}

/**
 * Get recommended fallback agent when primary is unavailable
 */
export function getFallbackAgent(
  agent: string
): string | undefined {
  // Default fallback strategy
  const fallbackMap: Record<string, string> = {
    codex: "claude-code",
    antigravity: "claude-code",
    "claude-code": "codex",
    hermes: "claude-code",
    "vibe-kanban": "claude-code",
  };

  return fallbackMap[agent];
}
