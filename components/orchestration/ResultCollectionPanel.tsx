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
      {/* Dispatch section */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
            Dispatch to Agent
          </p>
          <p className="text-xs text-text-secondary">
            Runs a queued safe job or an approved risky job through the server dispatch adapter.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            disabled={isDispatching || dispatchableJobs.length === 0}
            className="min-w-0 flex-1 rounded border border-border bg-surface px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-pink-primary disabled:opacity-40"
          >
            {dispatchableJobs.length === 0 ? (
              <option value="">No dispatchable jobs</option>
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
            className="px-3 py-2 rounded border border-pink-primary bg-pink-primary text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isDispatching ? "Dispatching..." : "Dispatch to Agent"}
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
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide mb-1">
            Paste Agent Result JSON
          </p>
          <p className="text-xs text-text-secondary">
            Paste a JSON object matching the AgentResult schema. Use &quot;Parse JSON&quot; to validate before collecting.
          </p>
        </div>

        <textarea
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          rows={8}
          placeholder='{"id": "result-...", "dispatchJobId": "job-...", "taskId": "task-...", "agentId": "claude-code", "rawOutput": "...", "resultStatus": "pass", "timestamp": "2026-05-21T..."}'
          className="w-full rounded border border-border bg-surface px-3 py-2 text-xs font-mono text-text-primary placeholder:text-text-secondary resize-y focus:outline-none focus:border-pink-primary"
        />

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleParse}
            disabled={!jsonInput.trim()}
            className="px-3 py-1.5 rounded border border-border bg-surface text-xs font-medium text-text-secondary hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Parse JSON
          </button>
          <button
            type="button"
            onClick={handleCollect}
            disabled={!parsed}
            className="px-3 py-1.5 rounded border border-pink-primary bg-pink-primary text-white text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            Collect Result
          </button>
          {parsed && (
            <span className="text-xs text-emerald-400 font-medium">
              Valid — ready to collect
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
            <p className="text-xs font-semibold text-emerald-300 uppercase tracking-wide">Parsed Preview</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs text-text-secondary">
              <span>ID: <span className="font-mono text-text-primary">{parsed.id}</span></span>
              <span>Agent: <span className="text-text-primary">{parsed.agentId}</span></span>
              <span>Task: <span className="font-mono text-text-primary">{parsed.taskId}</span></span>
              <span className="flex items-center gap-1">Status: <StatusBadge status={parsed.resultStatus} /></span>
            </div>
          </div>
        )}
      </div>

      {/* Results list section */}
      <div className="space-y-2">
        <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide px-1">
          Collected Results ({results.length})
        </p>

        {sortedResults.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <p className="text-sm text-text-secondary">No results collected yet.</p>
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
