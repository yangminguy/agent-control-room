/**
 * Prompt Boundary Builder
 * Phase 40: Full Orchestration Layer
 *
 * OrchestrationDecision 결과를 반영한 구조화된 에이전트 프롬프트를 생성한다.
 * Senior Dev Prompt Compiler와 연동 가능.
 */

import type { OrchestrationDecision } from "./types";

const EXECUTION_MODE_LABELS: Record<OrchestrationDecision["executionMode"], string> = {
  single_agent: "단일 에이전트 (Single Agent)",
  sequential_multi_agent: "순차 다중 에이전트 (Sequential Multi-Agent)",
  parallel_safe: "병렬 안전 모드 (Parallel Safe)",
  token_relay: "토큰 릴레이 (Token Relay)",
  manual_handoff: "수동 인수인계 (Manual Handoff)",
  workbench_handoff: "워크벤치 연결 (Workbench Handoff)",
  blocked_user_decision: "사용자 결정 필요 (Blocked - User Decision Required)",
};

const RISK_LABELS: Record<OrchestrationDecision["riskLevel"], string> = {
  safe: "안전 (Safe)",
  low: "낮음 (Low)",
  medium: "중간 (Medium)",
  high: "높음 (High)",
  critical: "위험 (Critical)",
};

export function buildPromptWithBoundary(
  decision: OrchestrationDecision,
  taskDescription: string
): string {
  const lines: string[] = [
    `# Task: ${decision.title}`,
    ``,
    `## Goal`,
    ``,
    taskDescription,
    ``,
    `## Current Context`,
    ``,
    decision.summary,
    ``,
    `## Orchestration Decision`,
    ``,
    `| 항목 | 값 |`,
    `|---|---|`,
    `| 위험도 | ${RISK_LABELS[decision.riskLevel]} |`,
    `| 실행 방식 | ${EXECUTION_MODE_LABELS[decision.executionMode]} |`,
    `| 주 에이전트 | ${decision.primaryAgent} |`,
    `| 보조 에이전트 | ${decision.secondaryAgent ?? "없음"} |`,
    `| 병렬 실행 | ${decision.parallelAllowed ? "가능" : "불가"} |`,
    `| 승인 필요 | ${decision.approvalGate.required ? "필요" : "불필요"} |`,
    ``,
  ];

  if (decision.parallelBlockReason) {
    lines.push(`> 병렬 불가 이유: ${decision.parallelBlockReason}`);
    lines.push(``);
  }

  lines.push(`## Execution Boundary`);
  lines.push(``);

  if (decision.fileBoundary.filesToInspect.length > 0) {
    lines.push(`### 먼저 확인해야 할 파일`);
    decision.fileBoundary.filesToInspect.forEach((f) => lines.push(`- \`${f}\``));
    lines.push(``);
  }

  if (decision.fileBoundary.filesAllowedToEdit.length > 0) {
    lines.push(`### 수정 가능한 파일`);
    decision.fileBoundary.filesAllowedToEdit.forEach((f) => lines.push(`- \`${f}\``));
    lines.push(``);
  }

  if (decision.fileBoundary.filesBlockedFromEditing.length > 0) {
    lines.push(`### 수정 금지 파일 ⛔`);
    decision.fileBoundary.filesBlockedFromEditing.forEach((f) =>
      lines.push(`- \`${f}\` (절대 수정 금지)`)
    );
    lines.push(``);
  }

  if (decision.fileBoundary.commandsAllowed.length > 0) {
    lines.push(`### 실행 가능한 명령어`);
    decision.fileBoundary.commandsAllowed.forEach((c) => lines.push(`- \`${c}\``));
    lines.push(``);
  }

  if (decision.fileBoundary.commandsBlocked.length > 0) {
    lines.push(`### 실행 금지 명령어 ⛔`);
    decision.fileBoundary.commandsBlocked.forEach((c) =>
      lines.push(`- \`${c}\` (실행 금지)`)
    );
    lines.push(``);
  }

  if (decision.fileBoundary.doNotDoRules.length > 0) {
    lines.push(`## Do-Not-Do 규칙`);
    decision.fileBoundary.doNotDoRules.forEach((r) => lines.push(`- ❌ ${r}`));
    lines.push(``);
  }

  lines.push(`## Acceptance Criteria`);
  lines.push(``);
  lines.push(`- [ ] 지정된 파일만 수정했다.`);
  lines.push(`- [ ] 금지된 명령어를 실행하지 않았다.`);
  lines.push(`- [ ] 빌드/타입체크가 통과한다.`);
  lines.push(`- [ ] 테스트가 통과한다.`);
  lines.push(``);

  lines.push(`## Verification Commands`);
  lines.push(``);
  lines.push("```bash");
  lines.push("npm run typecheck");
  lines.push("npm run lint");
  lines.push("npm run test");
  lines.push("npm run build");
  lines.push("```");
  lines.push(``);

  if (decision.approvalGate.required && decision.approvalGate.checklist.length > 0) {
    lines.push(`## Approval Checklist`);
    lines.push(``);
    decision.approvalGate.checklist.forEach((c) => lines.push(`- [ ] ${c}`));
    lines.push(``);
  }

  lines.push(`## Completion Report Format`);
  lines.push(``);
  lines.push("완료 후 아래 형식으로 보고하세요:");
  lines.push(``);
  lines.push("```");
  lines.push("## 변경된 파일");
  lines.push("## 완료된 작업");
  lines.push("## 완료되지 않은 작업");
  lines.push("## 에러/차단 요소");
  lines.push("## 실행한 테스트");
  lines.push("## 권장 다음 액션");
  lines.push("```");
  lines.push(``);

  if (decision.reasoning.length > 0) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 판단 근거 (Orchestration Reasoning)`);
    decision.reasoning.forEach((r) => lines.push(`- ${r}`));
    lines.push(``);
  }

  return lines.join("\n");
}
