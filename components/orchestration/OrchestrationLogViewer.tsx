"use client";

import { useEffect, useState } from "react";
import type { OrchestrationLogEvent } from "@/lib/types";

// ── Event color badge map ─────────────────────────────────────────────────────

const EVENT_COLORS: Record<string, string> = {
  job_dispatched: "bg-blue-900 text-blue-200 border border-blue-700",
  job_started: "bg-cyan-900 text-cyan-200 border border-cyan-700",
  job_completed: "bg-emerald-900 text-emerald-200 border border-emerald-700",
  approval_timeout: "bg-red-900 text-red-200 border border-red-700",
  approval_resolved: "bg-orange-900 text-orange-200 border border-orange-700",
  feedback_generated: "bg-purple-900 text-purple-200 border border-purple-700",
  result_collected: "bg-yellow-900 text-yellow-200 border border-yellow-700",
  status_changed: "bg-zinc-800 text-zinc-300 border border-zinc-600",
};

const EVENT_OPTIONS = [
  "all",
  "job_dispatched",
  "job_started",
  "job_completed",
  "approval_timeout",
  "approval_resolved",
  "feedback_generated",
  "result_collected",
  "status_changed",
] as const;

type EventFilterOption = (typeof EVENT_OPTIONS)[number];

// ── Component ─────────────────────────────────────────────────────────────────

export function OrchestrationLogViewer() {
  const [logs, setLogs] = useState<OrchestrationLogEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [eventFilter, setEventFilter] = useState<EventFilterOption>("all");
  const [total, setTotal] = useState(0);

  const fetchLogs = (filter: EventFilterOption) => {
    setIsLoading(true);
    const url =
      filter === "all"
        ? "/api/orchestration/logs?limit=100"
        : `/api/orchestration/logs?limit=100&event=${filter}`;

    fetch(url)
      .then((res) => res.json())
      .then((data: { events: OrchestrationLogEvent[]; total: number }) => {
        setLogs(data.events ?? []);
        setTotal(data.total ?? 0);
      })
      .catch(() => {
        setLogs([]);
        setTotal(0);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchLogs(eventFilter);
  }, [eventFilter]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEventFilter(e.target.value as EventFilterOption);
  };

  const handleRefresh = () => {
    fetchLogs(eventFilter);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <label className="text-sm text-text-secondary" htmlFor="event-filter">
          Filter by event:
        </label>
        <select
          id="event-filter"
          value={eventFilter}
          onChange={handleFilterChange}
          className="text-sm rounded border border-border bg-surface-2 text-text-primary px-2 py-1"
        >
          {EVENT_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "all" ? "All Events" : opt}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs rounded border border-border bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3 transition-colors disabled:opacity-50"
        >
          {isLoading ? "Loading..." : "Refresh"}
        </button>
        {total > 0 && (
          <span className="text-xs text-text-secondary ml-auto">
            Showing {logs.length} of {total} events
          </span>
        )}
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="rounded-lg border border-border p-8 text-center">
          <div className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-border border-t-text-secondary" />
          <p className="mt-2 text-sm text-text-secondary">Loading logs...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-secondary">
            {eventFilter === "all"
              ? "No logs yet. Logs appear here after orchestration events are triggered."
              : `No events match filter: ${eventFilter}`}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-3 py-2 text-left text-text-secondary font-medium whitespace-nowrap">
                  Timestamp
                </th>
                <th className="px-3 py-2 text-left text-text-secondary font-medium whitespace-nowrap">
                  Event
                </th>
                <th className="px-3 py-2 text-left text-text-secondary font-medium whitespace-nowrap">
                  Job ID
                </th>
                <th className="px-3 py-2 text-left text-text-secondary font-medium whitespace-nowrap">
                  Agent
                </th>
                <th className="px-3 py-2 text-left text-text-secondary font-medium whitespace-nowrap">
                  Risk
                </th>
                <th className="px-3 py-2 text-left text-text-secondary font-medium">
                  Detail
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr
                  key={`${log.jobId}-${log.timestamp}-${i}`}
                  className="border-b border-border last:border-0 hover:bg-surface-2 transition-colors"
                >
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap font-mono">
                    {new Date(log.timestamp).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    <span
                      className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                        EVENT_COLORS[log.event] ?? "bg-zinc-800 text-zinc-300"
                      }`}
                    >
                      {log.event}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-text-secondary font-mono whitespace-nowrap">
                    {log.jobId.substring(0, 20)}
                    {log.jobId.length > 20 ? "..." : ""}
                  </td>
                  <td className="px-3 py-2 text-text-secondary whitespace-nowrap">
                    {log.agentId ?? "-"}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap">
                    {log.riskLevel ? (
                      <span className="text-text-secondary">{log.riskLevel}</span>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td className="px-3 py-2 text-text-secondary max-w-xs truncate">
                    {log.detail
                      ? log.detail.substring(0, 80) +
                        (log.detail.length > 80 ? "..." : "")
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
