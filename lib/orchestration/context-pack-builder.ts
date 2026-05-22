/**
 * Context Pack Builder
 * Phase 40: Full Orchestration Layer
 *
 * 에이전트 간 인수인계용 Context Pack을 구조화된 타입으로 빌드하고
 * Markdown 및 relay prompt로 렌더링한다.
 */

import { nanoid } from "nanoid";
import type { ContextPack, ContextPackBuilderInput } from "./types";

export function buildContextPack(input: ContextPackBuilderInput): ContextPack {
  return {
    id: nanoid(),
    title: input.title,
    goal: input.goal,
    completedWork: input.completedWork ?? [],
    changedFiles: input.changedFiles ?? [],
    currentState: input.currentState ?? "작업 진행 중",
    keyDecisions: input.keyDecisions ?? [],
    importantConstraints: input.importantConstraints ?? [],
    currentBlockers: input.currentBlockers ?? [],
    remainingWork: input.remainingWork ?? [],
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    filesAllowedToEdit: input.filesAllowedToEdit ?? [],
    filesBlockedFromEditing: input.filesBlockedFromEditing ?? [],
    doNotDoRules: input.doNotDoRules ?? [],
    nextPrompt: input.nextPrompt ?? "",
    requestedAgent: input.requestedAgent,
    reasonForRelay: input.reasonForRelay,
    sessionHistory: input.sessionHistory ?? [],
    createdAt: new Date().toISOString(),
  };
}

export function renderContextPackMarkdown(pack: ContextPack): string {
  const lines: string[] = [
    `# Context Pack: ${pack.title}`,
    ``,
    `> 생성: ${pack.createdAt}  `,
    `> 요청 에이전트: **${pack.requestedAgent}**  `,
    `> 전달 이유: ${pack.reasonForRelay}`,
    ``,
    `---`,
    ``,
    `## 목표 (Goal)`,
    pack.goal,
    ``,
  ];

  if (pack.completedWork.length > 0) {
    lines.push(`## 완료된 작업`);
    pack.completedWork.forEach((w) => lines.push(`- ${w}`));
    lines.push(``);
  }

  if (pack.changedFiles.length > 0) {
    lines.push(`## 변경된 파일`);
    pack.changedFiles.forEach((f) => lines.push(`- \`${f}\``));
    lines.push(``);
  }

  lines.push(`## 현재 상태`);
  lines.push(pack.currentState);
  lines.push(``);

  if (pack.keyDecisions.length > 0) {
    lines.push(`## 주요 결정 사항`);
    pack.keyDecisions.forEach((d) => lines.push(`- ${d}`));
    lines.push(``);
  }

  if (pack.importantConstraints.length > 0) {
    lines.push(`## 중요 제약 조건`);
    pack.importantConstraints.forEach((c) => lines.push(`- ${c}`));
    lines.push(``);
  }

  if (pack.currentBlockers.length > 0) {
    lines.push(`## 현재 차단 요소`);
    pack.currentBlockers.forEach((b) => lines.push(`- ${b}`));
    lines.push(``);
  }

  if (pack.remainingWork.length > 0) {
    lines.push(`## 남은 작업`);
    pack.remainingWork.forEach((w) => lines.push(`- ${w}`));
    lines.push(``);
  }

  if (pack.acceptanceCriteria.length > 0) {
    lines.push(`## 완료 기준 (Acceptance Criteria)`);
    pack.acceptanceCriteria.forEach((c) => lines.push(`- [ ] ${c}`));
    lines.push(``);
  }

  lines.push(`## 실행 경계`);

  if (pack.filesAllowedToEdit.length > 0) {
    lines.push(`### 수정 가능한 파일`);
    pack.filesAllowedToEdit.forEach((f) => lines.push(`- \`${f}\``));
    lines.push(``);
  }

  if (pack.filesBlockedFromEditing.length > 0) {
    lines.push(`### 수정 금지 파일`);
    pack.filesBlockedFromEditing.forEach((f) => lines.push(`- \`${f}\` ⛔`));
    lines.push(``);
  }

  if (pack.doNotDoRules.length > 0) {
    lines.push(`### Do-Not-Do 규칙`);
    pack.doNotDoRules.forEach((r) => lines.push(`- ❌ ${r}`));
    lines.push(``);
  }

  if (pack.sessionHistory.length > 0) {
    lines.push(`## 세션 히스토리`);
    pack.sessionHistory.forEach((h) => lines.push(`- ${h}`));
    lines.push(``);
  }

  if (pack.nextPrompt) {
    lines.push(`---`);
    lines.push(``);
    lines.push(`## 다음 에이전트에게 줄 프롬프트`);
    lines.push(``);
    lines.push("```");
    lines.push(pack.nextPrompt);
    lines.push("```");
    lines.push(``);
  }

  return lines.join("\n");
}

export function buildRelayPrompt(pack: ContextPack): string {
  const lines: string[] = [
    `# 인수인계 작업 요청`,
    ``,
    `이전 에이전트로부터 Context Pack을 받았습니다. 아래 내용을 읽고 작업을 이어받으세요.`,
    ``,
    `## 전달 이유`,
    pack.reasonForRelay,
    ``,
    `## 목표`,
    pack.goal,
    ``,
  ];

  if (pack.remainingWork.length > 0) {
    lines.push(`## 남은 작업`);
    pack.remainingWork.forEach((w) => lines.push(`- ${w}`));
    lines.push(``);
  }

  if (pack.filesAllowedToEdit.length > 0) {
    lines.push(`## 수정 가능한 파일`);
    pack.filesAllowedToEdit.forEach((f) => lines.push(`- \`${f}\``));
    lines.push(``);
  }

  if (pack.filesBlockedFromEditing.length > 0) {
    lines.push(`## 수정 금지 파일`);
    pack.filesBlockedFromEditing.forEach((f) => lines.push(`- \`${f}\` (절대 수정 금지)`));
    lines.push(``);
  }

  if (pack.doNotDoRules.length > 0) {
    lines.push(`## 절대 하지 말 것`);
    pack.doNotDoRules.forEach((r) => lines.push(`- ${r}`));
    lines.push(``);
  }

  if (pack.acceptanceCriteria.length > 0) {
    lines.push(`## 완료 기준`);
    pack.acceptanceCriteria.forEach((c) => lines.push(`- [ ] ${c}`));
    lines.push(``);
  }

  if (pack.nextPrompt) {
    lines.push(`## 구체적인 지시사항`);
    lines.push(pack.nextPrompt);
    lines.push(``);
  }

  return lines.join("\n");
}
