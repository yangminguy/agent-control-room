/**
 * decision-classifier.ts
 * Phase E Task 3 — Execution Result Decision Classification
 *
 * 역할: HermesExecutionInput을 받아 DecisionClassification을 반환한다.
 * 규칙 기반 분류기 — LLM 없음, 가짜 데이터 없음.
 *
 * 분류 우선순위 (높은 것이 먼저 적용):
 *   1. 데이터 누락           → manual_review
 *   2. boundary_violation    → blocked (파일 경계 위반은 항상 차단)
 *   3. doNotTouchFiles 위반  → blocked
 *   4. allowedFiles 밖 변경  → drift_detected
 *   5. exitCode 비정상 + 에러 → fail 또는 retry_needed
 *   6. 체크 실패             → qa_needed
 *   7. 변경 없음 (변경 예상)  → manual_review
 *   8. 전부 통과             → pass
 */

import type { DecisionClassification, DecisionLabel, HermesExecutionInput } from "@/lib/types";

// ─────────────────────────────────────────────────────────
// 내부 헬퍼
// ─────────────────────────────────────────────────────────

/** 파일 경로가 패턴 목록 중 하나와 일치하는지 확인한다. */
function matchesAnyPattern(filePath: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    // 정확한 경로 일치
    if (filePath === pattern) return true;
    // 와일드카드 glob (단순: * 를 포함하는 경우 prefix/suffix 비교)
    if (pattern.endsWith("/*")) {
      const prefix = pattern.slice(0, -2);
      if (filePath.startsWith(prefix + "/") || filePath === prefix) return true;
    }
    if (pattern.endsWith("/**")) {
      const prefix = pattern.slice(0, -3);
      if (filePath.startsWith(prefix + "/") || filePath === prefix) return true;
    }
    if (pattern.startsWith("**/")) {
      const suffix = pattern.slice(3);
      if (filePath.endsWith("/" + suffix) || filePath === suffix) return true;
    }
    // 와일드카드 없이 접두사 포함 여부
    if (!pattern.includes("*") && filePath.includes(pattern)) return true;
  }
  return false;
}

/**
 * checksResult에서 특정 체크 이름의 결과를 가져온다.
 * 여러 가능한 키 이름을 시도한다 (e.g. "typecheck" | "type-check" | "tsc").
 */
function getCheckResult(
  checksResult: Record<string, "pass" | "fail" | "skipped">,
  aliases: string[]
): "pass" | "fail" | "skipped" | null {
  for (const alias of aliases) {
    const value = checksResult[alias];
    if (value !== undefined) return value;
  }
  return null;
}

/** 재시도 가능한 오류 패턴 (일시적 실패) */
const RETRYABLE_ERROR_PATTERNS = [
  "rate limit",
  "timeout",
  "connection refused",
  "network error",
  "econnreset",
  "enotfound",
  "socket hang up",
  "temporarily unavailable",
];

function isRetryableError(errorMessages: string[]): boolean {
  const combined = errorMessages.join(" ").toLowerCase();
  return RETRYABLE_ERROR_PATTERNS.some((pattern) => combined.includes(pattern));
}

// ─────────────────────────────────────────────────────────
// 핵심 분류 함수
// ─────────────────────────────────────────────────────────

/**
 * HermesExecutionInput을 받아 DecisionClassification을 반환한다.
 *
 * 데이터가 누락되거나 불완전한 경우 "blocked" 또는 "manual_review"를 반환한다.
 * 절대 추측하거나 가짜 데이터를 사용하지 않는다.
 */
export function classifyExecutionResult(
  summary: HermesExecutionInput
): DecisionClassification {
  // ── 규칙 1: 필수 데이터 누락 ────────────────────────────
  if (!summary) {
    return {
      decision: "blocked",
      reason: "실행 결과 데이터가 전달되지 않았습니다. 에이전트 출력을 확인하세요.",
      confidence: 100,
      nextAction: "halt_and_notify",
    };
  }

  const {
    executionStatus,
    exitCode,
    errorMessages = [],
    changedFiles = [],
    allowedFiles = [],
    doNotTouchFiles = [],
    changesExpected = false,
    checksResult = {},
    driftFiles = [],
    failureReason,
  } = summary;

  // executionStatus가 없으면 분류 불가
  if (!executionStatus) {
    return {
      decision: "manual_review",
      reason: "실행 상태(executionStatus)가 누락되어 자동 판정을 내릴 수 없습니다. 수동 확인이 필요합니다.",
      confidence: 95,
      nextAction: "request_manual_review",
    };
  }

  // ── 규칙 2: boundary_violation 상태 (파일 경계 위반) ─────
  // 러너가 파일 경계 위반을 감지하면 exitCode가 0이어도 절대 통과시키지 않는다.
  // 안전 규칙: 경계 위반은 항상 차단(blocked)되어야 한다.
  if (executionStatus === "boundary_violation") {
    return {
      decision: "blocked",
      reason: "파일 경계 위반이 감지되었습니다. 수동 검토가 필요합니다.",
      confidence: 100,
      nextAction: "halt_and_notify",
    };
  }

  // ── 규칙 3: doNotTouchFiles 위반 검사 ───────────────────
  if (doNotTouchFiles.length > 0 && changedFiles.length > 0) {
    const violations = changedFiles.filter((file) =>
      matchesAnyPattern(file, doNotTouchFiles)
    );
    if (violations.length > 0) {
      return {
        decision: "blocked",
        reason: `절대 수정 금지 파일이 변경되었습니다: ${violations.join(", ")}. 즉시 검토 후 복구가 필요합니다.`,
        confidence: 100,
        nextAction: "halt_and_notify",
      };
    }
  }

  // ── 규칙 3: allowedFiles 범위 이탈 (drift) ──────────────
  // driftFiles가 명시적으로 있으면 우선 사용
  const effectiveDrift = driftFiles.length > 0
    ? driftFiles
    : allowedFiles.length > 0 && changedFiles.length > 0
      ? changedFiles.filter((file) => !matchesAnyPattern(file, allowedFiles))
      : [];

  if (effectiveDrift.length > 0) {
    return {
      decision: "drift_detected",
      reason: `허용 범위를 벗어난 파일 변경이 감지되었습니다: ${effectiveDrift.join(", ")}. 허용 파일 목록(allowedFiles)과 비교하여 의도된 변경인지 확인하세요.`,
      confidence: 95,
      nextAction: "request_user_approval",
    };
  }

  // ── 규칙 4: exitCode 비정상 ──────────────────────────────
  // exitCode가 null이면 데이터 누락이므로 executionStatus로 보완
  const hasExplicitFailure =
    executionStatus === "failure" ||
    (exitCode !== null && exitCode !== undefined && exitCode !== 0);

  if (hasExplicitFailure) {
    // 재시도 가능한 일시적 오류인지 판단
    if (isRetryableError(errorMessages)) {
      return {
        decision: "retry_needed",
        reason: `일시적 오류가 감지되었습니다 (${errorMessages[0] ?? "상세 불명"}). 동일 에이전트로 재시도를 권장합니다.`,
        confidence: 80,
        nextAction: "retry_same_agent",
      };
    }

    const failDetail = failureReason ?? errorMessages[0] ?? "상세 오류 없음";
    return {
      decision: "fail",
      reason: `에이전트 실행이 비정상 종료되었습니다. 원인: ${failDetail}. 오류 로그를 확인하고 수동으로 대응하세요.`,
      confidence: 90,
      nextAction: "halt_and_notify",
    };
  }

  // ── 규칙 5: 체크 실패 (typecheck / lint / test / build) ──
  const typecheckResult = getCheckResult(checksResult, ["typecheck", "type-check", "tsc"]);
  const lintResult = getCheckResult(checksResult, ["lint", "eslint"]);
  const testResult = getCheckResult(checksResult, ["test", "tests", "jest", "vitest"]);
  const buildResult = getCheckResult(checksResult, ["build", "compile"]);

  const failedChecks: string[] = [];
  if (typecheckResult === "fail") failedChecks.push("타입 검사(typecheck)");
  if (lintResult === "fail") failedChecks.push("린트(lint)");
  if (testResult === "fail") failedChecks.push("테스트(test)");
  if (buildResult === "fail") failedChecks.push("빌드(build)");

  if (failedChecks.length > 0) {
    return {
      decision: "qa_needed",
      reason: `실행은 완료됐지만 다음 체크가 실패했습니다: ${failedChecks.join(", ")}. QA 에이전트가 해당 항목을 수정해야 합니다.`,
      confidence: 95,
      nextAction: "run_qa_agent",
    };
  }

  // ── 규칙 6: 변경 없음 (변경이 예상된 경우) ───────────────
  if (changesExpected && changedFiles.length === 0) {
    return {
      decision: "manual_review",
      reason: "변경이 예상되었으나 수정된 파일이 없습니다. 에이전트가 실제로 작업을 수행했는지 확인이 필요합니다.",
      confidence: 85,
      nextAction: "request_manual_review",
    };
  }

  // ── 규칙 7: needs_approval 상태 ────────────────────────
  if (executionStatus === "needs_approval") {
    const approvalDetail = summary.approvalReason ?? "상세 승인 사유 없음";
    return {
      decision: "blocked",
      reason: `에이전트가 사용자 승인을 요청했습니다. 사유: ${approvalDetail}`,
      confidence: 90,
      nextAction: "request_user_approval",
    };
  }

  // ── 규칙 8: 전부 통과 ────────────────────────────────────
  return {
    decision: "pass",
    reason: "종료 코드 정상, 경계 위반 없음, 모든 체크 통과. 다음 태스크로 진행할 수 있습니다.",
    confidence: 95,
    nextAction: "proceed_to_next_task",
  };
}

// ─────────────────────────────────────────────────────────
// 한국어 레이블 매핑 (UI 표시용)
// ─────────────────────────────────────────────────────────

export const DECISION_LABEL_KO: Record<DecisionLabel, string> = {
  pass: "통과",
  fail: "실패",
  qa_needed: "QA 필요",
  retry_needed: "재시도 권장",
  blocked: "차단됨",
  drift_detected: "범위 이탈 감지",
  manual_review: "수동 확인 필요",
};

export const DECISION_NEXT_ACTION_KO: Record<
  DecisionClassification["nextAction"],
  string
> = {
  proceed_to_next_task: "다음 태스크 진행",
  run_qa_agent: "QA 에이전트 실행",
  retry_same_agent: "동일 에이전트 재시도",
  request_user_approval: "사용자 승인 요청",
  halt_and_notify: "실행 중단 및 알림",
  request_manual_review: "수동 검토 요청",
};
