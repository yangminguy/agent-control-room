/**
 * T001: Next Task Recommendation Engine
 * Phase 2: Multi-Agent Orchestration
 *
 * 역할: ExecutionResultSummary와 DecisionClassification을 받아
 *       다음 추천 작업(NextTaskRecommendation)을 생성한다.
 *
 * 규칙 기반 생성기 - LLM 없음, 타입 세이프.
 */

import type {
  DecisionClassification,
  ExecutionResultSummary,
  PlanTask,
  AgentType,
  RiskLevel,
} from "@/lib/types";

/**
 * 다음 추천 작업의 전체 구조
 */
export type NextTaskRecommendation = {
  taskId: string;                      // 새로 생성된 task ID
  planId: string;                      // roadmap 참조
  title: string;                       // 한국어 제목
  goal: string;                        // 한 문장 목표
  description: string;                 // 상세 설명
  recommendedAgent: AgentType;         // 추천 에이전트
  recommendationReason: string;        // 선택 이유 (한국어)
  riskLevel: RiskLevel;                // safe | low | medium | high | critical
  allowedFiles?: string[];             // 수정 가능 파일/패턴
  doNotTouchFiles?: string[];          // 수정 금지 파일
  acceptanceCriteria: string[];        // 완료 기준
  executionMode: "single" | "sequential" | "parallel_safe" | "blocked";
  conflictRisk: "none" | "low" | "medium" | "high";
  conflictRiskReason?: string;         // 충돌 위험 설명 (한국어)
  shouldAutoRun: boolean;              // Phase 2에서는 항상 false
  priority: "P0" | "P1" | "P2" | "P3";
  relatedPlanTaskId?: string;          // 연관된 원래 task ID
  createdAt: string;                   // ISO timestamp
};

/**
 * 의사결정 기반 다음 작업 생성
 *
 * @param executionResult 실행 결과 요약
 * @param decision 의사 분류 결과
 * @param originalTask 현재 실행된 task
 * @param planId roadmap ID
 * @returns 다음 추천 작업
 */
export function generateNextTaskRecommendation(
  executionResult: ExecutionResultSummary,
  decision: DecisionClassification,
  originalTask: PlanTask,
  planId: string,
): NextTaskRecommendation {
  const baseTaskId = `next-${originalTask.id}-${Date.now()}`;
  const now = new Date().toISOString();

  // 의사결정에 따른 작업 생성
  switch (decision.decision) {
    case "pass":
      return generatePassTask(
        baseTaskId,
        planId,
        originalTask,
        executionResult,
        now,
      );

    case "fail":
      return generateFailTask(
        baseTaskId,
        planId,
        originalTask,
        executionResult,
        decision,
        now,
      );

    case "qa_needed":
      return generateQATask(baseTaskId, planId, originalTask, executionResult, now);

    case "retry_needed":
      return generateRetryTask(
        baseTaskId,
        planId,
        originalTask,
        executionResult,
        decision,
        now,
      );

    case "blocked":
      return generateManualReviewTask(
        baseTaskId,
        planId,
        originalTask,
        executionResult,
        "파일 경계 위반으로 인해 수동 검토가 필요합니다.",
        now,
      );

    case "drift_detected":
      return generateDriftAnalysisTask(
        baseTaskId,
        planId,
        originalTask,
        executionResult,
        decision,
        now,
      );

    case "manual_review":
    default:
      return generateManualReviewTask(
        baseTaskId,
        planId,
        originalTask,
        executionResult,
        decision.reason,
        now,
      );
  }
}

/**
 * pass 의사결정 → 다음 roadmap 작업으로 진행
 */
function generatePassTask(
  taskId: string,
  planId: string,
  originalTask: PlanTask,
  executionResult: ExecutionResultSummary,
  createdAt: string,
): NextTaskRecommendation {
  return {
    taskId,
    planId,
    title: "로드맵의 다음 작업으로 진행",
    goal: "현재 단계 완료 후 다음 계획된 작업을 실행합니다.",
    description: `'${originalTask.title}' 작업이 성공적으로 완료되었습니다. 변경 파일: ${executionResult.changedFiles.length}개. 로드맵의 다음 작업을 실행하세요.`,
    recommendedAgent: "claude-code",
    recommendationReason:
      "현재 작업이 성공적으로 완료되었으므로 로드맵의 다음 계획된 작업으로 진행합니다.",
    riskLevel: "low",
    acceptanceCriteria: ["로드맵 상태 업데이트", "다음 작업 준비"],
    executionMode: "single",
    conflictRisk: "none",
    shouldAutoRun: false,
    priority: "P0",
    relatedPlanTaskId: originalTask.id,
    createdAt,
  };
}

/**
 * fail 의사결정 → Claude Code 수정 또는 Codex QA 작업
 */
function generateFailTask(
  taskId: string,
  planId: string,
  originalTask: PlanTask,
  executionResult: ExecutionResultSummary,
  decision: DecisionClassification,
  createdAt: string,
): NextTaskRecommendation {
  // 종료 코드 또는 에러 메시지 분석
  const isCompilationError = executionResult.errorMessages?.some((msg) =>
    /compile|type error|syntax/i.test(msg),
  );

  const isTestFailure = executionResult.errorMessages?.some((msg) =>
    /test failed|assertion/i.test(msg),
  );

  // Codex가 더 나은 경우: 컴파일 또는 테스트 실패
  const recommendedAgent = isCompilationError || isTestFailure ? "codex" : "claude-code";

  const reasonMap: Record<typeof recommendedAgent, string> = {
    "claude-code":
      "구현 로직 오류로 보입니다. Claude Code가 근본 원인을 분석하고 수정합니다.",
    codex: "타입 또는 테스트 실패로 보입니다. Codex가 빠르게 격리하고 수정합니다.",
  };

  return {
    taskId,
    planId,
    title: `'${originalTask.title}' 수정 및 재시도`,
    goal: "실패의 근본 원인을 파악하고 수정합니다.",
    description: `작업이 실패했습니다: ${executionResult.failureReason || decision.reason}. 에이전트가 문제를 분석하고 수정하겠습니다.`,
    recommendedAgent,
    recommendationReason: reasonMap[recommendedAgent],
    riskLevel: "medium",
    allowedFiles: originalTask.allowedFiles,
    doNotTouchFiles: originalTask.doNotTouchFiles,
    acceptanceCriteria: [
      "실패 원인 파악",
      "수정 코드 작성",
      "최소 1회 테스트 통과",
    ],
    executionMode: "single",
    conflictRisk: "low",
    shouldAutoRun: false,
    priority: "P0",
    relatedPlanTaskId: originalTask.id,
    createdAt,
  };
}

/**
 * qa_needed 의사결정 → Codex QA/회귀 검증 작업
 */
function generateQATask(
  taskId: string,
  planId: string,
  originalTask: PlanTask,
  executionResult: ExecutionResultSummary,
  createdAt: string,
): NextTaskRecommendation {
  return {
    taskId,
    planId,
    title: `'${originalTask.title}' QA 및 회귀 검증`,
    goal: "체크 실패를 분석하고 회귀를 검증합니다.",
    description: `일부 체크가 실패했습니다. Codex가 실패 원인을 조사하고 회귀를 검증합니다. 변경 파일: ${executionResult.changedFiles.join(", ")}`,
    recommendedAgent: "codex",
    recommendationReason: "QA와 회귀 검증은 Codex의 전문 영역입니다.",
    riskLevel: "low",
    allowedFiles: originalTask.allowedFiles,
    doNotTouchFiles: originalTask.doNotTouchFiles,
    acceptanceCriteria: [
      "실패한 체크 분석",
      "회귀 테스트 실행",
      "문제점 정리 또는 수정",
    ],
    executionMode: "single",
    conflictRisk: "none",
    shouldAutoRun: false,
    priority: "P1",
    relatedPlanTaskId: originalTask.id,
    createdAt,
  };
}

/**
 * retry_needed 의사결정 → 동일 에이전트로 재시도 작업
 */
function generateRetryTask(
  taskId: string,
  planId: string,
  originalTask: PlanTask,
  executionResult: ExecutionResultSummary,
  decision: DecisionClassification,
  createdAt: string,
): NextTaskRecommendation {
  return {
    taskId,
    planId,
    title: `'${originalTask.title}' 재시도 (일시적 오류)`,
    goal: "일시적 오류를 복구하기 위해 작업을 다시 실행합니다.",
    description: `일시적 오류가 감지되었습니다: ${decision.reason}. 같은 에이전트가 작업을 재시도합니다.`,
    recommendedAgent: originalTask.assignedAgent,
    recommendationReason: "일시적 오류(타임아웃, 속도 제한 등)이므로 같은 에이전트가 재시도합니다.",
    riskLevel: "low",
    allowedFiles: originalTask.allowedFiles,
    doNotTouchFiles: originalTask.doNotTouchFiles,
    acceptanceCriteria: ["작업 재시도", "성공 확인"],
    executionMode: "single",
    conflictRisk: "none",
    shouldAutoRun: false,
    priority: "P0",
    relatedPlanTaskId: originalTask.id,
    createdAt,
  };
}

/**
 * drift_detected 의사결정 → Hermes drift 분석 + 로드맵 재정렬
 */
function generateDriftAnalysisTask(
  taskId: string,
  planId: string,
  originalTask: PlanTask,
  executionResult: ExecutionResultSummary,
  decision: DecisionClassification,
  createdAt: string,
): NextTaskRecommendation {
  return {
    taskId,
    planId,
    title: "Hermes: 계획 일탈 분석 및 재정렬",
    goal: "실행 결과가 계획과 어떻게 벗어났는지 분석하고 로드맵을 재정렬합니다.",
    description: `작업이 예상과 다르게 진행되었습니다: ${decision.reason}. Hermes가 이 일탈을 분석하고 로드맵 조정을 권장합니다.`,
    recommendedAgent: "claude-code",
    recommendationReason:
      "아키텍처 및 로드맵 분석이 필요하므로 Claude Code가 일탈을 분석합니다.",
    riskLevel: "high",
    acceptanceCriteria: [
      "일탈 원인 분석",
      "로드맵 영향도 평가",
      "조정 권고안 제시",
    ],
    executionMode: "single",
    conflictRisk: "high",
    conflictRiskReason: "로드맵 전체를 재검토해야 하므로 다른 작업과 병렬 불가",
    shouldAutoRun: false,
    priority: "P0",
    relatedPlanTaskId: originalTask.id,
    createdAt,
  };
}

/**
 * manual_review / blocked → 사용자 검토 작업
 */
function generateManualReviewTask(
  taskId: string,
  planId: string,
  originalTask: PlanTask,
  executionResult: ExecutionResultSummary,
  reason: string,
  createdAt: string,
): NextTaskRecommendation {
  return {
    taskId,
    planId,
    title: "사용자 검토 필요",
    goal: "시스템이 자동 판단할 수 없으므로 사용자의 입력과 판단을 기다립니다.",
    description: `원인: ${reason}. 변경 파일: ${executionResult.changedFiles.join(", ")}. 사용자가 상황을 검토하고 다음 액션을 결정하세요.`,
    recommendedAgent: "claude-code",
    recommendationReason: "사용자 검토 후 Claude Code가 조정 작업을 수행합니다.",
    riskLevel: "high",
    acceptanceCriteria: ["사용자 검토", "다음 액션 결정"],
    executionMode: "blocked",
    conflictRisk: "high",
    shouldAutoRun: false,
    priority: "P0",
    relatedPlanTaskId: originalTask.id,
    createdAt,
  };
}
