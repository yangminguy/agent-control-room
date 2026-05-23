/**
 * Hermes Insight Lifecycle Manager
 *
 * 역할: Hermes 인사이트의 전체 생명주기 관리
 * - 생성: ExecutionResult + DecisionClassification에서 자동 생성
 * - 기록: 메모리 레코더에 추가
 * - 저장: 로컬 JSON 파일에 영구 저장
 * - 중복 방지: 24시간 윈도우 내 같은 패턴 감지
 *
 * Phase 3-P0: 로컬 JSON 저장소 통합
 */

import type {
  ExecutionResultSummary,
  DecisionClassification,
  PlanTask,
} from "@/lib/types";
import {
  generateInsightsFromExecution,
  HermesInsightRecorder,
  type HermesInsight,
} from "@/lib/hermes/insight-recorder";
import {
  readHermesInsights,
  writeHermesInsights,
} from "@/lib/storage/hermes-insight-store";

// 싱글톤 레코더 인스턴스
let globalRecorder: HermesInsightRecorder | null = null;

/**
 * 전역 레코더 인스턴스 반환 또는 생성
 */
function getGlobalRecorder(): HermesInsightRecorder {
  if (!globalRecorder) {
    globalRecorder = new HermesInsightRecorder(true); // 파일 저장 활성화
  }
  return globalRecorder;
}

/**
 * 라이프사이클 초기화: 파일에서 insights 로드
 */
export async function initializeInsightLifecycle(): Promise<void> {
  const recorder = getGlobalRecorder();
  try {
    await recorder.loadFromFile();
  } catch (error) {
    console.warn("[insight-lifecycle] Failed to load insights from file:", error);
  }
}

/**
 * 실행 결과로부터 insights 생성 및 기록
 *
 * @param executionResult - 실행 결과
 * @param decision - 의사결정 분류
 * @param task - 작업 정보
 * @returns 생성된 insights (저장되지 않은 상태)
 */
export async function recordExecutionInsights(
  executionResult: ExecutionResultSummary,
  decision: DecisionClassification,
  task: PlanTask,
): Promise<HermesInsight[]> {
  const recorder = getGlobalRecorder();

  // Step 1: 실행 결과로부터 insights 생성
  const newInsights = generateInsightsFromExecution(
    executionResult,
    decision,
    task,
  );

  // Step 2: 각 insight를 레코더에 기록
  for (const insight of newInsights) {
    recorder.recordInsight(insight);
  }

  // Step 3: 메모리 상태를 파일에 저장
  try {
    await recorder.flushToFile();
  } catch (error) {
    console.error("[insight-lifecycle] Failed to flush insights to file:", error);
  }

  return newInsights;
}

/**
 * 모든 insights 조회 (로컬 저장소에서)
 */
export async function getAllInsights(): Promise<HermesInsight[]> {
  try {
    return await readHermesInsights();
  } catch (error) {
    console.warn("[insight-lifecycle] Failed to read insights:", error);
    return [];
  }
}

/**
 * 심각도별 insights 조회
 */
export async function getInsightsBySeverity(
  severity: "critical" | "warning" | "info",
): Promise<HermesInsight[]> {
  try {
    const insights = await readHermesInsights();
    return insights.filter((i) => i.severity === severity);
  } catch (error) {
    console.warn("[insight-lifecycle] Failed to filter insights:", error);
    return [];
  }
}

/**
 * 최근 insights 조회
 */
export async function getRecentInsights(hours: number = 24): Promise<HermesInsight[]> {
  try {
    const insights = await readHermesInsights();
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return insights.filter(
      (i) => new Date(i.createdAt).getTime() > cutoff,
    );
  } catch (error) {
    console.warn("[insight-lifecycle] Failed to get recent insights:", error);
    return [];
  }
}

/**
 * Task ID로 관련 insights 조회
 */
export async function getInsightsByTaskId(taskId: string): Promise<HermesInsight[]> {
  try {
    const insights = await readHermesInsights();
    return insights.filter((i) => i.relatedTaskId === taskId);
  } catch (error) {
    console.warn("[insight-lifecycle] Failed to get insights by task:", error);
    return [];
  }
}

/**
 * Plan ID로 관련 insights 조회
 */
export async function getInsightsByPlanId(planId: string): Promise<HermesInsight[]> {
  try {
    const insights = await readHermesInsights();
    return insights.filter((i) => i.relatedPlanId === planId);
  } catch (error) {
    console.warn("[insight-lifecycle] Failed to get insights by plan:", error);
    return [];
  }
}

/**
 * Critical insights 조회 (우선순위)
 */
export async function getCriticalInsights(): Promise<HermesInsight[]> {
  return getInsightsBySeverity("critical");
}

/**
 * Critical insights가 있는지 확인
 */
export async function hasCriticalInsights(): Promise<boolean> {
  const critical = await getCriticalInsights();
  return critical.length > 0;
}

/**
 * 최근 24시간 내 critical insights 개수
 */
export async function countRecentCriticalInsights(): Promise<number> {
  const critical = await getInsightsBySeverity("critical");
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  return critical.filter(
    (i) => new Date(i.createdAt).getTime() > cutoff,
  ).length;
}
