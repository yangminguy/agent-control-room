"use client";

export type AgentRuntimeStatus = "available" | "busy" | "rate-limited";

export interface AgentRuntimeRow {
  agentName: string;
  status: AgentRuntimeStatus;
  tokensUsed: number;
  tokenQuota: number;
}

export interface RuntimeStatusCardProps {
  agents: AgentRuntimeRow[];
}

const STATUS_LABEL: Record<AgentRuntimeStatus, string> = {
  available: "Available",
  busy: "Busy",
  "rate-limited": "Rate Limited",
};

const STATUS_BADGE: Record<AgentRuntimeStatus, string> = {
  available: "bg-green-100 text-green-800 border-green-300",
  busy: "bg-blue-100 text-blue-800 border-blue-300",
  "rate-limited": "bg-red-100 text-red-800 border-red-300",
};

const STATUS_DOT: Record<AgentRuntimeStatus, string> = {
  available: "bg-green-500",
  busy: "bg-blue-500",
  "rate-limited": "bg-red-500",
};

function TokenBar({ used, quota }: { used: number; quota: number }) {
  const pct = quota > 0 ? Math.min(100, (used / quota) * 100) : 0;
  const colorClass =
    pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-blue-500";

  return (
    <div className="flex items-center gap-2 text-[10px] text-text-secondary">
      <div className="h-1.5 flex-1 rounded-full bg-border overflow-hidden">
        <div
          className={`h-full rounded-full ${colorClass} transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="shrink-0 font-mono">
        {used.toLocaleString()} / {quota.toLocaleString()}
      </span>
    </div>
  );
}

export function RuntimeStatusCard({ agents }: RuntimeStatusCardProps) {
  const rateLimited = agents.filter((a) => a.status === "rate-limited");

  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Runtime Status</h2>
        {rateLimited.length > 0 && (
          <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
            {rateLimited.length} rate-limited
          </span>
        )}
      </div>

      {/* Agent rows */}
      {agents.length === 0 ? (
        <p className="text-xs text-text-secondary italic">No agent runtime data.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {agents.map((agent) => (
            <li
              key={agent.agentName}
              className="rounded-lg border border-border bg-surface-2 p-3 flex flex-col gap-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[agent.status]}`}
                  />
                  <span className="text-xs font-medium text-text-primary truncate">
                    {agent.agentName}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE[agent.status]}`}
                >
                  {STATUS_LABEL[agent.status]}
                </span>
              </div>

              <div className="flex flex-col gap-1">
                <p className="text-[10px] text-text-secondary">Token usage</p>
                <TokenBar used={agent.tokensUsed} quota={agent.tokenQuota} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
