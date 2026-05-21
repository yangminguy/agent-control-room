"use client";

import { useState, useEffect } from "react";
import type { OrchestrationMetrics } from "@/lib/types";

export function OrchestrationMetricsPanel() {
  const [metrics, setMetrics] = useState<OrchestrationMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchMetrics() {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/orchestration/metrics");
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setMetrics(data.metrics as OrchestrationMetrics);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchMetrics();
  }, []);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <p className="text-sm text-text-secondary">Loading metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-800 bg-red-950/30 p-6">
        <p className="text-sm text-red-400">Error: {error}</p>
        <button
          type="button"
          onClick={fetchMetrics}
          className="mt-2 text-xs text-pink-primary underline hover:no-underline"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!metrics || metrics.totalJobs === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-text-primary">Orchestration Metrics</h2>
          <button
            type="button"
            onClick={fetchMetrics}
            className="px-3 py-1 rounded border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
          >
            Refresh
          </button>
        </div>
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-text-secondary">No job data yet. Dispatch some jobs to see metrics.</p>
        </div>
      </div>
    );
  }

  const successRate =
    metrics.totalJobs > 0
      ? ((metrics.successCount / metrics.totalJobs) * 100).toFixed(1)
      : "0.0";

  const avgDuration =
    metrics.avgDurationMs != null
      ? `${(metrics.avgDurationMs / 1000).toFixed(1)}s`
      : "—";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Orchestration Metrics</h2>
        <button
          type="button"
          onClick={fetchMetrics}
          className="px-3 py-1 rounded border border-border text-xs text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* 2x2 stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-xs text-text-secondary">Total Jobs</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{metrics.totalJobs}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-xs text-text-secondary">Success Rate</p>
          <p className="text-2xl font-bold text-emerald-400 mt-1">{successRate}%</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-xs text-text-secondary">Avg Duration</p>
          <p className="text-2xl font-bold text-text-primary mt-1">{avgDuration}</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-4">
          <p className="text-xs text-text-secondary">Timeouts</p>
          <p className="text-2xl font-bold text-yellow-400 mt-1">{metrics.timeoutCount}</p>
        </div>
      </div>

      {/* Per-agent table */}
      {metrics.perAgent.length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2">
              <tr>
                <th className="text-left px-4 py-2 text-xs font-medium text-text-secondary">Agent</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-text-secondary">Total</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-text-secondary">Success</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-text-secondary">Failed</th>
                <th className="text-right px-4 py-2 text-xs font-medium text-text-secondary">Avg Duration</th>
              </tr>
            </thead>
            <tbody>
              {metrics.perAgent.map((row) => (
                <tr key={row.agentId} className="border-t border-border">
                  <td className="px-4 py-2 text-text-primary font-medium">{row.agentId}</td>
                  <td className="px-4 py-2 text-right text-text-secondary">{row.totalJobs}</td>
                  <td className="px-4 py-2 text-right text-emerald-400">{row.successCount}</td>
                  <td className="px-4 py-2 text-right text-red-400">{row.failedCount}</td>
                  <td className="px-4 py-2 text-right text-text-secondary">
                    {row.avgDurationMs != null ? `${(row.avgDurationMs / 1000).toFixed(1)}s` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-text-secondary">
        Computed at {new Date(metrics.computedAt).toLocaleString()}
      </p>
    </div>
  );
}
