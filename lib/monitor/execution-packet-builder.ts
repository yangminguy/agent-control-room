import { MonitorPacket } from "./types";
import { DispatchJob, AgentResult, ResultStatus } from "@/lib/types";

// Simple ID generator
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Phase Completion Packet Builder
 * 작업이 성공적으로 완료되었을 때 생성
 */
export function buildPhaseCompletionPacket(params: {
  dispatchJob: DispatchJob;
  result: AgentResult;
  checklist?: string[];
  verificationResults?: Record<string, boolean>;
  nextSteps?: string[];
}): MonitorPacket {
  const { dispatchJob, result, checklist = [], verificationResults = {}, nextSteps = [] } = params;

  const sections = [];

  sections.push({
    id: generateId(),
    title: "완료된 작업",
    level: 2 as const,
    body: `Task ID: \`${dispatchJob.taskId}\`\nDispatch Job: \`${dispatchJob.id}\``,
    format: "markdown" as const,
  });

  if (checklist.length > 0) {
    const checklistBody = checklist
      .map((item) => `- [x] ${item}`)
      .join("\n");
    sections.push({
      id: generateId(),
      title: "Acceptance Criteria",
      level: 2 as const,
      body: checklistBody,
      format: "checklist" as const,
    });
  }

  if (Object.keys(verificationResults).length > 0) {
    const verifyBody = Object.entries(verificationResults)
      .map(([check, passed]) => `- ${passed ? "✅" : "❌"} ${check}`)
      .join("\n");
    sections.push({
      id: generateId(),
      title: "Verification",
      level: 2 as const,
      body: verifyBody,
      format: "markdown" as const,
    });
  }

  if (nextSteps.length > 0) {
    const nextBody = nextSteps
      .map((step, i) => `${i + 1}. ${step}`)
      .join("\n");
    sections.push({
      id: generateId(),
      title: "다음 단계",
      level: 2 as const,
      body: nextBody,
      format: "markdown" as const,
    });
  }

  return {
    id: generateId(),
    kind: "phase-completion",
    title: `작업 완료: ${dispatchJob.taskId}`,
    description: `${dispatchJob.agentId}가 작업을 완료했습니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: { sections },
    executionContext: {
      planId: dispatchJob.planId,
      runId: dispatchJob.runId,
      taskId: dispatchJob.taskId,
      dispatchJobId: dispatchJob.id,
      agentId: dispatchJob.agentId,
      status: "completed",
      riskLevel: dispatchJob.riskLevel,
      source: "worker",
    },
  };
}

/**
 * Failure Packet Builder
 * 작업 실패 시 생성
 */
export function buildFailurePacket(params: {
  dispatchJob: DispatchJob;
  errorSummary: string;
  rootCause?: string;
  recommendations?: string[];
  recommendedNextAction?: "retry_same_agent" | "handoff_to_agent" | "manual_review" | "blocked";
}): MonitorPacket {
  const { dispatchJob, errorSummary, rootCause = "", recommendations = [], recommendedNextAction = "manual_review" } = params;

  const sections = [];

  sections.push({
    id: generateId(),
    title: "실패한 작업",
    level: 2 as const,
    body: `Task ID: \`${dispatchJob.taskId}\`\nDispatch Job: \`${dispatchJob.id}\`\nAgent: ${dispatchJob.agentId}`,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "오류 요약",
    level: 2 as const,
    body: errorSummary,
    format: "markdown" as const,
  });

  if (rootCause) {
    sections.push({
      id: generateId(),
      title: "근본 원인",
      level: 2 as const,
      body: rootCause,
      format: "markdown" as const,
    });
  }

  if (recommendations.length > 0) {
    const recBody = recommendations
      .map((rec, i) => `${i + 1}. ${rec}`)
      .join("\n");
    sections.push({
      id: generateId(),
      title: "권장 사항",
      level: 2 as const,
      body: recBody,
      format: "markdown" as const,
    });
  }

  sections.push({
    id: generateId(),
    title: "다음 행동",
    level: 2 as const,
    body: getNextActionDescription(recommendedNextAction),
    format: "markdown" as const,
  });

  return {
    id: generateId(),
    kind: "failure",
    title: `작업 실패: ${dispatchJob.taskId}`,
    description: `${dispatchJob.agentId}의 작업이 실패했습니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: { sections },
    executionContext: {
      planId: dispatchJob.planId,
      runId: dispatchJob.runId,
      taskId: dispatchJob.taskId,
      dispatchJobId: dispatchJob.id,
      agentId: dispatchJob.agentId,
      status: "failed",
      riskLevel: dispatchJob.riskLevel,
      recommendedNextAction,
      source: "worker",
    },
  };
}

/**
 * Drift Detection Packet Builder
 * 원래 의도와 실제 변화가 다를 때 생성
 */
export function buildDriftDetectionPacket(params: {
  dispatchJob: DispatchJob;
  originalDirection: string;
  actualChange: string;
  driftSummary: string;
  risk: "low" | "medium" | "high";
  shouldPauseAutomation?: boolean;
}): MonitorPacket {
  const { dispatchJob, originalDirection, actualChange, driftSummary, risk, shouldPauseAutomation = false } = params;

  const sections = [];

  sections.push({
    id: generateId(),
    title: "작업 정보",
    level: 2 as const,
    body: `Task ID: \`${dispatchJob.taskId}\`\nDispatch Job: \`${dispatchJob.id}\`\nAgent: ${dispatchJob.agentId}`,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "원래 방향",
    level: 2 as const,
    body: originalDirection,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "실제 변화",
    level: 2 as const,
    body: actualChange,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "드리프트 요약",
    level: 2 as const,
    body: driftSummary,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "위험도",
    level: 2 as const,
    body: `**${risk.toUpperCase()}**\n${shouldPauseAutomation ? "⚠️ 자동화 일시 중지 권장" : "✅ 자동화 계속 가능"}`,
    format: "markdown" as const,
  });

  return {
    id: generateId(),
    kind: "drift-detection",
    title: `드리프트 감지: ${dispatchJob.taskId}`,
    description: `${dispatchJob.agentId}의 실행이 원래 방향에서 벗어났습니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: { sections },
    executionContext: {
      planId: dispatchJob.planId,
      runId: dispatchJob.runId,
      taskId: dispatchJob.taskId,
      dispatchJobId: dispatchJob.id,
      agentId: dispatchJob.agentId,
      status: "drift_detected",
      riskLevel: risk,
      recommendedNextAction: shouldPauseAutomation ? "manual_review" : undefined,
      source: "worker",
    },
  };
}

/**
 * Approval Request Packet Builder
 * 승인이 필요할 때 생성
 */
export function buildApprovalRequestPacket(params: {
  dispatchJob: DispatchJob;
  requestedAction: string;
  riskLevel: string;
  whyApprovalNeeded: string;
  whatIfApproved?: string;
  whatIfRejected?: string;
}): MonitorPacket {
  const {
    dispatchJob,
    requestedAction,
    riskLevel,
    whyApprovalNeeded,
    whatIfApproved = "",
    whatIfRejected = "",
  } = params;

  const sections = [];

  sections.push({
    id: generateId(),
    title: "승인 요청",
    level: 2 as const,
    body: `Task ID: \`${dispatchJob.taskId}\`\nAction: ${requestedAction}`,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "위험 수준",
    level: 2 as const,
    body: `**${riskLevel}**`,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "왜 승인이 필요한가",
    level: 2 as const,
    body: whyApprovalNeeded,
    format: "markdown" as const,
  });

  if (whatIfApproved) {
    sections.push({
      id: generateId(),
      title: "승인 시 발생할 일",
      level: 2 as const,
      body: whatIfApproved,
      format: "markdown" as const,
    });
  }

  if (whatIfRejected) {
    sections.push({
      id: generateId(),
      title: "거절 시 발생할 일",
      level: 2 as const,
      body: whatIfRejected,
      format: "markdown" as const,
    });
  }

  return {
    id: generateId(),
    kind: "approval-request",
    title: `승인 요청: ${requestedAction}`,
    description: `${dispatchJob.agentId}의 작업이 승인을 대기 중입니다.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: { sections },
    executionContext: {
      planId: dispatchJob.planId,
      runId: dispatchJob.runId,
      taskId: dispatchJob.taskId,
      dispatchJobId: dispatchJob.id,
      agentId: dispatchJob.agentId,
      status: "waiting_approval",
      riskLevel,
      source: "execution",
    },
  };
}

/**
 * Re-orchestration Packet Builder
 * 실행 흐름을 다시 조정해야 할 때 생성
 */
export function buildReOrchestrationPacket(params: {
  trigger: string;
  currentRoadmapState: string;
  evidence: string[];
  driftOrFailureSummary: string;
  proposedNewPlan: string;
  agentRecommendation?: string;
  approvalNeeded?: boolean;
}): MonitorPacket {
  const {
    trigger,
    currentRoadmapState,
    evidence = [],
    driftOrFailureSummary,
    proposedNewPlan,
    agentRecommendation = "",
    approvalNeeded = true,
  } = params;

  const sections = [];

  sections.push({
    id: generateId(),
    title: "트리거",
    level: 2 as const,
    body: trigger,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "현재 로드맵 상태",
    level: 2 as const,
    body: currentRoadmapState,
    format: "markdown" as const,
  });

  if (evidence.length > 0) {
    const evidenceBody = evidence.map((e) => `- ${e}`).join("\n");
    sections.push({
      id: generateId(),
      title: "근거",
      level: 2 as const,
      body: evidenceBody,
      format: "markdown" as const,
    });
  }

  sections.push({
    id: generateId(),
    title: "드리프트/실패 요약",
    level: 2 as const,
    body: driftOrFailureSummary,
    format: "markdown" as const,
  });

  sections.push({
    id: generateId(),
    title: "제안된 새로운 계획",
    level: 2 as const,
    body: proposedNewPlan,
    format: "markdown" as const,
  });

  if (agentRecommendation) {
    sections.push({
      id: generateId(),
      title: "에이전트 추천",
      level: 2 as const,
      body: agentRecommendation,
      format: "markdown" as const,
    });
  }

  sections.push({
    id: generateId(),
    title: "다음 단계",
    level: 2 as const,
    body: approvalNeeded
      ? "🔒 사용자 승인 필요 (고위험 작업)"
      : "✅ 자동으로 진행 가능",
    format: "markdown" as const,
  });

  return {
    id: generateId(),
    kind: "re-orchestration",
    title: "재오케스트레이션 필요",
    description: "실행 계획을 재조정해야 합니다.",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: { sections },
    executionContext: {
      status: "reorchestration_needed",
      riskLevel: "high",
      recommendedNextAction: approvalNeeded ? "manual_review" : undefined,
      source: "worker",
    },
  };
}

/**
 * Helper: Get next action description
 */
function getNextActionDescription(
  action: "retry_same_agent" | "handoff_to_agent" | "manual_review" | "blocked"
): string {
  const descriptions: Record<string, string> = {
    retry_same_agent: "같은 에이전트로 재시도할 준비를 합니다.",
    handoff_to_agent: "다른 에이전트로 작업을 이관합니다.",
    manual_review: "수동으로 검토하고 판단해주세요.",
    blocked: "이 작업은 차단되었습니다. 관리자 개입이 필요합니다.",
  };
  return descriptions[action] || "다음 단계를 결정해주세요.";
}
