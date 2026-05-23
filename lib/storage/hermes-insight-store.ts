/**
 * Hermes Insight Store
 * Persistent local JSON storage for Hermes insights
 *
 * 역할: Hermes 인사이트를 로컬 파일에 영구 저장
 * - 앱 재시작 후에도 insights 유지
 * - read/write/append 메서드 제공
 * - 파일 없으면 자동 생성
 */

import { promises as fs } from "fs";
import path from "path";
import type { HermesInsight } from "@/lib/hermes/insight-recorder";

// Support DATA_DIR override via environment for test isolation
const DATA_DIR = process.env.HERMES_INSIGHTS_DATA_DIR || path.join(process.cwd(), "data");
const INSIGHTS_FILE = path.join(DATA_DIR, "hermes-insights.json");

const globalWithHermesStore = globalThis as typeof globalThis & {
  __hermesInsightMemoryStore?: HermesInsight[];
};

/**
 * 메모리 캐시 반환
 */
function memoryStore(): HermesInsight[] {
  if (!globalWithHermesStore.__hermesInsightMemoryStore) {
    globalWithHermesStore.__hermesInsightMemoryStore = [];
  }
  return globalWithHermesStore.__hermesInsightMemoryStore;
}

/**
 * Insights 파일에서 읽기
 */
export async function readHermesInsights(): Promise<HermesInsight[]> {
  try {
    const file = await fs.readFile(INSIGHTS_FILE, "utf8");
    const insights = JSON.parse(file) as HermesInsight[];
    memoryStore().length = 0;
    memoryStore().push(...insights);
    return insights;
  } catch {
    // 파일이 없거나 읽을 수 없으면 메모리 캐시 반환
    const cached = memoryStore();
    if (cached.length > 0) return [...cached];
    return [];
  }
}

/**
 * Insights를 파일에 쓰기
 */
export async function writeHermesInsights(insights: HermesInsight[]): Promise<void> {
  memoryStore().length = 0;
  memoryStore().push(...insights);

  try {
    await fs.writeFile(
      INSIGHTS_FILE,
      `${JSON.stringify(insights, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn(
        `[hermes-insight-store] disk write unavailable; using volatile memory fallback`,
      );
      return;
    }
    throw error;
  }
}

/**
 * Insight 하나 추가하기
 */
export async function appendHermesInsight(insight: HermesInsight): Promise<void> {
  const insights = await readHermesInsights();
  insights.push(insight);
  await writeHermesInsights(insights);
}

/**
 * 모든 Insights 반환
 */
export async function getAllHermesInsights(): Promise<HermesInsight[]> {
  return readHermesInsights();
}

/**
 * 심각도별 Insights 필터링
 */
export async function getHermesInsightsBySeverity(
  severity: "critical" | "warning" | "info",
): Promise<HermesInsight[]> {
  const insights = await readHermesInsights();
  return insights.filter((i) => i.severity === severity);
}

/**
 * 최근 Insights 반환
 */
export async function getRecentHermesInsights(hours: number = 24): Promise<HermesInsight[]> {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  const insights = await readHermesInsights();
  return insights.filter(
    (i) => new Date(i.createdAt).getTime() > cutoff,
  );
}

/**
 * Task ID로 관련 Insights 찾기
 */
export async function getHermesInsightsByTaskId(taskId: string): Promise<HermesInsight[]> {
  const insights = await readHermesInsights();
  return insights.filter((i) => i.relatedTaskId === taskId);
}

/**
 * Plan ID로 관련 Insights 찾기
 */
export async function getHermesInsightsByPlanId(planId: string): Promise<HermesInsight[]> {
  const insights = await readHermesInsights();
  return insights.filter((i) => i.relatedPlanId === planId);
}

/**
 * Insights 초기화 (테스트용)
 */
export async function clearHermesInsights(): Promise<void> {
  memoryStore().length = 0;
  try {
    await fs.unlink(INSIGHTS_FILE);
  } catch {
    // 파일이 없으면 무시
  }
}
