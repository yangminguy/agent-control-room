/**
 * Hermes Packet Builder
 *
 * Converts a HermesExecutionInput (produced by the local runner after a task
 * completes) into a typed supervision packet ready for UI display or export.
 *
 * Rules (Hermes safety):
 * - Does NOT execute any checks or shell commands.
 * - Does NOT modify code or files.
 * - Does NOT call external APIs.
 * - Does NOT make approval decisions or bypass approval gates — it only
 *   *reports* a classification and *recommends* a next action.
 * - Pure function: given the same input (and injected packetId/createdAt),
 *   it always returns the same packet. No Math.random / new Date inside the
 *   builder itself.
 */

import type {
  HermesExecutionInput,
  HermesPacket,
  PhaseSuccessPacket,
  PhaseFailurePacket,
  DriftDetectionPacket,
  HermesApprovalRequestPacket,
  DecisionClassification,
} from "@/lib/types";
import {
  classifyExecutionResult,
  DECISION_NEXT_ACTION_KO,
} from "@/lib/orchestration/decision-classifier";

// ── Determinism options ─────────────────────────────────────────────────────

/**
 * Optional injection point for the two intrinsically non-deterministic values.
 * Tests can supply fixed values to make buildHermesPacket fully deterministic.
 */
export type BuildHermesPacketOptions = {
  /** Returns the packet_id. Defaults to a random suffix generator. */
  packetIdGenerator?: (input: HermesExecutionInput) => string;
  /** ISO timestamp string for created_at. Defaults to new Date().toISOString(). */
  createdAt?: string;
};

// ── Helpers (pure) ───────────────────────────────────────────────────────────

/** Produces a short random suffix. Only used when no generator is injected. */
function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function defaultPacketId(input: HermesExecutionInput): string {
  return `hermes-${input.executionStatus}-${shortId()}`;
}

function truncate(text: string, maxChars = 200): string {
  return text.length <= maxChars ? text : text.slice(0, maxChars) + "…";
}

function countFailed(
  checks: Record<string, "pass" | "fail" | "skipped">,
): number {
  return Object.values(checks).filter((v) => v === "fail").length;
}

/** Derive a short PM-readable (Korean) sentence from the check results. */
function checksLineKo(
  checks: Record<string, "pass" | "fail" | "skipped">,
): string {
  const entries = Object.entries(checks);
  if (entries.length === 0) return "기록된 체크가 없습니다.";

  const failed = entries.filter(([, v]) => v === "fail").map(([k]) => k);
  const passed = entries.filter(([, v]) => v === "pass").length;

  if (failed.length === 0) return `${passed}개의 체크를 모두 통과했습니다.`;
  return `${failed.length}개의 체크가 실패했습니다: ${failed.join(", ")}.`;
}

/** Map the classifier's nextAction enum to a Korean sentence for the packet. */
function nextActionKo(decision: DecisionClassification): string {
  return DECISION_NEXT_ACTION_KO[decision.nextAction];
}

// ── Per-status builders (pure) ─────────────────────────────────────────────────

function buildSuccessPacket(
  input: HermesExecutionInput,
  decision: DecisionClassification,
  packetId: string,
  createdAt: string,
): PhaseSuccessPacket {
  const failedCount = countFailed(input.checksResult);
  const pmSummary = [
    `작업 '${input.taskId}'이(가) 성공적으로 완료되었습니다.`,
    `${input.changedFiles.length}개의 파일이 변경되었습니다.`,
    checksLineKo(input.checksResult),
  ].join(" ");

  const recommendedNextAction =
    failedCount > 0
      ? "다음 작업으로 진행하기 전에 실패한 체크를 검토하세요."
      : "다음 로드맵 작업으로 진행하세요.";

  return {
    packet_type: "phase_success_packet",
    source: "hermes",
    packet_id: packetId,
    task_id: input.taskId,
    phase_id: input.phaseId,
    plan_id: input.planId,
    assigned_agent: input.assignedAgent,
    execution_status: "success",
    log_summary: truncate(input.logSummary),
    changed_files: input.changedFiles,
    checks_result: input.checksResult,
    risk_level: input.riskLevel,
    pm_summary: pmSummary,
    recommended_next_action: recommendedNextAction,
    decision: decision.decision,
    decision_reason: decision.reason,
    confidence: decision.confidence,
    next_action: nextActionKo(decision),
    created_at: createdAt,
  };
}

function buildFailurePacket(
  input: HermesExecutionInput,
  decision: DecisionClassification,
  packetId: string,
  createdAt: string,
): PhaseFailurePacket {
  const reason = input.failureReason ?? "알 수 없는 실패 — 로그를 확인하세요.";
  const pmSummary = [
    `작업 '${input.taskId}'이(가) 실패했습니다. 오류: ${reason}`,
    checksLineKo(input.checksResult),
  ].join(" ");

  const recommendedNextAction =
    input.riskLevel === "critical" || input.riskLevel === "high"
      ? "실행을 중단하고 재시도 전에 사용자 검토를 요청하세요."
      : "로그를 확인하고 문제를 수정한 뒤 작업을 재시도하세요.";

  return {
    packet_type: "phase_failure_packet",
    source: "hermes",
    packet_id: packetId,
    task_id: input.taskId,
    phase_id: input.phaseId,
    plan_id: input.planId,
    assigned_agent: input.assignedAgent,
    execution_status: "failure",
    log_summary: truncate(input.logSummary),
    changed_files: input.changedFiles,
    checks_result: input.checksResult,
    failure_reason: reason,
    risk_level: input.riskLevel,
    pm_summary: pmSummary,
    recommended_next_action: recommendedNextAction,
    decision: decision.decision,
    decision_reason: decision.reason,
    confidence: decision.confidence,
    next_action: nextActionKo(decision),
    created_at: createdAt,
  };
}

function buildDriftPacket(
  input: HermesExecutionInput,
  decision: DecisionClassification,
  packetId: string,
  createdAt: string,
): DriftDetectionPacket {
  const driftFiles = input.driftFiles ?? [];
  const driftFilesText =
    driftFiles.slice(0, 5).join(", ") + (driftFiles.length > 5 ? " 외" : "");
  const pmSummary = [
    `파일 경계 위반이 감지되었습니다: ${driftFilesText}. 수동 검토가 필요합니다.`,
    checksLineKo(input.checksResult),
  ].join(" ");

  const recommendedNextAction =
    "예상치 못한 파일 변경을 검토하고 안전한지 확인한 뒤, 허용 파일 목록을 갱신하거나 롤백하세요.";

  return {
    packet_type: "drift_detection_packet",
    source: "hermes",
    packet_id: packetId,
    task_id: input.taskId,
    phase_id: input.phaseId,
    plan_id: input.planId,
    assigned_agent: input.assignedAgent,
    execution_status: "drift",
    log_summary: truncate(input.logSummary),
    changed_files: input.changedFiles,
    drift_files: driftFiles,
    checks_result: input.checksResult,
    risk_level: input.riskLevel,
    pm_summary: pmSummary,
    recommended_next_action: recommendedNextAction,
    decision: decision.decision,
    decision_reason: decision.reason,
    confidence: decision.confidence,
    next_action: nextActionKo(decision),
    created_at: createdAt,
  };
}

function buildApprovalRequestPacket(
  input: HermesExecutionInput,
  decision: DecisionClassification,
  packetId: string,
  createdAt: string,
): HermesApprovalRequestPacket {
  const reason =
    input.approvalReason ?? "위험도가 높아 명시적 사용자 승인이 필요합니다.";
  const pmSummary = [
    `작업 '${input.taskId}'을(를) 진행하기 위해 사용자 승인이 필요합니다.`,
    `사유: ${reason}`,
    `위험도: ${input.riskLevel}.`,
  ].join(" ");

  const recommendedNextAction =
    "작업 세부 내용을 검토한 뒤 계속하려면 승인하고, 이 단계를 멈추려면 거부하세요.";

  return {
    packet_type: "approval_request_packet",
    source: "hermes",
    packet_id: packetId,
    task_id: input.taskId,
    phase_id: input.phaseId,
    plan_id: input.planId,
    assigned_agent: input.assignedAgent,
    execution_status: "needs_approval",
    log_summary: truncate(input.logSummary),
    changed_files: input.changedFiles,
    checks_result: input.checksResult,
    approval_reason: reason,
    risk_level: input.riskLevel,
    pm_summary: pmSummary,
    recommended_next_action: recommendedNextAction,
    decision: decision.decision,
    decision_reason: decision.reason,
    confidence: decision.confidence,
    next_action: nextActionKo(decision),
    created_at: createdAt,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Build the appropriate Hermes supervision packet from a HermesExecutionInput.
 *
 * The packet type is determined exclusively by `input.executionStatus`:
 * - "success"        → PhaseSuccessPacket
 * - "failure"        → PhaseFailurePacket
 * - "drift"          → DriftDetectionPacket
 * - "needs_approval" → HermesApprovalRequestPacket
 *
 * The decision/decision_reason/confidence/next_action fields are populated by
 * the rule-based classifyExecutionResult — Hermes only reports the
 * classification, it never acts on it.
 *
 * Pure function: pass `options.packetIdGenerator` and `options.createdAt` to
 * make the result fully deterministic (e.g. in tests).
 */
export function buildHermesPacket(
  input: HermesExecutionInput,
  options: BuildHermesPacketOptions = {},
): HermesPacket {
  const packetId = (options.packetIdGenerator ?? defaultPacketId)(input);
  const createdAt = options.createdAt ?? new Date().toISOString();

  const decision = classifyExecutionResult(input);

  if (input.executionStatus === "success") {
    return buildSuccessPacket(input, decision, packetId, createdAt);
  }
  if (input.executionStatus === "failure") {
    return buildFailurePacket(input, decision, packetId, createdAt);
  }
  if (input.executionStatus === "drift") {
    return buildDriftPacket(input, decision, packetId, createdAt);
  }
  return buildApprovalRequestPacket(input, decision, packetId, createdAt);
}
