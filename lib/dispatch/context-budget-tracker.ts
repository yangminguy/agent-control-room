/**
 * Context Budget Tracker
 *
 * Tracks cumulative token usage per agent.
 * Alerts when approaching context limit (80% threshold).
 * Pure function — no side effects.
 */

import type { AgentType } from "@/lib/types";

export interface ContextBudget {
  agentId: AgentType;
  promptChars: number;
  outputChars: number;
  jobCount: number;
  estimatedTokens: number; // (promptChars + outputChars) / 4
}

/**
 * Agent context limits in tokens (approximate)
 * Based on standard model token windows.
 */
const CONTEXT_THRESHOLDS: Record<AgentType, number> = {
  "claude-code": 150000, // Opus-level context
  codex: 100000, // Sonnet-level context
  antigravity: 50000, // Limited context for UI-focused work
};

/**
 * ContextBudgetTracker: In-memory tracker for token usage per agent.
 *
 * Heuristic: (promptChars + outputChars) / 4 ≈ tokens
 * (Rough approximation; actual token counting requires encoding library)
 */
export class ContextBudgetTracker {
  private budgets: Map<AgentType, ContextBudget> = new Map();

  /**
   * Track prompt + output for a given agent.
   * Returns updated budget.
   */
  track(
    agentId: AgentType,
    promptChars: number,
    outputChars: number
  ): ContextBudget {
    const existing = this.budgets.get(agentId) || {
      agentId,
      promptChars: 0,
      outputChars: 0,
      jobCount: 0,
      estimatedTokens: 0,
    };

    const totalPrompt = existing.promptChars + promptChars;
    const totalOutput = existing.outputChars + outputChars;
    const estimatedTokens = Math.ceil((totalPrompt + totalOutput) / 4);

    const newBudget: ContextBudget = {
      agentId,
      promptChars: totalPrompt,
      outputChars: totalOutput,
      jobCount: existing.jobCount + 1,
      estimatedTokens,
    };

    this.budgets.set(agentId, newBudget);
    return newBudget;
  }

  /**
   * Check if an agent is approaching its context limit (≥80%).
   */
  isApproachingLimit(agentId: AgentType): boolean {
    const budget = this.budgets.get(agentId);
    if (!budget) return false;

    const threshold = CONTEXT_THRESHOLDS[agentId];
    const percentageUsed = (budget.estimatedTokens / threshold) * 100;
    return percentageUsed >= 80;
  }

  /**
   * Get the percentage of context used (0-100).
   */
  getPercentageUsed(agentId: AgentType): number {
    const budget = this.budgets.get(agentId);
    if (!budget) return 0;

    const threshold = CONTEXT_THRESHOLDS[agentId];
    return Math.min(
      100,
      Math.round((budget.estimatedTokens / threshold) * 100)
    );
  }

  /**
   * Get threshold for a given agent.
   */
  getThreshold(agentId: AgentType): number {
    return CONTEXT_THRESHOLDS[agentId];
  }

  /**
   * Retrieve budget for a specific agent.
   */
  get(agentId: AgentType): ContextBudget | undefined {
    return this.budgets.get(agentId);
  }

  /**
   * Get all budgets (for diagnostics/UI).
   */
  getAll(): ContextBudget[] {
    return Array.from(this.budgets.values());
  }

  /**
   * Reset tracker (for testing or session boundaries).
   */
  clear(): void {
    this.budgets.clear();
  }

  /**
   * Reset budget for a specific agent.
   */
  clearAgent(agentId: AgentType): void {
    this.budgets.delete(agentId);
  }
}

/**
 * Global tracker singleton.
 * In a real system, this would be session-scoped or request-scoped.
 */
let globalTracker: ContextBudgetTracker | null = null;

export function getContextBudgetTracker(): ContextBudgetTracker {
  if (!globalTracker) {
    globalTracker = new ContextBudgetTracker();
  }
  return globalTracker;
}

/**
 * Reset global tracker (for testing).
 */
export function resetContextBudgetTracker(): void {
  globalTracker = null;
}
