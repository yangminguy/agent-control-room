"use client";

import { type DispatchJob, type DispatchJobStatus } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Timed out";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

function formatAge(createdAt: string): string {
  const elapsed = Date.now() - new Date(createdAt).getTime();
  const sec = Math.floor(elapsed / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}

const STATUS_BADGE: Partial<Record<DispatchJobStatus, { label: string; cls: string }>> = {
  queued: { label: "Queued", cls: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  running: { label: "Running", cls: "bg-blue-900 text-blue-300 border-blue-700" },
  approved: { label: "Approved", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  completed: { label: "Completed", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  failed: { label: "Failed", cls: "bg-red-900 text-red-300 border-red-700" },
};

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

interface ApprovalCountdown {
  jobId: string;
  remainingMs: number;
}

interface ProgressManagerStatusViewProps {
  safeJobs: DispatchJob[];
  riskyJobs: DispatchJob[];
  approvalCountdowns: ApprovalCountdown[];
}

// ── Sub-components ────────────────────────────────────────

function JobRow({ job }: { job: DispatchJob }) {
  const badgeCfg = STATUS_BADGE[job.status] ?? { label: job.status, cls: "bg-zinc-700 text-zinc-300 border-zinc-600" };
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <div className="min-w-0 mr-3">
        <p className="text-xs font-mono text-text-primary truncate">{job.id}</p>
        <p className="text-xs text-text-secondary truncate">Task: {job.taskId}</p>
      </div>
      <Badge label={badgeCfg.label} cls={badgeCfg.cls} />
    </div>
  );
}

function RiskyJobRow({
  job,
  countdown,
}: {
  job: DispatchJob;
  countdown?: ApprovalCountdown;
}) {
  const remaining = countdown?.remainingMs ?? 0;
  const isRed = remaining < 60_000;
  const isYellow = remaining < 180_000 && !isRed;
  const countdownCls = isRed
    ? "text-red-400 font-bold"
    : isYellow
    ? "text-yellow-400"
    : "text-emerald-400";

  return (
    <div className="py-2 border-b border-border last:border-0">
      <div className="flex items-center justify-between">
        <div className="min-w-0 mr-3">
          <p className="text-xs font-mono text-text-primary truncate">{job.id}</p>
          <p className="text-xs text-text-secondary truncate">Task: {job.taskId} · Agent: {job.agentId}</p>
        </div>
        <span className="text-xs text-text-secondary shrink-0">{formatAge(job.createdAt)}</span>
      </div>
      {countdown && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-xs text-text-secondary">Approval timeout:</span>
          <span className={`text-xs font-mono ${countdownCls}`}>{formatCountdown(remaining)}</span>
          <div className="flex-1 h-1 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full rounded-full ${isRed ? "bg-red-500" : isYellow ? "bg-yellow-500" : "bg-emerald-500"}`}
              style={{ width: job.timeoutAt ? `${Math.min(100, Math.max(0, (remaining / (new Date(job.timeoutAt).getTime() - new Date(job.createdAt).getTime())) * 100))}%` : "0%" }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────

export function ProgressManagerStatusView({
  safeJobs,
  riskyJobs,
  approvalCountdowns,
}: ProgressManagerStatusViewProps) {
  const safeRunning = countByStatus(safeJobs, "running");
  const safeCompleted = countByStatus(safeJobs, "completed");
  const riskyQueued = countByStatus(riskyJobs, "queued");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Safe jobs section */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Safe Tasks</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {safeRunning} running · {safeCompleted} completed
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-emerald-400 font-medium">{safeJobs.length} total</span>
          </div>
        </div>

        {/* Progress bar */}
        {safeJobs.length > 0 && (
          <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${(safeCompleted / safeJobs.length) * 100}%` }}
            />
          </div>
        )}

        {safeJobs.length === 0 ? (
          <p className="text-xs text-text-secondary">No safe jobs.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {safeJobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </div>

      {/* Risky jobs section */}
      <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">Risky Tasks</p>
            <p className="text-xs text-text-secondary mt-0.5">
              {riskyQueued} awaiting approval · {riskyJobs.length} total
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-orange-500" />
            <span className="text-xs text-orange-400 font-medium">Approval required</span>
          </div>
        </div>

        {riskyJobs.length === 0 ? (
          <p className="text-xs text-text-secondary">No risky jobs pending.</p>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {riskyJobs.map((job) => {
              const countdown = approvalCountdowns.find((c) => c.jobId === job.id);
              return <RiskyJobRow key={job.id} job={job} countdown={countdown} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
