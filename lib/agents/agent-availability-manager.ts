/**
 * Agent Availability Manager
 *
 * Centralized agent state queries for routing and prompt compilation.
 * Reads from agent-status.ts static data.
 */

import {
  getAgentAvailability as getRawAvailability,
  getFallbackAgent as getStaticFallback,
} from "@/lib/agents/agent-status";

export function getAgentAvailability(
  agentId: string
):
  | "available"
  | "cooling_down"
  | "token_limited"
  | "blocked"
  | "manual_only"
  | undefined {
  const raw = getRawAvailability(agentId);
  // agent-status returns "available" as default for unknown agents
  // Map "available" for unknown agents back to undefined
  // We detect unknown by checking if the agentId maps to a real agent
  const knownAgents = [
    "claude-code",
    "codex",
    "antigravity",
    "hermes",
    "vibe-kanban",
    "manual-user",
    "claude_code",
    "vibe_kanban",
    "manual_user",
  ];
  if (!knownAgents.includes(agentId)) {
    return undefined;
  }

  if (raw === "available") return "available";
  if (raw === "cooling_down") return "cooling_down";
  if (raw === "token_limited") return "token_limited";
  if (raw === "blocked") return "blocked";

  return "available";
}

export function isAgentAvailableForWork(agentId: string): boolean {
  const availability = getAgentAvailability(agentId);
  if (availability === undefined) return false;
  return availability === "available";
}

export function getFallbackAgent(agentId: string): string | undefined {
  return getStaticFallback(agentId);
}

export function getRecommendedAgentForTask(taskType: string): string {
  const taskLower = taskType.toLowerCase();

  if (
    taskLower.includes("architecture") ||
    taskLower.includes("planning") ||
    taskLower.includes("review") ||
    taskLower.includes("document") ||
    taskLower.includes("complex")
  ) {
    return "claude-code";
  }

  if (
    taskLower.includes("ui") ||
    taskLower.includes("visual") ||
    taskLower.includes("prototype") ||
    taskLower.includes("design") ||
    taskLower.includes("screen")
  ) {
    return "antigravity";
  }

  if (
    taskLower.includes("monitor") ||
    taskLower.includes("memory") ||
    taskLower.includes("summary") ||
    taskLower.includes("obsidian") ||
    taskLower.includes("background")
  ) {
    return "hermes";
  }

  if (
    taskLower.includes("workspace") ||
    taskLower.includes("session") ||
    taskLower.includes("diff") ||
    taskLower.includes("kanban")
  ) {
    return "vibe-kanban";
  }

  // Default: codex for clear implementation tasks; claude-code otherwise
  if (
    taskLower.includes("implement") ||
    taskLower.includes("fix") ||
    taskLower.includes("test") ||
    taskLower.includes("bug")
  ) {
    return "codex";
  }

  return "claude-code";
}

export function shouldAvoidAgentForNow(agentId: string): boolean {
  const availability = getAgentAvailability(agentId);
  if (availability === undefined) return true;
  return (
    availability === "blocked" ||
    availability === "token_limited" ||
    availability === "cooling_down" ||
    availability === "manual_only"
  );
}

/**
 * Mark an agent as token_limited.
 * This is intended for in-memory runtime state tracking.
 * Note: agent-status.ts provides the static availability data.
 * This function documents the intent to mark agents as limited at runtime.
 */
export function markTokenLimited(
  agentId: string,
  contextPackId: string
): void {
  // In a real implementation, this would update a runtime state store.
  // For now, we log the intent to allow tracking.
  // The actual implementation depends on how agent status is stored at runtime.
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug(
      `[Agent Availability] Marking ${agentId} as token_limited with context pack: ${contextPackId}`
    );
  }
}
