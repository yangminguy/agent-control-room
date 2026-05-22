/**
 * Orchestration Packet Generator
 * Generates OrchestrationPacket and PhaseCompletePacket for Hermes
 * Document section 8 implementation
 */

import {
  OrchestrationPacket,
  PhaseCompletePacket,
  DispatchJob,
  AgentResult,
  RiskLevel,
  AgentType,
} from "@/lib/types";

export function generateOrchestrationPacket(
  jobId: string,
  phaseId: string,
  phaseTitle: string,
  sourceAgent: AgentType,
  result: AgentResult,
  riskLevel: RiskLevel,
  changedFiles: string[] = [],
  affectedFiles: string[] = []
): OrchestrationPacket {
  const isFailed = result.resultStatus === "blocked" || result.resultStatus === "safety_violation";
  const isPartial = result.resultStatus === "minor_fix" || result.resultStatus === "qa_needed";

  const status = isFailed
    ? "failed"
    : isPartial
      ? "partial"
      : result.resultStatus === "pass"
        ? "completed"
        : "needs_approval";

  return {
    packet_type: "orchestration_packet",
    source: "hermes",
    packet_id: `packet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    phase_id: phaseId,
    phase_title: phaseTitle,
    status,
    source_agent: sourceAgent,
    task_summary: `Task ID: ${result.taskId}`,
    result_summary: result.extractedSummary || "작업 완료됨",
    changed_files: changedFiles,
    affected_files: affectedFiles,
    failure_summary:
      isFailed && result.resultStatus === "blocked"
        ? "작업이 차단되었습니다"
        : isFailed && result.resultStatus === "safety_violation"
          ? "보안 위반이 감지되었습니다"
          : undefined,
    suspected_cause: isFailed ? "에이전트 실행 중 오류 발생" : undefined,
    risk_level: riskLevel,
    conflict_risk: "low",
    suggested_next_agent_type:
      status === "failed" ? "codex" : status === "partial" ? "claude-code" : undefined,
    suggested_next_action:
      status === "failed"
        ? "QA 및 버그 수정 필요"
        : status === "partial"
          ? "추가 구현 필요"
          : "다음 Phase로 진행",
    do_not_touch_files: [
      "runner/",
      "lib/approval-token-store.ts",
      "package.json",
      ".env",
      "auth/",
    ],
    required_context: [phaseId, "에이전트 역할 정책", "Phase 완료 기준"],
    suggested_prompt: `Phase ${phaseId}을(를) 검토하고 필요한 조치를 취해주세요.`,
    user_approval_needed: status === "failed" || status === "needs_approval",
    telegram_notification_needed:
      status === "failed" || status === "needs_approval" || riskLevel === "high",
    obsidian_note_path: `AgentControlRoom/Phases/${phaseId}.md`,
    insight_tags: [phaseId, sourceAgent, status],
    created_at: new Date().toISOString(),
  };
}

export function generatePhaseCompletePacket(
  phaseId: string,
  phaseNumber: number,
  phaseTitle: string,
  ownerAgent: AgentType,
  completionPercentage: number,
  completedTasks: string[] = [],
  blockedTasks: string[] = [],
  partialTasks: string[] = [],
  changedFiles: string[] = [],
  validationState: Record<string, string> = {}
): PhaseCompletePacket {
  const status =
    completionPercentage === 100
      ? "completed"
      : completionPercentage > 50
        ? "partial"
        : "failed";

  const lessonLearned: string[] = [];
  if (blockedTasks.length > 0) {
    lessonLearned.push(`${blockedTasks.length}개 작업이 차단됨 - 원인 분석 필요`);
  }
  if (partialTasks.length > 0) {
    lessonLearned.push(`${partialTasks.length}개 작업 부분 완료 - 추가 작업 필요`);
  }

  return {
    packet_type: "phase_complete_packet",
    source: "hermes",
    packet_id: `phase-packet-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    phase_id: phaseId,
    phase_title: phaseTitle,
    phase_number: phaseNumber,
    status,
    completion_percentage: completionPercentage,
    owner_agent: ownerAgent,
    completion_summary: `Phase ${phaseNumber}: ${phaseTitle} - ${completionPercentage}% 완료`,
    completed_tasks: completedTasks,
    blocked_tasks: blockedTasks,
    partial_tasks: partialTasks,
    validation_state: {
      typecheck: validationState.typecheck || "pending",
      lint: validationState.lint || "pending",
      build: validationState.build || "pending",
      tests: validationState.tests || "pending",
      ...validationState,
    },
    changed_files: changedFiles,
    file_summary: `총 ${changedFiles.length}개 파일 변경됨`,
    risk_level: "low" as RiskLevel,
    safety_concerns: blockedTasks.length > 0 ? ["차단된 작업 재검토 필요"] : [],
    next_phase_recommendation:
      status === "completed"
        ? {
            phase_id: `phase-${phaseNumber + 1}`,
            phase_title: `Phase ${phaseNumber + 1}`,
            agent_recommendation: ownerAgent,
            context_needed: [phaseId, "이전 Phase 결과"],
          }
        : undefined,
    obsidian_note_path: `AgentControlRoom/Phases/${phaseId}-complete.md`,
    lessons_learned: lessonLearned,
    recommendations:
      status !== "completed"
        ? ["차단된 작업 해결", "부분 완료 작업 마무리", "다음 Phase 진행 판단"]
        : ["다음 Phase 준비", "결과 검증"],
    completed_at: new Date().toISOString(),
  };
}

export function renderOrchestrationPacketMarkdown(
  packet: OrchestrationPacket
): string {
  return `
# Orchestration Packet

**Source**: Hermes
**Phase**: ${packet.phase_title} (\`${packet.phase_id}\`)
**Status**: ${packet.status.toUpperCase()}
**Risk Level**: ${packet.risk_level}

## Summary

${packet.task_summary}

${packet.result_summary}

## Changed Files

${packet.changed_files.length > 0 ? packet.changed_files.map((f) => `- ${f}`).join("\n") : "No files changed"}

## Assessment

- **Conflict Risk**: ${packet.conflict_risk}
- **User Approval Needed**: ${packet.user_approval_needed ? "Yes" : "No"}
- **Telegram Notification**: ${packet.telegram_notification_needed ? "Yes" : "No"}

## Next Steps

${packet.suggested_next_action || "TBD"}

**Recommended Agent**: ${packet.suggested_next_agent_type || "TBD"}

## Context

${packet.required_context.map((c) => `- ${c}`).join("\n")}

## Do Not Touch

${packet.do_not_touch_files.map((f) => `- ${f}`).join("\n")}
  `.trim();
}

export function renderPhaseCompletePacketMarkdown(
  packet: PhaseCompletePacket
): string {
  return `
# Phase ${packet.phase_number} Complete: ${packet.phase_title}

**Status**: ${packet.status.toUpperCase()}
**Completion**: ${packet.completion_percentage}%
**Agent**: ${packet.owner_agent}

## Summary

${packet.completion_summary}

## Completed Tasks

${packet.completed_tasks.length > 0 ? packet.completed_tasks.map((t) => `- ✅ ${t}`).join("\n") : "None"}

## Blocked Tasks

${packet.blocked_tasks && packet.blocked_tasks.length > 0 ? packet.blocked_tasks.map((t) => `- ❌ ${t}`).join("\n") : "None"}

## Partial Tasks

${packet.partial_tasks && packet.partial_tasks.length > 0 ? packet.partial_tasks.map((t) => `- ⚠️ ${t}`).join("\n") : "None"}

## Validation

${
  Object.entries(packet.validation_state)
    .map(([key, value]) => `- ${key}: ${value}`)
    .join("\n")
}

## Changed Files

${packet.changed_files.map((f) => `- ${f}`).join("\n")}

## Lessons Learned

${packet.lessons_learned && packet.lessons_learned.length > 0 ? packet.lessons_learned.map((l) => `- ${l}`).join("\n") : "None"}

## Recommendations

${packet.recommendations && packet.recommendations.length > 0 ? packet.recommendations.map((r) => `- ${r}`).join("\n") : "None"}

${
  packet.next_phase_recommendation
    ? `
## Next Phase

**ID**: ${packet.next_phase_recommendation.phase_id}
**Title**: ${packet.next_phase_recommendation.phase_title}
**Recommended Agent**: ${packet.next_phase_recommendation.agent_recommendation}
`
    : ""
}
  `.trim();
}
