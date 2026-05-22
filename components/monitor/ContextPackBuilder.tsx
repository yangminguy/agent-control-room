"use client";

import { useState, useMemo } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { generateContextPackMarkdown } from "@/lib/orchestration/context-pack-generator";

interface ContextPackBuilderProps {
  projectName: string;
  currentPhase: string;
  defaultContext?: {
    completedWork?: string[];
    blockers?: string[];
  };
  onSave?: (content: string) => void;
}

function textareaToLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function linesToTextarea(lines: string[]): string {
  return lines.join("\n");
}

export function ContextPackBuilder({
  projectName,
  currentPhase,
  defaultContext,
  onSave,
}: ContextPackBuilderProps) {
  const [completedWork, setCompletedWork] = useState(
    linesToTextarea(defaultContext?.completedWork ?? []),
  );
  const [changedFiles, setChangedFiles] = useState("");
  const [importantDecisions, setImportantDecisions] = useState("");
  const [blockers, setBlockers] = useState(
    linesToTextarea(defaultContext?.blockers ?? []),
  );
  const [nextTask, setNextTask] = useState("");
  const [acceptanceCriteria, setAcceptanceCriteria] = useState("");
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(
    () =>
      generateContextPackMarkdown({
        projectName,
        currentPhase,
        completedWork: textareaToLines(completedWork),
        changedFiles: textareaToLines(changedFiles),
        importantDecisions: textareaToLines(importantDecisions),
        blockers: textareaToLines(blockers),
        nextTask,
        acceptanceCriteria: textareaToLines(acceptanceCriteria),
      }),
    [
      projectName,
      currentPhase,
      completedWork,
      changedFiles,
      importantDecisions,
      blockers,
      nextTask,
      acceptanceCriteria,
    ],
  );

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: ignore
    }
    onSave?.(markdown);
  }

  return (
    <div className="space-y-6">
      {/* No-save banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm font-medium text-amber-500">
          파일 자동 저장 없음. 복사해서 에이전트 프롬프트에 붙여넣으세요.
        </p>
      </div>

      {/* Meta info */}
      <div className="rounded-xl border border-border bg-surface-2 px-5 py-4 text-sm text-text-secondary">
        <span className="font-semibold text-text-primary">{projectName}</span>
        &nbsp;·&nbsp;현재 Phase:&nbsp;
        <span className="font-semibold text-text-primary">{currentPhase}</span>
      </div>

      {/* Two-column layout: form | preview */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: input form */}
        <div className="space-y-5">
          <Field
            label="완료한 작업"
            hint="각 줄마다 한 항목"
            value={completedWork}
            onChange={setCompletedWork}
            rows={5}
          />
          <Field
            label="변경한 파일"
            hint="각 줄마다 하나의 경로"
            value={changedFiles}
            onChange={setChangedFiles}
            rows={4}
            placeholder="lib/roadmap.ts&#10;components/roadmap/RoadmapTimeline.tsx"
          />
          <Field
            label="중요 결정사항"
            hint="각 줄마다 한 항목"
            value={importantDecisions}
            onChange={setImportantDecisions}
            rows={4}
          />
          <Field
            label="차단 이슈"
            hint="없으면 비워두세요"
            value={blockers}
            onChange={setBlockers}
            rows={3}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text-primary">
              다음 태스크
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
              rows={3}
              value={nextTask}
              onChange={(e) => setNextTask(e.target.value)}
              placeholder="다음으로 구현할 태스크를 입력하세요"
            />
          </div>
          <Field
            label="수용 기준"
            hint="각 줄마다 한 항목"
            value={acceptanceCriteria}
            onChange={setAcceptanceCriteria}
            rows={4}
          />
        </div>

        {/* RIGHT: markdown preview */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text-primary">
            마크다운 미리보기
          </p>
          <pre className="flex-1 overflow-auto rounded-xl border border-border bg-surface-2 px-4 py-4 text-xs font-mono leading-relaxed text-text-secondary whitespace-pre-wrap break-words min-h-[360px]">
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

// ─── Simple reusable field ────────────────────────────────────────────────────

function Field({
  label,
  hint,
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2">
        <label className="text-sm font-semibold text-text-primary">{label}</label>
        {hint && <span className="text-xs text-text-secondary">{hint}</span>}
      </div>
      <textarea
        className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
