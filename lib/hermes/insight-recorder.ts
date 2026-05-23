/**
 * T004: Hermes Insight Recorder
 * Phase 2: Multi-Agent Orchestration
 *
 * 역할: 실행 결과로부터 Hermes 인사이트를 생성하고 기록한다.
 * - 반복되는 실패 패턴
 * - 계획으로부터의 드리프트
 * - 성능 저하
 * - 보안 문제
 *
 * Phase 3-P0 업데이트: 로컬 JSON 파일에 Insights 영구 저장
 */

import type {
  ExecutionResultSummary,
  DecisionClassification,
  PlanTask,
} from "@/lib/types";
import {
  readHermesInsights,
  writeHermesInsights,
} from "@/lib/storage/hermes-insight-store";

/**
 * Hermes 인사이트 레코드
 */
export type HermesInsight = {
  id: string;                          // 인사이트 ID
  createdAt: string;                  // ISO timestamp
  source: "execution_result" | "decision" | "drift" | "failure_pattern";
  summary: string;                    // 한국어 요약 (1문장)
  details: string;                    // 상세 설명
  evidence: string[];                 // 증거/데이터 포인트
  recommendation: string;             // 액션 아이템
  severity: "info" | "warning" | "critical";
  patternType?: string;               // "repeated_failure" | "drift" | "performance" | "security"
  relatedTaskId?: string;
  relatedPlanId?: string;
  frequency?: number;                 // 반복 횟수
  lastOccurredAt?: string;           // 마지막 발생 시간
};

/**
 * 인사이트 생성 엔진
 *
 * Phase 3-P0 업데이트:
 * - 메모리 저장소 유지 (기존 호환성)
 * - recordInsight() 호출 시 로컬 파일에도 저장
 * - getAllInsights() 호출 시 파일에서 읽음 (또는 메모리)
 * - 동기 메서드만 유지 (레코더는 빠른 기록이 목표)
 */
export class HermesInsightRecorder {
  private insights: HermesInsight[] = [];
  private useFileStorage: boolean = true;

  constructor(useFileStorage: boolean = true) {
    this.useFileStorage = useFileStorage;
  }

  /**
   * 새로운 인사이트 기록
   * 파일 저장은 별도의 flushToFile() 호출 필요
   */
  recordInsight(insight: HermesInsight): void {
    // 중복 확인: 같은 유형의 최근 인사이트가 있으면 frequency 증가
    const existingIndex = this.insights.findIndex(
      (i) =>
        i.patternType === insight.patternType &&
        i.summary === insight.summary &&
        new Date(i.createdAt).getTime() > Date.now() - 24 * 60 * 60 * 1000, // 24시간 이내
    );

    if (existingIndex >= 0) {
      const existing = this.insights[existingIndex];
      existing.frequency = (existing.frequency ?? 1) + 1;
      existing.lastOccurredAt = new Date().toISOString();
      if (insight.evidence.length > 0) {
        existing.evidence = [...new Set([...existing.evidence, ...insight.evidence])];
      }
    } else {
      this.insights.push(insight);
    }
  }

  /**
   * 모든 인사이트 반환
   * (동기 메서드 - 메모리 캐시에서 반환)
   */
  getAllInsights(): HermesInsight[] {
    return [...this.insights];
  }

  /**
   * 심각도별 인사이트 필터링
   */
  getInsightsBySeverity(severity: "critical" | "warning" | "info"): HermesInsight[] {
    return this.insights.filter((i) => i.severity === severity);
  }

  /**
   * 최근 인사이트만 반환
   */
  getRecentInsights(hours: number = 24): HermesInsight[] {
    const cutoff = Date.now() - hours * 60 * 60 * 1000;
    return this.insights.filter(
      (i) => new Date(i.createdAt).getTime() > cutoff,
    );
  }

  /**
   * 메모리 상태를 로컬 파일에 저장
   * 이 메서드는 비동기이며, 주로 실행 완료 후 호출됨
   */
  async flushToFile(): Promise<void> {
    if (this.useFileStorage) {
      await writeHermesInsights(this.insights);
    }
  }

  /**
   * 파일에서 insights 로드하기
   * 앱 시작 시 또는 명시적으로 호출
   */
  async loadFromFile(): Promise<void> {
    if (this.useFileStorage) {
      this.insights = await readHermesInsights();
    }
  }
}

/**
 * 실행 결과로부터 인사이트를 생성한다
 */
export function generateInsightsFromExecution(
  executionResult: ExecutionResultSummary,
  decision: DecisionClassification,
  task: PlanTask,
): HermesInsight[] {
  const insights: HermesInsight[] = [];

  // 1. 파일 경계 위반 감지 → critical
  if (
    executionResult.changedFiles &&
    executionResult.doNotTouchFiles &&
    hasViolation(executionResult.changedFiles, executionResult.doNotTouchFiles)
  ) {
    insights.push({
      id: `insight-boundary-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: "execution_result",
      summary: "파일 경계 위반: 건드려선 안 되는 파일이 수정되었습니다.",
      details: `작업 '${task.title}'이 보호된 파일을 수정했습니다. 이는 자동 차단됩니다.`,
      evidence: getViolatedFiles(
        executionResult.changedFiles,
        executionResult.doNotTouchFiles,
      ),
      recommendation:
        "파일 경계 설정을 검토하고 작업 범위를 명확히 하세요. 필요하면 로드맵을 재정렬하세요.",
      severity: "critical",
      patternType: "security",
      relatedTaskId: task.id,
      frequency: 1,
    });
  }

  // 2. 예상된 변경이 없는 경우
  if (
    executionResult.changesExpected &&
    (!executionResult.changedFiles || executionResult.changedFiles.length === 0)
  ) {
    insights.push({
      id: `insight-no-changes-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: "execution_result",
      summary: "예상된 변경이 없습니다.",
      details: `작업 '${task.title}'이 파일을 수정하지 않았습니다. 작업이 제대로 실행되지 않았을 수 있습니다.`,
      evidence: [
        `Exit code: ${executionResult.exitCode}`,
        "Changed files: 0",
      ],
      recommendation:
        "작업 설명이 명확한지 확인하고, 에이전트가 할 일을 제대로 이해했는지 검토하세요.",
      severity: "warning",
      patternType: "unclear_task",
      relatedTaskId: task.id,
    });
  }

  // 3. 비정상 종료 코드
  if (
    executionResult.exitCode &&
    executionResult.exitCode !== 0 &&
    decision.decision === "fail"
  ) {
    insights.push({
      id: `insight-exit-code-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: "execution_result",
      summary: `프로세스 오류: 종료 코드 ${executionResult.exitCode}`,
      details: `작업 실행 중 프로세스 오류가 발생했습니다. 로그를 확인하세요.`,
      evidence: [
        `Exit code: ${executionResult.exitCode}`,
        ...(executionResult.errorMessages ?? []),
      ],
      recommendation:
        "오류 로그를 분석하고, 에이전트에 더 자세한 설명을 제공하여 재시도하세요.",
      severity: "warning",
      patternType: "execution_error",
      relatedTaskId: task.id,
    });
  }

  // 4. 체크 실패
  if (executionResult.checksRun) {
    const failedChecks = Object.entries(executionResult.checksRun)
      .filter(([, result]) => result === "failed")
      .map(([name]) => name);

    if (failedChecks.length > 0) {
      insights.push({
        id: `insight-checks-${Date.now()}`,
        createdAt: new Date().toISOString(),
        source: "decision",
        summary: `${failedChecks.length}개의 체크 실패`,
        details: `작업 결과가 품질 기준을 충족하지 않습니다: ${failedChecks.join(", ")}`,
        evidence: failedChecks,
        recommendation: `Codex에게 QA 작업을 할당하여 ${failedChecks.join(", ")} 오류를 수정하세요.`,
        severity: "warning",
        patternType: "qa_failure",
        relatedTaskId: task.id,
      });
    }
  }

  // 5. 드리프트 감지
  if (decision.decision === "drift_detected") {
    insights.push({
      id: `insight-drift-${Date.now()}`,
      createdAt: new Date().toISOString(),
      source: "drift",
      summary: "계획 일탈 감지",
      details: `작업이 예상과 다르게 진행되었습니다: ${decision.reason}`,
      evidence: [decision.reason],
      recommendation:
        "로드맵을 검토하고 작업 설명을 명확히 한 후 재조정하세요. 필요하면 다른 에이전트를 시도하세요.",
      severity: "warning",
      patternType: "drift",
      relatedTaskId: task.id,
    });
  }

  // 6. 허락되지 않은 파일 수정 (경고)
  if (
    executionResult.changedFiles &&
    executionResult.allowedFiles &&
    !isWithinAllowedFiles(executionResult.changedFiles, executionResult.allowedFiles)
  ) {
    const unallowedFiles = getUnallowedFiles(
      executionResult.changedFiles,
      executionResult.allowedFiles,
    );
    if (unallowedFiles.length > 0) {
      insights.push({
        id: `insight-unallowed-${Date.now()}`,
        createdAt: new Date().toISOString(),
        source: "execution_result",
        summary: "허락되지 않은 파일이 수정되었습니다.",
        details: `다음 파일들이 허락 범위를 벗어났습니다: ${unallowedFiles.join(", ")}`,
        evidence: unallowedFiles,
        recommendation:
          "파일 경계를 재검토하거나, 작업 설명을 더 구체적으로 작성하세요.",
        severity: "warning",
        patternType: "scope_creep",
        relatedTaskId: task.id,
      });
    }
  }

  return insights;
}

/**
 * 헬퍼 함수들
 */

function hasViolation(changed: string[], forbidden: string[]): boolean {
  return changed.some((file) =>
    forbidden.some((pattern) => matchesPattern(file, pattern)),
  );
}

function getViolatedFiles(changed: string[], forbidden: string[]): string[] {
  return changed.filter((file) =>
    forbidden.some((pattern) => matchesPattern(file, pattern)),
  );
}

function isWithinAllowedFiles(changed: string[], allowed: string[]): boolean {
  if (allowed.length === 0) return false;
  return changed.every((file) =>
    allowed.some((pattern) => matchesPattern(file, pattern)),
  );
}

function getUnallowedFiles(changed: string[], allowed: string[]): string[] {
  if (allowed.length === 0) return changed;
  return changed.filter(
    (file) => !allowed.some((pattern) => matchesPattern(file, pattern)),
  );
}

function matchesPattern(filePath: string, pattern: string): boolean {
  // 정확한 경로 일치
  if (filePath === pattern) return true;
  // 와일드카드 패턴: lib/* 또는 lib/**
  if (pattern.endsWith("/*")) {
    const prefix = pattern.slice(0, -2);
    return filePath.startsWith(prefix + "/") || filePath === prefix;
  }
  if (pattern.endsWith("/**")) {
    const prefix = pattern.slice(0, -3);
    return filePath.startsWith(prefix + "/") || filePath === prefix;
  }
  // 포함 여부
  if (!pattern.includes("*") && !pattern.includes(".")) {
    return filePath.includes(pattern);
  }
  return false;
}
