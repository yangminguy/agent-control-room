/**
 * Agent Fallback Selector
 *
 * Recommends a fallback agent when the current agent
 * runs into token limits or other availability issues.
 */

import type { AgentType } from "@/lib/types";

/**
 * Get recommended fallback agent for a given agent.
 * Uses predefined fallback chain:
 * - claude-code → codex (broader implementation capability)
 * - codex → claude-code (architecture/planning needed)
 * - antigravity → claude-code (different skill set)
 */
export function recommendFallbackAgent(
  currentAgent: AgentType
): AgentType | null {
  const fallbacks: Record<AgentType, AgentType | null> = {
    "claude-code": "codex",
    codex: "claude-code",
    antigravity: "claude-code",
  };

  return fallbacks[currentAgent] || null;
}

/**
 * Get the fallback chain (ordered list of agents to try).
 * Useful for multi-tier fallback strategy.
 */
export function getFallbackChain(
  currentAgent: AgentType
): AgentType[] {
  const chain: AgentType[] = [];

  let agent: AgentType | null = currentAgent;
  const visited = new Set<AgentType>();

  // Traverse fallback chain up to 3 levels
  for (let i = 0; i < 3; i++) {
    if (!agent || visited.has(agent)) break;
    visited.add(agent);

    const fallback = recommendFallbackAgent(agent);
    if (fallback) {
      chain.push(fallback);
      agent = fallback;
    } else {
      break;
    }
  }

  return chain;
}
