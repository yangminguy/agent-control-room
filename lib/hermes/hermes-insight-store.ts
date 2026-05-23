import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { HermesInsight, InsightStore } from "./hermes-insight-types";

const INSIGHTS_FILE = join(process.cwd(), "data/hermes-insights.json");
const DATA_DIR = join(process.cwd(), "data");

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readInsights(): HermesInsight[] {
  try {
    if (!existsSync(INSIGHTS_FILE)) return [];
    const content = readFileSync(INSIGHTS_FILE, "utf-8");
    const store = JSON.parse(content) as InsightStore;
    return store.insights || [];
  } catch (error) {
    console.warn("[HermesInsightStore] Error reading insights:", error);
    return [];
  }
}

export function saveInsight(insight: HermesInsight): void {
  const insights = readInsights();
  const idx = insights.findIndex((i) => i.id === insight.id);
  if (idx >= 0) {
    insights[idx] = { ...insight, updatedAt: new Date().toISOString() };
  } else {
    insights.push({ ...insight, createdAt: insight.createdAt || new Date().toISOString() });
  }
  writeInsights(insights.slice(-300));
}

function writeInsights(insights: HermesInsight[]): void {
  try {
    ensureDataDir();
    const store: InsightStore = {
      insights,
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(INSIGHTS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("[HermesInsightStore] Error writing insights:", error);
  }
}

export function searchInsights(filters: {
  query?: string;
  category?: string;
  severity?: string;
  status?: string;
  limit?: number;
}): HermesInsight[] {
  const insights = readInsights();
  const lowerQuery = (filters.query || "").toLowerCase();
  const { limit = 50 } = filters;

  return insights
    .filter((i) => {
      if (filters.query && !i.title.toLowerCase().includes(lowerQuery)) return false;
      if (filters.category && i.category !== filters.category) return false;
      if (filters.severity && i.severity !== filters.severity) return false;
      if (filters.status && i.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, limit);
}

export function archiveInsight(id: string): void {
  const insights = readInsights();
  const insight = insights.find((i) => i.id === id);
  if (insight) {
    insight.status = "archived";
    writeInsights(insights);
  }
}

export function findDuplicateInsight(title: string, category: string): HermesInsight | null {
  const insights = readInsights();
  return insights.find((i) => i.title === title && i.category === category && i.status !== "archived") || null;
}

export function getInsightStats() {
  const insights = readInsights();
  const byCategory: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byStatus: Record<string, number> = {};

  insights.forEach((i) => {
    byCategory[i.category] = (byCategory[i.category] || 0) + 1;
    bySeverity[i.severity] = (bySeverity[i.severity] || 0) + 1;
    byStatus[i.status] = (byStatus[i.status] || 0) + 1;
  });

  return {
    totalCount: insights.length,
    byCategory,
    bySeverity,
    byStatus,
    topTags: [],
    mostOccurring: insights.reduce((max, i) => (i.occurrenceCount > max.occurrenceCount ? i : max), insights[0] || null),
  };
}
