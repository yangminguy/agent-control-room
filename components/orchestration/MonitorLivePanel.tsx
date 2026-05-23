"use client";

import { useEffect, useState } from "react";
import { useOrchestration } from "@/lib/dispatch/orchestration-context";
import type { MonitorAnalysis } from "@/lib/types";
import type { MonitorPacket } from "@/lib/monitor/types";

// ── Types ─────────────────────────────────────────────────────────────────────

type ApiStatus = {
  isHealthy: boolean;
  status: "healthy" | "degraded" | "critical" | "error";
  error?: string;
};

type PanelState = {
  analysis: MonitorAnalysis | null;
  isAnalyzing: boolean;
  isSaving: boolean;
  savedPath: string | null;
  error: string | null;
  apiStatus: ApiStatus | null;
  hermesPackets: MonitorPacket[];
  loadingPackets: boolean;
};

// ── Sub-components ────────────────────────────────────────────────────────────

function InsightCards({ insights }: { insights: string[] }) {
  return (
    <div className="grid gap-2 sm:grid-cols-3">
      {insights.map((insight, i) => (
        <div
          key={i}
          className="rounded-lg border border-border bg-surface-1 p-3 text-xs text-text-secondary leading-relaxed"
        >
          <span className="block text-[10px] font-semibold text-pink-primary mb-1 uppercase tracking-wide">
            Insight {i + 1}
          </span>
          {insight}
        </div>
      ))}
    </div>
  );
}

function RecommendationList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-xs text-text-secondary">
          <span className="text-emerald-400 font-bold shrink-0">{i + 1}.</span>
          {item}
        </li>
      ))}
    </ul>
  );
}

function RiskFlagList({ flags }: { flags: string[] }) {
  if (flags.length === 0) {
    return (
      <p className="text-xs text-emerald-400">No risk flags detected.</p>
    );
  }

  return (
    <ul className="space-y-1.5">
      {flags.map((flag, i) => (
        <li
          key={i}
          className="flex gap-2 text-xs text-red-300 bg-red-950 border border-red-800 rounded px-2 py-1.5"
        >
          <span className="font-bold shrink-0">!</span>
          {flag}
        </li>
      ))}
    </ul>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function MonitorLivePanel() {
  const { jobs, results, approvals } = useOrchestration();

  const [state, setState] = useState<PanelState>({
    analysis: null,
    isAnalyzing: false,
    isSaving: false,
    savedPath: null,
    error: null,
    apiStatus: null,
    hermesPackets: [],
    loadingPackets: true,
  });

  // Fetch Hermes packets on mount
  useEffect(() => {
    const fetchPackets = async () => {
      try {
        const response = await fetch("/api/hermes/packets?limit=5");
        if (!response.ok) throw new Error("Failed to fetch packets");
        const data = await response.json() as { packets: MonitorPacket[] };
        setState((prev) => ({
          ...prev,
          hermesPackets: data.packets || [],
          loadingPackets: false,
        }));
      } catch (error) {
        console.error("Error fetching Hermes packets:", error);
        setState((prev) => ({
          ...prev,
          loadingPackets: false,
        }));
      }
    };

    fetchPackets();
    const interval = setInterval(fetchPackets, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, []);

  // Build orchestration state from context
  function buildOrchestrationState() {
    return {
      totalJobs: jobs.length,
      activeJobs: jobs.filter((j) => j.status === "running").length,
      failedJobs: jobs.filter((j) => j.status === "failed").length,
      pendingApprovals: approvals.filter((a) => a.status === "pending").length,
      recentEvents: results.slice(0, 5).map((r) => `${r.agentId}: ${r.resultStatus}`),
    };
  }

  async function runAnalysis() {
    setState((prev) => ({ ...prev, isAnalyzing: true, error: null, savedPath: null }));

    try {
      const res = await fetch("/api/monitor/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: buildOrchestrationState() }),
      });

      const data = (await res.json()) as {
        analysis: MonitorAnalysis;
        apiStatus?: ApiStatus;
      };

      if (!res.ok) {
        throw new Error(data.apiStatus?.error || `Server error: ${res.status}`);
      }

      setState((prev) => ({
        ...prev,
        analysis: data.analysis,
        apiStatus: data.apiStatus || null,
        isAnalyzing: false,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setState((prev) => ({ ...prev, error: message, isAnalyzing: false }));
    }
  }

  async function saveToObsidian() {
    if (!state.analysis) return;

    setState((prev) => ({ ...prev, isSaving: true, error: null }));

    try {
      const res = await fetch("/api/monitor/save-note", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: state.analysis,
          title: `Hermes Analysis — ${new Date().toLocaleDateString()}`,
          tags: ["hermes", "analysis", "orchestration"],
        }),
      });

      if (!res.ok) {
        throw new Error(`Save failed: ${res.status}`);
      }

      const data = (await res.json()) as { savedPath: string };
      setState((prev) => ({ ...prev, savedPath: data.savedPath, isSaving: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed";
      setState((prev) => ({ ...prev, error: message, isSaving: false }));
    }
  }

  // Auto-analyze on mount
  useEffect(() => {
    void runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { analysis, isAnalyzing, isSaving, savedPath, error, apiStatus } = state;

  const getStatusBadge = () => {
    if (!apiStatus) return null;

    const styles = {
      healthy: "bg-emerald-950 border-emerald-700 text-emerald-300",
      degraded: "bg-yellow-950 border-yellow-700 text-yellow-300",
      critical: "bg-red-950 border-red-700 text-red-300",
      error: "bg-red-950 border-red-700 text-red-300",
    };

    const icons = {
      healthy: "✓",
      degraded: "⚠",
      critical: "✕",
      error: "✕",
    };

    const labels = {
      healthy: "API 정상",
      degraded: "API 저하",
      critical: "API 중단",
      error: "API 오류",
    };

    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded border ${styles[apiStatus.status]}`}
      >
        <span className="font-bold">{icons[apiStatus.status]}</span>
        {labels[apiStatus.status]}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header + controls + API status */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">Hermes Live Analysis</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              백그라운드 Hermes Agent (Gemini 1.5 Flash) — 오케스트레이션 보조, 코드 작성 안 함
            </p>
          </div>
          {getStatusBadge()}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void runAnalysis()}
            disabled={isAnalyzing}
            className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-surface-2 text-text-secondary hover:text-text-primary hover:bg-surface-3 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Now"}
          </button>

          <button
            type="button"
            onClick={() => void saveToObsidian()}
            disabled={!analysis || isSaving}
            className="px-3 py-1.5 text-xs font-medium rounded border border-emerald-700 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : "Save to Obsidian"}
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded border border-red-700 bg-red-950 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Save confirmation */}
      {savedPath && (
        <div className="rounded border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs text-emerald-300">
          Saved to: <span className="font-mono break-all">{savedPath}</span>
        </div>
      )}

      {/* Loading skeleton */}
      {isAnalyzing && !analysis && (
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-lg bg-surface-2" />
          <div className="h-16 rounded-lg bg-surface-2" />
          <div className="h-12 rounded-lg bg-surface-2" />
        </div>
      )}

      {/* Analysis results */}
      {analysis && (
        <div className="space-y-4">
          {/* Insights */}
          <section>
            <h3 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wide">
              Insights
            </h3>
            <InsightCards insights={analysis.insights} />
          </section>

          {/* Recommendations */}
          <section className="rounded-lg border border-border bg-surface-1 p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wide">
              Recommendations
            </h3>
            <RecommendationList items={analysis.recommendations} />
          </section>

          {/* Risk Flags */}
          <section className="rounded-lg border border-border bg-surface-1 p-4">
            <h3 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wide">
              Risk Flags
            </h3>
            <RiskFlagList flags={analysis.riskFlags} />
          </section>

          {/* Timestamp */}
          <p className="text-[10px] text-text-secondary text-right">
            Analyzed at: {new Date(analysis.analyzedAt).toLocaleString()}
          </p>
        </div>
      )}

      {/* Empty state before first analysis */}
      {!isAnalyzing && !analysis && !error && (
        <div className="rounded-lg border border-dashed border-border p-8 text-center">
          <p className="text-sm text-text-secondary">
            Click &quot;Analyze Now&quot; to run Gemma 4 orchestration analysis.
          </p>
        </div>
      )}

      {/* Phase G+: Hermes Execution Packets */}
      <section className="rounded-lg border border-border bg-surface-1 p-4 space-y-3">
        <h3 className="text-xs font-semibold text-text-primary uppercase tracking-wide">
          📦 Hermes Execution Packets
        </h3>

        {state.loadingPackets ? (
          <div className="space-y-2">
            <div className="h-10 rounded bg-surface-2 animate-pulse" />
            <div className="h-10 rounded bg-surface-2 animate-pulse" />
          </div>
        ) : state.hermesPackets.length === 0 ? (
          <p className="text-xs text-text-secondary text-center py-4">
            아직 Hermes 패킷이 없습니다. 작업이 완료되면 여기에 표시됩니다.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {state.hermesPackets.map((packet) => {
              const kindEmoji: Record<string, string> = {
                "phase-completion": "✅",
                failure: "❌",
                "drift-detection": "⚠️",
                "approval-request": "🔒",
                "re-orchestration": "🔄",
              };

              const emoji = kindEmoji[packet.kind] || "📌";
              const ctx = packet.executionContext;

              return (
                <div
                  key={packet.id}
                  className="rounded bg-surface-2 p-2.5 text-xs border border-border/40 hover:border-border transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <span className="text-sm">{emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-text-primary truncate">
                        {packet.title}
                      </p>
                      <p className="text-text-secondary line-clamp-1">
                        {packet.description}
                      </p>
                      {ctx && (
                        <div className="mt-1.5 flex flex-wrap gap-1">
                          {ctx.taskId && (
                            <span className="inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                              task: {ctx.taskId}
                            </span>
                          )}
                          {ctx.status && (
                            <span className="inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
                              {ctx.status}
                            </span>
                          )}
                          {ctx.recommendedNextAction && (
                            <span className="inline-block rounded bg-surface px-1.5 py-0.5 font-mono text-[10px] text-amber-300">
                              → {ctx.recommendedNextAction}
                            </span>
                          )}
                        </div>
                      )}
                      <p className="text-[10px] text-text-tertiary mt-1">
                        {new Date(packet.createdAt).toLocaleTimeString("ko-KR")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
