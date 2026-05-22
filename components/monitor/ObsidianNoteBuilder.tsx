"use client";

import { useState, useMemo } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import {
  generateObsidianNote,
  type ObsidianNoteType,
} from "@/lib/memory/obsidian-note-generator";

// ─── Note type definitions ────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}

interface NoteTypeDef {
  label: string;
  fields: FieldDef[];
  /** Map form field keys → the data keys generateObsidianNote expects */
  dataMap: (inputs: Record<string, string>) => Record<string, unknown>;
}

const NOTE_TYPES: Record<ObsidianNoteType, NoteTypeDef> = {
  insight: {
    label: "개발 인사이트",
    fields: [
      { key: "title", label: "제목", placeholder: "인사이트 제목" },
      { key: "source_agent", label: "에이전트", placeholder: "claude-code" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      { key: "status", label: "상태", placeholder: "active" },
      { key: "content", label: "본문", multiline: true, rows: 5 },
      { key: "tags", label: "태그 (쉼표 구분)", placeholder: "storage, refactor" },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      source_agent: inputs.source_agent,
      related_phase: inputs.related_phase,
      status: inputs.status,
      content: inputs.content,
      tags: (inputs.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
    }),
  },
  decision: {
    label: "결정 기록",
    fields: [
      { key: "title", label: "제목", placeholder: "결정 제목" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      { key: "context", label: "배경", multiline: true, rows: 3 },
      { key: "decision", label: "결정 내용", multiline: true, rows: 3 },
      { key: "rationale", label: "근거", multiline: true, rows: 3 },
      {
        key: "alternatives",
        label: "검토한 대안 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
        placeholder: "SQLite\nSupabase",
      },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      related_phase: inputs.related_phase,
      context: inputs.context,
      decision: inputs.decision,
      rationale: inputs.rationale,
      alternatives: (inputs.alternatives ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    }),
  },
  "failed-attempt": {
    label: "실패 기록",
    fields: [
      { key: "title", label: "제목", placeholder: "실패한 시도 이름" },
      { key: "source_agent", label: "에이전트", placeholder: "codex" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      { key: "what", label: "시도한 내용", multiline: true, rows: 3 },
      { key: "why", label: "실패 원인", multiline: true, rows: 3 },
      { key: "lesson", label: "교훈 / 다음 시도", multiline: true, rows: 3 },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      source_agent: inputs.source_agent,
      related_phase: inputs.related_phase,
      what: inputs.what,
      why: inputs.why,
      lesson: inputs.lesson,
    }),
  },
  prompt: {
    label: "프롬프트 패턴",
    fields: [
      { key: "title", label: "제목", placeholder: "프롬프트 이름" },
      { key: "agent", label: "에이전트", placeholder: "claude-code" },
      { key: "task", label: "작업 타입", placeholder: "bug-fix" },
      { key: "tags", label: "태그 (쉼표 구분)", placeholder: "safe, bounded" },
      { key: "prompt", label: "프롬프트 템플릿", multiline: true, rows: 6 },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      agent: inputs.agent,
      task: inputs.task,
      tags: (inputs.tags ?? "").split(",").map((t) => t.trim()).filter(Boolean),
      prompt: inputs.prompt,
    }),
  },
  handoff: {
    label: "인수인계",
    fields: [
      { key: "from_agent", label: "From 에이전트", placeholder: "claude-code" },
      { key: "to_agent", label: "To 에이전트", placeholder: "codex" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      {
        key: "completedWork",
        label: "완료 작업 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
      },
      {
        key: "remainingWork",
        label: "남은 작업 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
      },
      { key: "nextPrompt", label: "다음 프롬프트", multiline: true, rows: 4 },
    ],
    dataMap: (inputs) => ({
      from_agent: inputs.from_agent,
      to_agent: inputs.to_agent,
      related_phase: inputs.related_phase,
      source_agent: inputs.from_agent,
      completedWork: (inputs.completedWork ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      remainingWork: (inputs.remainingWork ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      nextPrompt: inputs.nextPrompt,
    }),
  },
  status: {
    label: "상태 스냅샷",
    fields: [
      { key: "title", label: "제목", placeholder: "Phase 5 상태" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      { key: "summary", label: "요약", multiline: true, rows: 3 },
      {
        key: "agents",
        label: "에이전트 상태 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
        placeholder: "claude-code: available\ncodex: cooling_down",
      },
      {
        key: "blockers",
        label: "차단 이슈 (줄바꿈 구분)",
        multiline: true,
        rows: 2,
        placeholder: "없으면 비워두세요",
      },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      related_phase: inputs.related_phase,
      summary: inputs.summary,
      agents: (inputs.agents ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      blockers: (inputs.blockers ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    }),
  },
  "qa-finding": {
    label: "QA 발견사항",
    fields: [
      { key: "title", label: "제목", placeholder: "발견된 이슈 이름" },
      { key: "severity", label: "심각도", placeholder: "high / medium / low" },
      { key: "file", label: "파일 경로", placeholder: "lib/storage/json-store.ts" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      { key: "finding", label: "상세 내용", multiline: true, rows: 4 },
      {
        key: "recommendation",
        label: "수정 권장사항",
        multiline: true,
        rows: 3,
      },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      severity: inputs.severity,
      file: inputs.file,
      related_phase: inputs.related_phase,
      finding: inputs.finding,
      recommendation: inputs.recommendation,
    }),
  },
  "session-summary": {
    label: "세션 요약",
    fields: [
      { key: "title", label: "세션 이름", placeholder: "Phase 5 Day 1" },
      { key: "source_agent", label: "주 에이전트", placeholder: "claude-code" },
      { key: "related_phase", label: "Phase", placeholder: "5" },
      { key: "summary", label: "요약", multiline: true, rows: 4 },
      {
        key: "completedTasks",
        label: "완료 태스크 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
      },
      {
        key: "changedFiles",
        label: "변경 파일 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
        placeholder: "lib/types.ts\ncomponents/plan/KanbanBoard.tsx",
      },
      { key: "nextTask", label: "다음 권장 태스크", multiline: true, rows: 2 },
    ],
    dataMap: (inputs) => ({
      title: inputs.title,
      source_agent: inputs.source_agent,
      related_phase: inputs.related_phase,
      summary: inputs.summary,
      completedTasks: (inputs.completedTasks ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      changedFiles: (inputs.changedFiles ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
      nextTask: inputs.nextTask,
    }),
  },
  "context-limit-event": {
    label: "컨텍스트 한계 이벤트",
    fields: [
      { key: "agentId", label: "에이전트", placeholder: "claude-code" },
      { key: "tokensUsed", label: "토큰 사용량", placeholder: "120000" },
      { key: "tokenLimit", label: "토큰 제한", placeholder: "150000" },
      { key: "completedJobs", label: "완료된 작업 수", placeholder: "5" },
      { key: "contextPackId", label: "컨텍스트 팩 ID", placeholder: "pack-001" },
      {
        key: "recommendations",
        label: "권장사항 (줄바꿈 구분)",
        multiline: true,
        rows: 3,
        placeholder: "Switch to fallback agent\nSave context pack",
      },
    ],
    dataMap: (inputs) => ({
      agentId: inputs.agentId,
      tokensUsed: parseInt(inputs.tokensUsed || "0", 10),
      tokenLimit: parseInt(inputs.tokenLimit || "0", 10),
      completedJobs: parseInt(inputs.completedJobs || "0", 10),
      contextPackId: inputs.contextPackId,
      recommendations: (inputs.recommendations ?? "")
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean),
    }),
  },
};

const NOTE_TYPE_ORDER: ObsidianNoteType[] = [
  "insight",
  "decision",
  "failed-attempt",
  "prompt",
  "handoff",
  "status",
  "qa-finding",
  "session-summary",
  "context-limit-event",
];

// ─── Component ────────────────────────────────────────────────────────────────

export function ObsidianNoteBuilder() {
  const [noteType, setNoteType] = useState<ObsidianNoteType>("insight");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const def = NOTE_TYPES[noteType];

  function handleTypeChange(type: ObsidianNoteType) {
    setNoteType(type);
    setInputs({});
    setCopied(false);
  }

  function handleInput(key: string, value: string) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  const markdown = useMemo(() => {
    return generateObsidianNote(noteType, def.dataMap(inputs));
  }, [noteType, inputs, def]);

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(markdown);
    } catch {
      // fallback: ignore clipboard permission errors
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Safety banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm font-medium text-amber-500">
          파일 자동 저장 없음. 복사해서 Obsidian 볼트에 붙여넣으세요.
        </p>
      </div>

      {/* Note type tabs */}
      <div className="flex flex-wrap gap-2">
        {NOTE_TYPE_ORDER.map((type) => {
          const isActive = noteType === type;
          return (
            <button
              key={type}
              onClick={() => handleTypeChange(type)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors border ${
                isActive
                  ? "bg-pink-primary/10 text-pink-primary border-pink-primary/30"
                  : "text-text-secondary border-border hover:text-text-primary hover:bg-surface-2"
              }`}
            >
              {NOTE_TYPES[type].label}
            </button>
          );
        })}
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: input form */}
        <div className="space-y-4">
          {def.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <label className="block text-sm font-semibold text-text-primary">
                {field.label}
              </label>
              {field.multiline ? (
                <textarea
                  className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
                  rows={field.rows ?? 4}
                  placeholder={field.placeholder}
                  value={inputs[field.key] ?? ""}
                  onChange={(e) => handleInput(field.key, e.target.value)}
                />
              ) : (
                <input
                  type="text"
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
                  placeholder={field.placeholder}
                  value={inputs[field.key] ?? ""}
                  onChange={(e) => handleInput(field.key, e.target.value)}
                />
              )}
            </div>
          ))}
        </div>

        {/* Right: markdown preview */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text-primary">
            Markdown 미리보기
          </p>
          <pre className="flex-1 overflow-auto rounded-xl border border-border bg-surface-2 px-4 py-4 text-xs font-mono leading-relaxed text-text-secondary whitespace-pre-wrap break-words min-h-[320px]">
            {markdown}
          </pre>
        </div>
      </div>

      {/* Copy button */}
      <div className="flex items-center gap-4">
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 rounded-lg bg-pink-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-pink-primary/90"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4" />
              복사됨!
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              클립보드 복사
            </>
          )}
        </button>
        {copied && (
          <span className="text-sm font-medium text-emerald-500">
            클립보드에 복사되었습니다.
          </span>
        )}
      </div>
    </div>
  );
}
