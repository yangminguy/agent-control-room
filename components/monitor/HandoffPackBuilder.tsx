"use client";

import { useState, useMemo } from "react";
import { Copy, Check, AlertTriangle } from "lucide-react";
import { generateHandoffPackMarkdown } from "@/lib/orchestration/handoff-pack-generator";

const AGENT_OPTIONS = [
  "Claude Code",
  "Codex",
  "Antigravity",
  "Hermes",
  "Manual / User",
] as const;

interface HandoffPackBuilderProps {
  projectName: string;
  defaultFromAgent?: string;
  defaultToAgent?: string;
}

function textareaToLines(value: string): string[] {
  return value
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

export function HandoffPackBuilder({
  projectName,
  defaultFromAgent = "Claude Code",
  defaultToAgent = "Codex",
}: HandoffPackBuilderProps) {
  const [fromAgent, setFromAgent] = useState(defaultFromAgent);
  const [toAgent, setToAgent] = useState(defaultToAgent);
  const [completedWork, setCompletedWork] = useState("");
  const [remainingWork, setRemainingWork] = useState("");
  const [changedFiles, setChangedFiles] = useState("");
  const [blockers, setBlockers] = useState("");
  const [nextPrompt, setNextPrompt] = useState("");
  const [contextRequirements, setContextRequirements] = useState("");
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(
    () =>
      generateHandoffPackMarkdown({
        fromAgent,
        toAgent,
        completedWork: textareaToLines(completedWork),
        remainingWork: textareaToLines(remainingWork),
        changedFiles: textareaToLines(changedFiles),
        blockers: textareaToLines(blockers),
        nextPrompt,
        contextRequirements: textareaToLines(contextRequirements),
      }),
    [
      fromAgent,
      toAgent,
      completedWork,
      remainingWork,
      changedFiles,
      blockers,
      nextPrompt,
      contextRequirements,
    ],
  );

  async function copyToClipboard() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="space-y-6">
      {/* No-save banner */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <p className="text-sm font-medium text-amber-500">
          파일 자동 저장 없음. 복사해서 수신 에이전트 워크스페이스에 붙여넣으세요.
        </p>
      </div>

      {/* Meta: project */}
      <div className="rounded-xl border border-border bg-surface-2 px-5 py-4 text-sm text-text-secondary">
        프로젝트:&nbsp;
        <span className="font-semibold text-text-primary">{projectName}</span>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* LEFT: form */}
        <div className="space-y-5">
          {/* Agent selectors */}
          <div className="grid grid-cols-2 gap-4">
            <SelectField
              label="출발 에이전트"
              value={fromAgent}
              onChange={setFromAgent}
              options={AGENT_OPTIONS}
            />
            <SelectField
              label="도착 에이전트"
              value={toAgent}
              onChange={setToAgent}
              options={AGENT_OPTIONS}
            />
          </div>

          <TextareaField
            label="완료한 작업"
            hint="각 줄마다 한 항목"
            value={completedWork}
            onChange={setCompletedWork}
            rows={5}
          />
          <TextareaField
            label="남은 작업"
            hint="각 줄마다 한 항목"
            value={remainingWork}
            onChange={setRemainingWork}
            rows={4}
          />
          <TextareaField
            label="변경한 파일"
            hint="각 줄마다 하나의 경로"
            value={changedFiles}
            onChange={setChangedFiles}
            rows={4}
            placeholder="lib/orchestration/context-pack-generator.ts&#10;components/hermes/ContextPackBuilder.tsx"
          />
          <TextareaField
            label="차단 이슈"
            hint="없으면 비워두세요"
            value={blockers}
            onChange={setBlockers}
            rows={3}
          />
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-text-primary">
              다음 프롬프트
            </label>
            <textarea
              className="w-full resize-none rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
              rows={5}
              value={nextPrompt}
              onChange={(e) => setNextPrompt(e.target.value)}
              placeholder="수신 에이전트에게 전달할 구체적인 지시사항을 입력하세요"
            />
          </div>
          <TextareaField
            label="컨텍스트 요구사항"
            hint="선택사항 — 각 줄마다 한 항목"
            value={contextRequirements}
            onChange={setContextRequirements}
            rows={3}
          />
        </div>

        {/* RIGHT: preview */}
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold text-text-primary">
            마크다운 미리보기
          </p>
          <pre className="flex-1 overflow-auto rounded-xl border border-border bg-surface-2 px-4 py-4 text-xs font-mono leading-relaxed text-text-secondary whitespace-pre-wrap break-words min-h-[360px]">
            {markdown}
          </pre>
        </div>
      </div>

      {/* Copy */}
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-semibold text-text-primary">
        {label}
      </label>
      <select
        className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-pink-primary/40"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextareaField({
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
