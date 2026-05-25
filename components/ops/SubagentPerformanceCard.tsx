"use client";

export interface SubagentMetrics {
  name: string;
  successRate: number; // 0–100
  totalRuns: number;
  averageQualityScore: number; // 0–100
}

export interface RetiredSubagent {
  name: string;
  reason: string;
}

export interface SubagentPerformanceCardProps {
  totalRuns: number;
  overallSuccessRate: number; // 0–100
  averageQualityScore: number; // 0–100
  topPerformers: SubagentMetrics[];
  recentRetirements: RetiredSubagent[];
}

function ProgressBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  const colorClass =
    clamped >= 80
      ? "bg-green-500"
      : clamped >= 50
      ? "bg-yellow-500"
      : "bg-red-500";

  return (
    <div className="h-1.5 w-full rounded-full bg-border overflow-hidden">
      <div
        className={`h-full rounded-full ${colorClass} transition-all duration-300`}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

export function SubagentPerformanceCard({
  totalRuns,
  overallSuccessRate,
  averageQualityScore,
  topPerformers,
  recentRetirements,
}: SubagentPerformanceCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Header */}
      <h2 className="text-sm font-semibold text-text-primary">Subagent Performance</h2>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{totalRuns}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">Total Runs</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{overallSuccessRate.toFixed(0)}%</p>
          <p className="text-[10px] text-text-secondary mt-0.5">Success Rate</p>
        </div>
        <div className="rounded-lg border border-border bg-surface-2 p-3 text-center">
          <p className="text-lg font-bold text-text-primary">{averageQualityScore.toFixed(0)}</p>
          <p className="text-[10px] text-text-secondary mt-0.5">Avg Quality</p>
        </div>
      </div>

      {/* Top performers */}
      {topPerformers.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Top Performers
          </p>
          <ul className="flex flex-col gap-2">
            {topPerformers.slice(0, 3).map((agent) => (
              <li key={agent.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-text-primary">{agent.name}</span>
                  <span className="text-text-secondary">
                    {agent.successRate.toFixed(0)}% · {agent.totalRuns} runs
                  </span>
                </div>
                <ProgressBar value={agent.successRate} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Recent retirements */}
      {recentRetirements.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Recent Retirements
          </p>
          <ul className="flex flex-col gap-1.5">
            {recentRetirements.map((r) => (
              <li
                key={r.name}
                className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs"
              >
                <span className="font-medium text-red-800">{r.name}</span>
                <span className="text-red-600"> — {r.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
