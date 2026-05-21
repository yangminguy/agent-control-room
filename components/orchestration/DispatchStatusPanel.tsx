"use client";

import { type DispatchJob, type DispatchJobStatus, type RiskLevel } from "@/lib/types";

// ── Badge configs ─────────────────────────────────────────

const STATUS_BADGE: Record<DispatchJobStatus, { label: string; cls: string }> = {
  queued: { label: "Queued", cls: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  running: { label: "Running", cls: "bg-blue-900 text-blue-300 border-blue-700" },
  approved: { label: "Approved", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  skipped_due_to_risk: { label: "Skipped", cls: "bg-orange-900 text-orange-300 border-orange-700" },
  completed: { label: "Completed", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  failed: { label: "Failed", cls: "bg-red-900 text-red-300 border-red-700" },
};

const RISK_BADGE: Record<RiskLevel, { label: string; cls: string }> = {
  safe: { label: "Safe", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  low: { label: "Low", cls: "bg-yellow-900 text-yellow-300 border-yellow-700" },
  medium: { label: "Medium", cls: "bg-orange-900 text-orange-300 border-orange-700" },
  high: { label: "High", cls: "bg-red-900 text-red-300 border-red-700" },
  critical: { label: "Critical", cls: "bg-red-950 text-red-200 border-red-800 font-bold" },
};

const ALL_STATUSES: Array<DispatchJobStatus | "all"> = [
  "all",
  "queued",
  "running",
  "approved",
  "skipped_due_to_risk",
  "completed",
  "failed",
];

const STATUS_LABELS: Record<DispatchJobStatus | "all", string> = {
  all: "All",
  queued: "Queued",
  running: "Running",
  approved: "Approved",
  skipped_due_to_risk: "Skipped",
  completed: "Completed",
  failed: "Failed",
};

// ── Helpers ───────────────────────────────────────────────

function formatTs(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function Badge({ label, cls }: { label: string; cls: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function countByStatus(jobs: DispatchJob[], status: DispatchJobStatus) {
  return jobs.filter((j) => j.status === status).length;
}

// ── Props ─────────────────────────────────────────────────

interface DispatchStatusPanelProps {
  jobs: DispatchJob[];
  selectedStatus?: DispatchJobStatus | "all";
  onStatusFilterChange?: (status: DispatchJobStatus | "all") => void;
}

// ── Component ─────────────────────────────────────────────

export function DispatchStatusPanel({
  jobs,
  selectedStatus = "all",
  onStatusFilterChange,
}: DispatchStatusPanelProps) {
  const filtered = selectedStatus === "all" ? jobs : jobs.filter((j) => j.status === selectedStatus);

  return (
    <div className="space-y-4">
      {/* Summary counts */}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary px-1">
        <span className="text-text-primary font-medium">{jobs.length} jobs total</span>
        {(["queued", "running", "approved", "skipped_due_to_risk", "completed", "failed"] as DispatchJobStatus[]).map(
          (s) => {
            const count = countByStatus(jobs, s);
            if (count === 0) return null;
            return (
              <span key={s}>
                {count} {STATUS_LABELS[s].toLowerCase()}
              </span>
            );
          }
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1">
        {ALL_STATUSES.map((s) => {
          const isActive = selectedStatus === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => onStatusFilterChange?.(s)}
              className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                isActive
                  ? "border-pink-primary bg-pink-primary text-white"
                  : "border-border bg-surface text-text-secondary hover:bg-surface-2"
              }`}
            >
              {STATUS_LABELS[s]}
            </button>
          );
        })}
      </div>

      {/* Job list */}
      {filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-6 text-center">
          <p className="text-sm text-text-secondary">No jobs match the current filter.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_1fr] gap-3 px-4 py-2 bg-surface-2 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wide">
            <span>Job / Task</span>
            <span>Agent</span>
            <span>Risk</span>
            <span>Status</span>
            <span>Timestamps</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((job) => {
              const statusCfg = STATUS_BADGE[job.status];
              const riskCfg = RISK_BADGE[job.riskLevel];
              return (
                <div
                  key={job.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_1fr] gap-3 px-4 py-3 items-start hover:bg-surface-2 transition-colors"
                >
                  {/* ID / Task */}
                  <div className="min-w-0">
                    <p className="text-xs font-mono text-text-primary truncate">{job.id}</p>
                    <p className="text-xs text-text-secondary truncate mt-0.5">Task: {job.taskId}</p>
                  </div>

                  {/* Agent */}
                  <div className="text-xs text-text-primary font-medium self-center">{job.agentId}</div>

                  {/* Risk badge */}
                  <div className="self-center">
                    <Badge label={riskCfg.label} cls={riskCfg.cls} />
                  </div>

                  {/* Status badge */}
                  <div className="self-center">
                    <Badge label={statusCfg.label} cls={statusCfg.cls} />
                  </div>

                  {/* Timestamps */}
                  <div className="space-y-0.5 text-xs text-text-secondary">
                    <p>Created: {formatTs(job.createdAt)}</p>
                    {job.approvedAt && <p>Approved: {formatTs(job.approvedAt)}</p>}
                    {job.timeoutAt && <p>Timeout: {formatTs(job.timeoutAt)}</p>}
                    {job.completedAt && <p>Completed: {formatTs(job.completedAt)}</p>}
                    {job.retryCount > 0 && (
                      <p className="text-orange-400">Retries: {job.retryCount}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
