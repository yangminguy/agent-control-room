/**
 * Hermes Memory Builder
 * Phase 40: Full Orchestration Layer
 *
 * Hermes가 실행 결과를 Obsidian-compatible markdown으로 저장할 수 있는 구조를 제공한다.
 * 실제 Hermes 실행은 하지 않음 - markdown note 생성까지만.
 */

import { nanoid } from "nanoid";
import type { HermesMemoryNote, HermesMemoryNoteInput } from "./types";

const OBSIDIAN_PATHS: Record<HermesMemoryNote["type"], string> = {
  session_summary: "output/obsidian/session-summaries",
  decision: "output/obsidian/decisions",
  failure: "output/obsidian/failures",
  prompt_pattern: "output/obsidian/prompt-patterns",
  agent_performance: "output/obsidian/agent-performance",
  context_pack: "output/obsidian/context-packs",
  blocker: "output/obsidian/blockers",
};

const TYPE_LABELS: Record<HermesMemoryNote["type"], string> = {
  session_summary: "세션 요약",
  decision: "주요 결정",
  failure: "실패 기록",
  prompt_pattern: "성공 프롬프트 패턴",
  agent_performance: "에이전트 성능 메모",
  context_pack: "Context Pack 요약",
  blocker: "차단 요소",
};

export function suggestHermesMemoryType(input: HermesMemoryNoteInput): HermesMemoryNote["type"] {
  const text = `${input.title} ${input.content}`.toLowerCase();

  if (text.includes("실패") || text.includes("fail") || text.includes("error") || text.includes("에러")) {
    return "failure";
  }
  if (text.includes("블로커") || text.includes("차단") || text.includes("blocker") || text.includes("blocked")) {
    return "blocker";
  }
  if (text.includes("결정") || text.includes("decision") || text.includes("선택") || text.includes("채택")) {
    return "decision";
  }
  if (text.includes("프롬프트") || text.includes("prompt") || text.includes("패턴") || text.includes("pattern")) {
    return "prompt_pattern";
  }
  if (text.includes("성능") || text.includes("performance") || text.includes("에이전트 평가")) {
    return "agent_performance";
  }
  if (text.includes("context pack") || text.includes("컨텍스트 팩") || text.includes("인수인계")) {
    return "context_pack";
  }
  return "session_summary";
}

export function getObsidianPath(type: HermesMemoryNote["type"], id: string): string {
  return `${OBSIDIAN_PATHS[type]}/${id}.md`;
}

export function buildHermesMemoryNote(input: HermesMemoryNoteInput): HermesMemoryNote {
  const id = nanoid();
  const type = input.type ?? suggestHermesMemoryType(input);
  return {
    id,
    type,
    title: input.title,
    content: input.content,
    tags: input.tags ?? [],
    relatedTaskIds: [
      ...(input.relatedTaskIds ?? []),
      ...(input.taskId ? [input.taskId] : []),
    ],
    relatedFiles: input.relatedFiles ?? [],
    obsidianPath: getObsidianPath(type, id),
    createdAt: new Date().toISOString(),
  };
}

export function renderHermesMemoryMarkdown(note: HermesMemoryNote): string {
  const lines: string[] = [
    `---`,
    `id: ${note.id}`,
    `type: ${note.type}`,
    `title: "${note.title}"`,
    `tags: [${note.tags.map((t) => `"${t}"`).join(", ")}]`,
    `created: ${note.createdAt}`,
    `---`,
    ``,
    `# ${note.title}`,
    ``,
    `> **유형**: ${TYPE_LABELS[note.type]}  `,
    `> **생성**: ${note.createdAt}`,
    ``,
    `## 내용`,
    ``,
    note.content,
    ``,
  ];

  if (note.relatedTaskIds.length > 0) {
    lines.push(`## 관련 작업`);
    note.relatedTaskIds.forEach((id) => lines.push(`- [[task-${id}]]`));
    lines.push(``);
  }

  if (note.relatedFiles.length > 0) {
    lines.push(`## 관련 파일`);
    note.relatedFiles.forEach((f) => lines.push(`- \`${f}\``));
    lines.push(``);
  }

  if (note.tags.length > 0) {
    lines.push(`## 태그`);
    lines.push(note.tags.map((t) => `#${t}`).join(" "));
    lines.push(``);
  }

  lines.push(`---`);
  lines.push(`*Hermes Memory Worker가 생성한 Obsidian-compatible 노트입니다.*`);

  return lines.join("\n");
}
