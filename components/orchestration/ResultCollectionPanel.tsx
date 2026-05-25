"use client";

import { useEffect, useState } from "react";
import type { AgentResult, DispatchJob, DispatchJobStatus, ResultStatus } from "@/lib/types";
import { AgentResultSchema } from "@/lib/results/agent-result-schema";

// ── Badge ─────────────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<ResultStatus, { label: string; cls: string }> = {
  pass: { label: "Pass", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  minor_fix: { label: "Minor Fix", cls: "bg-yellow-900 text-yellow-300 border-yellow-700" },
  qa_needed: { label: "QA Needed", cls: "bg-blue-900 text-blue-300 border-blue-700" },
  blocked: { label: "Blocked", cls: "bg-orange-900 text-orange-300 border-orange-700" },
  safety_violation: { label: "Safety Violation", cls: "bg-red-900 text-red-300 border-red-700" },
};

function StatusBadge({ status }: { status: ResultStatus }) {
  const cfg = STATUS_BADGE[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface ResultCollectionPanelProps {
  onCollect: (result: AgentResult) => void;
  jobs: DispatchJob[];
  results: AgentResult[];
  onJobStatusChange?: (id: string, status: DispatchJobStatus) => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function ResultCollectionPanel({
  onCollect,
  jobs,
  results,
  onJobStatusChange,
}: ResultCollectionPanelProps) {
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState<AgentResult | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const dispatchableJobs = jobs.filter((job) => {
    const terminal = ["completed", "failed", "skipped_due_to_risk"].includes(job.status);
    const risky = ["medium", "high", "critical"].includes(job.riskLevel);
    return !terminal && (!risky || job.status === "approved");
  });
  const [selectedJobId, setSelectedJobId] = useState(dispatchableJobs[0]?.id ?? "");
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedJobId && dispatchableJobs.some((job) => job.id === selectedJobId)) return;
    setSelectedJobId(dispatchableJobs[0]?.id ?? "");
  }, [dispatchableJobs, selectedJobId]);

  const handleParse = () => {
    setParseError(null);
    setParsed(null);

    let raw: unknown;
    try {
      raw = JSON.parse(jsonInput);
    } catch {
      setParseError("Invalid JSON. Please check your input and try again.");
      return;
    }

    const validation = AgentResultSchema.safeParse(raw);
    if (!validation.success) {
      const issues = validation.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      setParseError(`Validation failed: ${issues}`);
      return;
    }

    setParsed(validation.data);
  };

  const handleCollect = () => {
    if (!parsed) return;
    onCollect(parsed);
    setJsonInput("");
    setParsed(null);
    setParseError(null);
  };

  const handleDispatch = async () => {
    const job = jobs.find((j) => j.id === selectedJobId);
    if (!job) {
      setDispatchError("Select a dispatchable job first.");
      return;
    }

    setDispatchError(null);
    setIsDispatching(true);
    onJobStatusChange?.(job.id, "running");

    try {
      const response = await fetch("/api/orchestration/dispatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(job),
      });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload
            ? String((payload as { error?: unknown }).error)
            : "Dispatch request failed.";
        onJobStatusChange?.(job.id, "failed");
        setDispatchError(message);
        return;
      }

      const resultPayload =
        payload && typeof payload === "object" && "result" in payload
          ? (payload as { result?: unknown }).result
          : payload;
      const validation = AgentResultSchema.safeParse(resultPayload);
      if (!validation.success) {
        onJobStatusChange?.(job.id, "failed");
        setDispatchError("Dispatch returned an invalid AgentResult payload.");
        return;
      }

      onCollect(validation.data);
    } catch (error) {
      onJobStatusChange?.(job.id, "failed");
      setDispatchError(error instanceof Error ? error.message : "Dispatch failed.");
    } finally {
      setIsDispatching(false);
    }
  };

  // Sort results newest first
  const sortedResults = [...results].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="space-y-6">
      <div className="bg-red-50 text-red-800 p-3 rounded text-sm font-semibold mb-4 border border-red-200">
        이 영역은 수동 결과 입력/개발자 검증용입니다. 일반 실행 흐름에서는 Workbench와 Runner 결과를 사용합니다.
      </div>

      {/* Dispatch section */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 flex items-center">
            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] mr-2">[개발자용]</span>
            에이전트 강제 디스패치
          </p>
          <p className="text-xs text-text-secondary">
            대기 중인 안전 작업 또는 승인된 위험 작업을 서버 디스패치 어댑터로 실행합니다.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={isDispatching || dispatchableJobs.length === 0}
            className="min-w-0 flex-1 rounded border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-zinc-500 disabled:opacity-40"
          >
            {dispatchableJobs.length === 0 ? (
              <option value="">디스패치 가능한 작업 없음</option>
            ) : (
              dispatchableJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.id} · {job.agentId} · {job.riskLevel}
                </option>
              ))
            )}
          </select>
          <button
            type="button"
            onClick={handleDispatch}
            disabled={isDispatching || dispatchableJobs.length === 0 || !selectedJobId}
            className="px-3 py-2 rounded border border-zinc-600 bg-zinc-800 text-zinc-100 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            {isDispatching ? "디스패치 중..." : "[개발자용] 대기열 작업 강제 디스패치"}
          </button>
        </div>

        {dispatchError && (
          <div className="rounded border border-red-700 bg-red-950 px-3 py-2">
            <p className="text-xs text-red-300">{dispatchError}</p>
          </div>
        )}
      </div>

      {/* Input section */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1 flex items-center">
            <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] mr-2">[개발자용]</span>
            에이전트 결과 JSON 붙여넣기
          </p>
          <p className="text-xs text-text-secondary">
            AgentResult 스키마에 맞는 JSON 객체를 붙여넣고, 수집 전에 &quot;[개발자용] JSON 검증&quot;으로 확인하세요.
          </p>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          rows={8}
          placeholder='{"id": "result-...", "dispatchJobId": "job-...", "taskId": "task-...", "agentId": "claude-code", "rawOutput": "...", "resultStatus": "pass", "timestamp": "2026-05-21T..."}'
          className="w-full rounded border border-border bg-surface px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary resize-y focus:outline-none focus:border-zinc-500"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleParse}
            disabled={!jsonInput.trim()}
            className="px-3 py-1.5 rounded border border-zinc-400 bg-zinc-100 text-xs font-medium text-zinc-700 hover:bg-zinc-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            [개발자용] JSON 검증
          </button>
          <button
            type="button"
            onClick={handleCollect}
            disabled={!parsed}
            className="px-3 py-1.5 rounded border border-zinc-600 bg-zinc-800 text-zinc-100 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:bg-zinc-700 transition-colors"
          >
            [개발자용] 결과 수집
          </button>
          {parsed && (
            <span className="text-xs text-emerald-400 font-medium">
              JSON 검증 완료
            </span>
          )}
        </div>

        {parseError && (
          <div className="rounded border border-red-700 bg-red-950 px-3 py-2">
            <p className="text-xs text-red-300">{parseError}</p>
          </div>
        )}

        {parsed && (
          <div className="rounded border border-emerald-700 bg-emerald-950/40 px-3 py-2 space-y-1">
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">검증 미리보기</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-text-secondary">
              <span>ID: <span className="font-mono text-text-primary">{parsed.id}</span></span>
              <span>에이전트: <span className="text-text-primary">{parsed.agentId}</span></span>
              <span>태스크: <span className="font-mono text-text-primary">{parsed.taskId}</span></span>
              <span className="flex items-center gap-1">상태: <StatusBadge status={parsed.resultStatus} /></span>
            </div>
          </div>
        )}
      </div>

      {/* Results list section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-1 flex items-center">
          <span className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] mr-2">[개발자용]</span>
          수집된 결과 ({results.length})
        </p>

        {sortedResults.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-text-secondary">아직 수집된 결과가 없습니다.</p>
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden">
            <div className="divide-y divide-border">
              {sortedResults.map((result) => (
                <div
                  key={result.id}
                  className="px-4 py-3 flex items-start gap-3 hover:bg-surface-2 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono text-text-primary">{result.id}</span>
                      <StatusBadge status={result.resultStatus} />
                    </div>
                    <p className="text-xs text-text-secondary mt-0.5 truncate">
                      Agent: {result.agentId} · Task: {result.taskId}
                    </p>
                    <p className="text-xs text-text-secondary mt-0.5 line-clamp-1 font-mono">
                      {result.rawOutput.slice(0, 80)}
                      {result.rawOutput.length > 80 ? "…" : ""}
                    </p>
                  </div>
                  <time className="text-xs text-text-secondary shrink-0 tabular-nums">
                    {new Date(result.timestamp).toLocaleTimeString("ko-KR", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </time>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
