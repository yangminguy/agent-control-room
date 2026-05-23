/**
 * Runtime Decision Store
 *
 * Persists Agent × Model Router decisions durably.
 * Stores routing decisions, quota status, fallback reasoning.
 */

import { readFileSync, writeFileSync } from "fs";
import { join } from "path";
import type { AgentModelRoutingDecision } from "@/lib/agents/agent-model-router";

const STORE_DIR = "data";
const STORE_FILE = join(STORE_DIR, "runtime-decisions.json");

export type RuntimeDecision = {
  id: string;
  taskId: string;
  planId?: string;
  decision: AgentModelRoutingDecision;
  storedAt: string;
  executedAt?: string;
  executionStatus?: "pending" | "executed" | "failed" | "handoff";
  fallbackReason?: string;
  nextRetryAt?: string;
};

type RuntimeDecisionStore = {
  decisions: RuntimeDecision[];
  lastUpdated: string;
};

/**
 * Initialize store if it doesn't exist
 */
function ensureStore(): RuntimeDecisionStore {
  try {
    const content = readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(content) as RuntimeDecisionStore;
  } catch {
    return {
      decisions: [],
      lastUpdated: new Date().toISOString(),
    };
  }
}

/**
 * Write store to disk
 */
function persistStore(store: RuntimeDecisionStore): void {
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
}

/**
 * Store a routing decision
 */
export function storeRuntimeDecision(
  taskId: string,
  decision: AgentModelRoutingDecision,
  planId?: string,
  fallbackReason?: string
): RuntimeDecision {
  const store = ensureStore();

  const runtimeDecision: RuntimeDecision = {
    id: `rd-${Date.now()}`,
    taskId,
    planId,
    decision,
    storedAt: new Date().toISOString(),
    fallbackReason,
  };

  store.decisions.push(runtimeDecision);
  store.lastUpdated = new Date().toISOString();
  persistStore(store);

  return runtimeDecision;
}

/**
 * Get a runtime decision
 */
export function getRuntimeDecision(id: string): RuntimeDecision | undefined {
  const store = ensureStore();
  return store.decisions.find((d) => d.id === id);
}

/**
 * Get runtime decisions for a task
 */
export function getRuntimeDecisionsForTask(
  taskId: string
): RuntimeDecision[] {
  const store = ensureStore();
  return store.decisions.filter((d) => d.taskId === taskId);
}

/**
 * Update runtime decision status
 */
export function updateRuntimeDecisionStatus(
  id: string,
  status: RuntimeDecision["executionStatus"],
  fallbackReason?: string
): RuntimeDecision | undefined {
  const store = ensureStore();
  const decision = store.decisions.find((d) => d.id === id);

  if (decision) {
    decision.executionStatus = status;
    decision.executedAt = new Date().toISOString();
    if (fallbackReason) {
      decision.fallbackReason = fallbackReason;
    }
    store.lastUpdated = new Date().toISOString();
    persistStore(store);
  }

  return decision;
}

/**
 * Get recent runtime decisions
 */
export function getRecentRuntimeDecisions(
  limit: number = 10
): RuntimeDecision[] {
  const store = ensureStore();
  return store.decisions
    .sort((a, b) => new Date(b.storedAt).getTime() - new Date(a.storedAt).getTime())
    .slice(0, limit);
}

/**
 * Get pending decisions (not yet executed)
 */
export function getPendingRuntimeDecisions(): RuntimeDecision[] {
  const store = ensureStore();
  return store.decisions.filter(
    (d) => d.executionStatus === "pending" || !d.executionStatus
  );
}

/**
 * Clear old runtime decisions (older than 7 days)
 */
export function clearOldRuntimeDecisions(): number {
  const store = ensureStore();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const initialCount = store.decisions.length;
  store.decisions = store.decisions.filter(
    (d) => new Date(d.storedAt) > sevenDaysAgo
  );

  const clearedCount = initialCount - store.decisions.length;
  if (clearedCount > 0) {
    store.lastUpdated = new Date().toISOString();
    persistStore(store);
  }

  return clearedCount;
}

/**
 * Export for testing
 */
export function clearAllRuntimeDecisions(): void {
  const store: RuntimeDecisionStore = {
    decisions: [],
    lastUpdated: new Date().toISOString(),
  };
  persistStore(store);
}
