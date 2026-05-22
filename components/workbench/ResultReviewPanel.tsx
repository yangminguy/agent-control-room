"use client";

import { useEffect, useState } from "react";
import { Copy, Check, FileCode2, ChevronDown, ChevronUp, Download, Upload } from "lucide-react";
import {
  type ResultClassification,
  classifyResult,
  extractChangedFilesFromResult,
  generateNextActions,
} from "@/lib/orchestration/result-classifier";
import { type AgentResult, type DispatchJob, type ResultStatus } from "@/lib/types";

// ── AgentResult badge config ───────────────────────────────

const RESULT_STATUS_BADGE: Record<ResultStatus, { label: string; cls: string }> = {
  pass: { label: "Pass", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  minor_fix: { label: "Minor Fix", cls: "bg-yellow-900 text-yellow-300 border-yellow-700" },
  qa_needed: { label: "QA Needed", cls: "bg-orange-900 text-orange-300 border-orange-700" },
  blocked: { label: "Blocked", cls: "bg-red-900 text-red-300 border-red-700" },
  safety_violation: { label: "Safety Violation", cls: "bg-red-950 text-red-200 border-red-800 font-bold" },
};

const CLASSIFICATION_CONFIG: Record<
  ResultClassification,
  { label: string; badgeCls: string; btnCls: string }
> = {
  Pass: {
    label: "Pass",
    badgeCls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    btnCls: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400 hover:bg-emerald-500/10",
  },
  MinorFix: {
    label: "MinorFix",
    badgeCls: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    btnCls: "border-amber-500/30 bg-amber-500/5 text-amber-400 hover:bg-amber-500/10",
  },
  QA: {
    label: "QA",
    badgeCls: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    btnCls: "border-blue-500/30 bg-blue-500/5 text-blue-400 hover:bg-blue-500/10",
  },
  Blocked: {
    label: "Blocked",
    badgeCls: "bg-red-500/10 text-red-400 border-red-500/20",
    btnCls: "border-red-500/30 bg-red-500/5 text-red-400 hover:bg-red-500/10",
  },
};

const AGENT_SUGGESTION: Record<ResultClassification, string> = {
  Pass: "없음 (다음 태스크로 진행)",
  MinorFix: "Codex",
  QA: "Codex",
  Blocked: "Claude Code",
};

const ALL_CLASSIFICATIONS: ResultClassification[] = ["Pass", "MinorFix", "QA", "Blocked"];

interface ResultReviewPanelProps {
  agentResult?: AgentResult;
  dispatchJob?: DispatchJob;
}

export function ResultReviewPanel({ agentResult, dispatchJob }: ResultReviewPanelProps = {}) {
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

  // Auto-export state
  const [lastUsedIssueId, setLastUsedIssueId] = useState<string>("");
  const [autoExportLoading, setAutoExportLoading] = useState(false);
  const [autoExportMessage, setAutoExportMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("lastUsedKanbanIssueId");
      if (stored) setLastUsedIssueId(stored);
    }
  }, []);

  useEffect(() => {
    if (rawResult.length > 0) {
      const classified = classifyResult(rawResult);
      setClassification(classified);
      setChangedFiles(extractChangedFilesFromResult(rawResult));
      setNextActions(generateNextActions(classified, rawResult));
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
      if (typeof window !== "undefined") {
        localStorage.setItem("lastUsedKanbanIssueId", importIssueId.trim());
      }
    } catch (err: any) {
      setImportError(err.message ?? "네트워크 오류");
    } finally {
      setImportLoading(false);
    }
  }

  async function handleAutoExportToKanban() {
    if (!lastUsedIssueId.trim()) {
      setAutoExportMessage("최근 사용한 이슈 ID가 없습니다. 먼저 Kanban에서 임포트하세요.");
      return;
    }

    setAutoExportLoading(true);
    setAutoExportMessage(null);

    try {
      const classificationText = [
        `분류: ${classification}`,
        `변경 파일: ${changedFiles.length > 0 ? changedFiles.join(", ") : "없음"}`,
        `다음 에이전트: ${AGENT_SUGGESTION[classification!]}`,
        `재시도 후보: ${isRetryCandidate ? "예" : "아니오"}`,
      ].join("\n");

      const res = await fetch("/api/vibe-kanban/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueId: lastUsedIssueId.trim(),
          workspaceResult: classificationText,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setAutoExportMessage(`Kanban 업로드 실패: ${data.message ?? "알 수 없는 오류"}`);
        return;
      }

      setAutoExportMessage("✓ Kanban에 자동 업로드되었습니다!");
      setTimeout(() => setAutoExportMessage(null), 3000);
    } catch (err: any) {
      setAutoExportMessage(`오류: ${err.message ?? "네트워크 오류"}`);
    } finally {
      setAutoExportLoading(false);
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
              <p className="text-xs text-red-400 font-medium">{importError}</p>
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
        <p className="text-xs text-emerald-400 font-medium px-1">
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
                        setNextActions(generateNextActions(cls, rawResult));
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

              {lastUsedIssueId && (
                <button
                  onClick={handleAutoExportToKanban}
                  disabled={autoExportLoading}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Upload className="h-3.5 w-3.5" />
                  {autoExportLoading ? "업로드 중..." : "Kanban 자동 업로드"}
                </button>
              )}

              <a
                href="/hermes-packets"
                className="inline-flex items-center gap-1.5 rounded border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
              >
                Obsidian 메모
              </a>
            </div>

            {/* Copied confirmation */}
            {copied && (
              <p className="text-xs text-emerald-400 font-medium">
                복사됨! ✓
              </p>
            )}

            {/* Auto-export message */}
            {autoExportMessage && (
              <p className={`text-xs font-medium ${autoExportMessage.includes("✓") ? "text-emerald-400" : "text-amber-400"}`}>
                {autoExportMessage}
              </p>
            )}
          </div>
        </>
      )}

      {/* AgentResult section (Phase 13 integration) */}
      {agentResult && (
        <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Collected Agent Result
          </p>

          {/* Result status badge + dispatch job link */}
          <div className="flex items-center gap-3 flex-wrap">
            {(() => {
              const cfg = RESULT_STATUS_BADGE[agentResult.resultStatus];
              return (
                <span className={`inline-flex items-center px-3 py-1 rounded border text-xs font-semibold ${cfg.cls}`}>
                  {cfg.label}
                </span>
              );
            })()}
            <span className="text-xs text-text-secondary">
              Job:{" "}
              <span className="font-mono text-text-primary">{agentResult.dispatchJobId}</span>
              {dispatchJob && (
                <span className="ml-2">· Agent: {dispatchJob.agentId}</span>
              )}
            </span>
          </div>

          {/* Summary */}
          {agentResult.extractedSummary && (
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1">Summary</p>
              <p className="text-sm text-text-primary">{agentResult.extractedSummary}</p>
            </div>
          )}

          {/* Changed files */}
          {agentResult.changedFiles && agentResult.changedFiles.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-secondary mb-1">
                Changed Files — {agentResult.changedFiles.length}
              </p>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {agentResult.changedFiles.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-text-secondary">
                    <FileCode2 className="w-3 h-3 shrink-0" />
                    <span className="font-mono truncate">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Timestamp */}
          <p className="text-xs text-text-secondary">
            Collected: {new Date(agentResult.timestamp).toLocaleString()}
          </p>
        </div>
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
