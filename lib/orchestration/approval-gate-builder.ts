/**
 * Approval Gate Builder
 * Phase 40: Full Orchestration Layer
 *
 * 위험도와 실행 모드에 따라 사용자가 승인해야 할 항목을 구성한다.
 */

import type { RiskLevel } from "../types";
import type { ApprovalGate, ExecutionMode } from "./types";

export function buildApprovalGate(
  riskLevel: RiskLevel,
  executionMode: ExecutionMode
): ApprovalGate {
  switch (riskLevel) {
    case "critical":
      return {
        required: true,
        reason:
          "Critical 위험도 작업입니다. 실행 전 명시적 승인 필수이며, 완료 후 diff 검토가 필요합니다.",
        checklist: [
          "변경할 파일 목록을 직접 확인했는가?",
          "롤백 계획이 있는가? (git stash 또는 백업)",
          "테스트 환경에서 먼저 검증했는가?",
          "영향을 받는 다른 시스템이 있는가?",
          "배포/마이그레이션 타이밍이 적절한가?",
          "이 작업을 취소하면 어떻게 복구하는가?",
        ],
        reviewAfterCompletion: true,
        stopConditions: [
          "예상치 못한 파일이 수정될 경우 즉시 중단",
          "테스트 실패 시 즉시 중단",
          "runner/auth/deploy 로직에 접근하면 즉시 중단",
          "에러 발생 시 자동 재시도 금지",
        ],
      };

    case "high":
      return {
        required: true,
        reason:
          "High 위험도 작업입니다. 실행 전 승인 및 완료 후 결과 검토가 필요합니다.",
        checklist: [
          "작업 목표와 범위가 명확한가?",
          "수정 금지 파일 목록을 확인했는가?",
          "변경 후 테스트 계획이 있는가?",
          "다른 에이전트와의 파일 충돌 위험은 없는가?",
        ],
        reviewAfterCompletion: true,
        stopConditions: [
          "예상 범위를 벗어난 파일 수정 시 중단",
          "빌드 실패 시 중단하고 보고",
        ],
      };

    case "medium":
      return {
        required: true,
        reason:
          "Medium 위험도 작업입니다. 실행 전 확인 후 진행하세요.",
        checklist: [
          "작업 목표가 명확한가?",
          "허용된 파일만 수정할 계획인가?",
          "완료 기준을 알고 있는가?",
        ],
        reviewAfterCompletion: false,
        stopConditions: [
          "승인되지 않은 파일 접근 시 중단",
        ],
      };

    case "low":
    case "safe":
      return {
        required: executionMode === "parallel_safe" ? false : false,
        reason:
          "Low 위험도 작업입니다. 확인 권장이지만 필수는 아닙니다.",
        checklist: [
          "작업 범위가 명확한가?",
        ],
        reviewAfterCompletion: false,
        stopConditions: [],
      };
  }
}
