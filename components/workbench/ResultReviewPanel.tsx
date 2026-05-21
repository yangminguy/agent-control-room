"use client";

import { useEffect, useState } from "react";
import { Copy, Check, FileCode2, ChevronDown, ChevronUp, Download } from "lucide-react";
import {
  type ResultClassification,
  classifyResult,
  extractChangedFilesFromResult,
  generateNextActions,
} from "@/lib/orchestration/result-classifier";

const CLASSIFICATION_CONFIG: Record<
  ResultClassification,
  { label: string; badgeCls: string; btnCls: string }
> = {
  Pass: {
    label: "Pass",
    badgeCls: "bg-emerald-100 text-emerald-700 border-emerald-300",
    btnCls:
      "border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
  },
  MinorFix: {
    label: "MinorFix",
    badgeCls: "bg-amber-100 text-amber-700 border-amber-300",
    btnCls: "border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100",
  },
  QA: {
    label: "QA",
    badgeCls: "bg-blue-100 text-blue-700 border-blue-300",
    btnCls: "border-blue-400 bg-blue-50 text-blue-700 hover:bg-blue-100",
  },
  Blocked: {
    label: "Blocked",
    badgeCls: "bg-red-100 text-red-700 border-red-300",
    btnCls: "border-red-400 bg-red-50 text-red-700 hover:bg-red-100",
  },
};

const AGENT_SUGGESTION: Record<ResultClassification, string> = {
  Pass: "없음 (다음 태스크로 진행)",
  MinorFix: "Codex",
  QA: "Codex",
  Blocked: "Claude Code",
};

const ALL_CLASSIFICATIONS: ResultClassification[] = ["Pass", "MinorFix", "QA", "Blocked"];

export function ResultReviewPanel() {
  const [rawResult, setRawResult] = useState("");
  const [classification, setClassification] =
    useState<ResultClassification | null>(null);
  const [changedFiles, setChangedFiles] = useState<string[]>([]);
  const [nextActions, setNextActions] = useState<string[]>([]);
  const [isRetryCandidate, setIsRetryCandidate] = useState(false);
  const [copied, setCopied] = useState(false);

  // Vibe Kanban import state
  const [importOpen, setImportOpen] = useState(false);
  const [importIssueId, setImportIssueId] = useState("");
  const [importWorkspaceResult, setImportWorkspaceResult] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);

  useEffect(() => {
    if (rawResult.length > 0) {
      const classified = classifyResult(rawResult);
      setClassification(classified);
      setChangedFiles(extractChangedFilesFromResult(rawResult));
      setNextActions(generateNextActions(classified));
      setIsRetryCandidate(classified === "Blocked");
    } else {
      setClassification(null);
      setChangedFiles([]);
      setNextActions([]);
      setIsRetryCandidate(false);
    }
  }, [rawResult]);

  async function handleVibeKanbanImport() {
    if (!importIssueId.trim() || !importWorkspaceResult.trim()) {
      setImportError("issueId와 결과를 모두 입력하세요.");
      return;
    }
    setImportLoading(true);
    setImportError(null);
    setImportSuccess(false);
    try {
      const res = await fetch("/api/vibe-kanban/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: importIssueId.trim(),
          workspaceResult: importWorkspaceResult,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setImportError(data.message ?? "임포트 실패");
        return;
      }
      setRawResult(data.rawResult);
      setImportSuccess(true);
      setImportOpen(false);
      setImportIssueId("");
      setImportWorkspaceResult("");
    } catch (err: any) {
      setImportError(err.message ?? "네트워크 오류");
    } finally {
      setImportLoading(false);
    }
  }

  async function copyToClipboard() {
    if (!classification) return;
    const text = [
      `분류: ${classification}`,
      `변경 파일:\n${changedFiles.length > 0 ? changedFiles.join("\n") : "없음"}`,
      `\n권장 행동:\n${nextActions.join("\n")}`,
      `재시도 후보: ${isRetryCandidate ? "예" : "아니오"}`,
    ].join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const cfg = classification ? CLASSIFICATION_CONFIG[classification] : null;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Vibe Kanban import section */}
      <div className="rounded-lg border border-border bg-surface-2">
        <button
          type="button"
          onClick={() => {
            setImportOpen((prev) => !prev);
            setImportError(null);
          }}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-text-primary hover:bg-surface transition-colors rounded-lg"
        >
          <span className="flex items-center gap-2">
            <Download className="w-4 h-4 text-text-secondary" />
            Vibe Kanban에서 가져오기
          </span>
          {importOpen ? (
            <ChevronUp className="w-4 h-4 text-text-secondary" />
          ) : (
            <ChevronDown className="w-4 h-4 text-text-secondary" />
          )}
        </button>

        {importOpen && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            <p className="text-xs text-text-secondary">
              Vibe Kanban에서 작업 완료 후 issueId와 결과를 붙여넣으세요. 임포트하면 아래 결과 영역이 자동으로 채워집니다.
            </p>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                Issue ID
              </label>
              <input
                type="text"
                className="w-full rounded border border-border bg-surface px-3 py-1.5 text-sm font-mono text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-pink-primary"
                placeholder="예: vibe-issue-123"
                value={importIssueId}
                onChange={(e) => setImportIssueId(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-text-secondary">
                작업 결과 (Vibe Kanban에서 복사)
              </label>
              <textarea
                className="w-full h-32 resize-y rounded border border-border bg-surface p-3 text-sm font-mono text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-pink-primary"
                placeholder="Vibe Kanban 워크스페이스에서 완료된 작업 결과를 붙여넣으세요..."
                value={importWorkspaceResult}
                onChange={(e) => setImportWorkspaceResult(e.target.value)}
              />
            </div>
            {importError && (
              <p className="text-xs text-red-600 font-medium">{importError}</p>
            )}
            <button
              type="button"
              onClick={handleVibeKanbanImport}
              disabled={importLoading}
              className="inline-flex items-center gap-1.5 rounded bg-pink-primary px-4 py-1.5 text-xs font-medium text-white hover:bg-pink-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importLoading ? "임포트 중..." : "임포트"}
            </button>
          </div>
        )}
      </div>

      {importSuccess && (
        <p className="text-xs text-emerald-600 font-medium px-1">
          Vibe Kanban 결과가 아래 영역에 자동으로 채워졌습니다.
        </p>
      )}

      {/* Input area */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <label
          htmlFor="result-input"
          className="block text-sm font-semibold text-text-primary"
        >
          에이전트 결과 붙여넣기
        </label>
        <textarea
          id="result-input"
          className="w-full h-48 resize-y rounded border border-border bg-surface p-3 text-sm font-mono text-text-primary placeholder-text-secondary focus:outline-none focus:ring-1 focus:ring-pink-primary"
          placeholder="에이전트 실행 결과를 여기에 붙여넣으세요 (Ctrl+V)..."
          value={rawResult}
          onChange={(e) => setRawResult(e.target.value)}
        />
      </div>

      {/* Classification */}
      {classification && cfg && (
        <>
          {/* Auto classification badge */}
          <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              자동 분류
            </p>
            <div className="flex items-center gap-3">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${cfg.badgeCls}`}
              >
                {cfg.label}
              </span>
            </div>

            {/* Manual override */}
            <div className="space-y-1.5">
              <p className="text-xs text-text-secondary">수동 선택 (필요시):</p>
              <div className="flex flex-wrap gap-2">
                {ALL_CLASSIFICATIONS.map((cls) => {
                  const c = CLASSIFICATION_CONFIG[cls];
                  const isSelected = classification === cls;
                  return (
                    <button
                      key={cls}
                      onClick={() => {
                        setClassification(cls);
                        setNextActions(generateNextActions(cls));
                        setIsRetryCandidate(cls === "Blocked");
                      }}
                      className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                        isSelected
                          ? c.btnCls + " ring-2 ring-offset-1 ring-current"
                          : "border-border bg-surface text-text-secondary hover:bg-surface-2"
                      }`}
                    >
                      {isSelected ? "✓ " : ""}
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Changed files */}
          <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              변경 파일 (자동 추출){" "}
              {changedFiles.length > 0 && (
                <span className="normal-case font-normal">
                  — {changedFiles.length}개
                </span>
              )}
            </p>
            {changedFiles.length > 0 ? (
              <ul className="space-y-1 max-h-36 overflow-y-auto">
                {changedFiles.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <FileCode2 className="w-3 h-3 shrink-0 text-text-secondary" />
                    <span className="font-mono truncate">{f}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-text-secondary">감지된 파일 경로 없음</p>
            )}
          </div>

          {/* Suggested agent */}
          <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-1">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              다음 에이전트 추천
            </p>
            <p className="text-sm text-text-primary font-medium">
              {AGENT_SUGGESTION[classification]}
            </p>
          </div>

          {/* Retry candidate */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-border accent-pink-primary"
                checked={isRetryCandidate}
                onChange={(e) => setIsRetryCandidate(e.target.checked)}
              />
              <span className="text-sm text-text-primary">
                재시도 후보 — 실패 태스크 추적에 저장
              </span>
            </label>
          </div>

          {/* Next actions */}
          <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
              권장 행동
            </p>
            <ul className="space-y-2">
              {nextActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-primary">
                  <span className="text-text-secondary shrink-0">→</span>
                  {action}
                </li>
              ))}
            </ul>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
              <button
                onClick={copyToClipboard}
                className="inline-flex items-center gap-1.5 rounded bg-pink-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-soft transition-colors"
              >
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copied ? "복사됨!" : "클립보드 복사"}
              </button>

              <a
                href="/hermes-packets"
                className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                Obsidian 메모
              </a>
            </div>

            {/* Copied confirmation */}
            {copied && (
              <p className="text-xs text-emerald-600 font-medium">
                복사됨! ✓
              </p>
            )}
          </div>
        </>
      )}

      {/* Empty state */}
      {!classification && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-secondary">
            위에 에이전트 결과를 붙여넣으면 자동으로 분류됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
