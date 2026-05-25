"use client";

import { useEffect, useState } from "react";
import type {
  PacketAnalytics,
  ExecutionMetrics,
  TimelineAnalysis,
} from "@/lib/monitor/hermes-analytics";

interface AnalyticsResponse {
  analytics: PacketAnalytics;
  metrics: ExecutionMetrics;
  timeline: TimelineAnalysis[];
  summary: string;
  generatedAt: string;
}

export function HermesAnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  async function fetchAnalytics() {
    try {
      const res = await fetch("/api/hermes/analytics?metrics=detailed");
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-32 rounded-lg bg-surface-2" />
        <div className="h-24 rounded-lg bg-surface-2" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded border border-red-700 bg-red-950 p-4 text-sm text-red-300">
        {error}
      </div>
    );
  }

  if (!data) return null;

  const { analytics, metrics, timeline } = data;
  const riskTotal =
    analytics.riskDistribution.low +
    analytics.riskDistribution.medium +
    analytics.riskDistribution.high;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Hermes Analytics
        </h2>
        <p className="text-xs text-text-secondary">
          실행 패킷 기반 분석 대시보드
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {/* Success Rate */}
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">
            Success Rate
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {analytics.successRate}%
          </p>
          <p className="text-[10px] text-text-secondary mt-1">
            {metrics.successfulExecutions}/{metrics.totalExecutions} completed
          </p>
        </div>

        {/* Total Packets */}
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">
            Total Packets
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {analytics.totalPackets}
          </p>
          <p className="text-[10px] text-text-secondary mt-1">
            {analytics.recentPackets.length} recent
          </p>
        </div>

        {/* Avg Completion */}
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">
            Avg Completion
          </p>
          <p className="text-2xl font-bold text-text-primary">
            {analytics.averageTaskCompletionTime}m
          </p>
          <p className="text-[10px] text-text-secondary mt-1">per task</p>
        </div>

        {/* Failures */}
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <p className="text-xs text-text-secondary uppercase tracking-wide mb-2">
            Failures
          </p>
          <p className="text-2xl font-bold text-red-400">
            {metrics.failedExecutions}
          </p>
          <p className="text-[10px] text-text-secondary mt-1">
            {metrics.driftDetections} drifts
          </p>
        </div>
      </div>

      {/* Packet Distribution */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">
          Packet Distribution
        </h3>
        <div className="space-y-2">
          {Object.entries(analytics.packetsByKind)
            .sort(([, a], [, b]) => b - a)
            .map(([kind, count]) => (
              <div key={kind} className="flex items-center gap-2">
                <span className="text-xs text-text-secondary flex-shrink-0 w-24">
                  {kind}
                </span>
                <div className="flex-1 bg-surface-2 rounded h-2">
                  <div
                    className="h-full bg-emerald-500 rounded"
                    style={{
                      width: `${(count / analytics.totalPackets) * 100}%`,
                    }}
                  />
                </div>
                <span className="text-xs text-text-secondary w-8 text-right">
                  {count}
                </span>
              </div>
            ))}
        </div>
      </div>

      {/* Risk Distribution */}
      <div className="rounded-lg border border-border bg-surface-1 p-4">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">
          Risk Distribution
        </h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-emerald-400">
              {analytics.riskDistribution.low}
            </p>
            <p className="text-xs text-text-secondary mt-1">Low</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">
              {analytics.riskDistribution.medium}
            </p>
            <p className="text-xs text-text-secondary mt-1">Medium</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">
              {analytics.riskDistribution.high}
            </p>
            <p className="text-xs text-text-secondary mt-1">High</p>
          </div>
        </div>
      </div>

      {/* Failure Patterns */}
      {analytics.failurePatterns.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">
            Failure Patterns
          </h3>
          <div className="space-y-3">
            {analytics.failurePatterns.map((pattern) => (
              <div
                key={pattern.kind}
                className="rounded border border-red-800 bg-red-950 p-3"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-red-300">
                    {pattern.kind}
                  </span>
                  <span className="text-xs text-red-400">
                    {pattern.count} ({pattern.percentage.toFixed(1)}%)
                  </span>
                </div>
                {pattern.recentExamples.length > 0 && (
                  <p className="text-[10px] text-red-300 opacity-75">
                    Latest: {pattern.recentExamples[0]?.title}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="rounded-lg border border-border bg-surface-1 p-4">
          <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide mb-3">
            Timeline
          </h3>
          <div className="space-y-1 text-[10px]">
            {timeline.slice(0, 5).map((entry) => (
              <div key={entry.timestamp} className="flex items-center gap-2">
                <span className="text-text-secondary w-14 flex-shrink-0">
                  {entry.timestamp}
                </span>
                <span className="text-text-primary font-semibold">
                  {entry.packetsGenerated}
                </span>
                <span className="text-text-secondary">
                  ({entry.topKinds.map((k) => `${k.kind}: ${k.count}`).join(", ")})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-[10px] text-text-secondary text-right">
        Updated: {new Date(data.generatedAt).toLocaleString("ko-KR")}
      </p>
    </div>
  );
}
