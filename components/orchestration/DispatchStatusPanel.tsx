"use client";

import Link from "next/link";
import { type DispatchJob, type DispatchJobStatus, type RiskLevel } from "@/lib/types";

// ── Badge configs ─────────────────────────────────────────

const STATUS_BADGE: Record<DispatchJobStatus, { label: string; cls: string }> = {
  queued: { label: "대기 중", cls: "bg-zinc-700 text-zinc-300 border-zinc-600" },
  running: { label: "실행 중", cls: "bg-blue-900 text-blue-300 border-blue-700" },
  approved: { label: "승인됨", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  skipped_due_to_risk: { label: "위험으로 생략", cls: "bg-orange-900 text-orange-300 border-orange-700" },
  completed: { label: "완료됨", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  failed: { label: "실패", cls: "bg-red-900 text-red-300 border-red-700" },
};

const RISK_BADGE: Record<RiskLevel, { label: string; cls: string }> = {
  safe: { label: "안전", cls: "bg-emerald-900 text-emerald-300 border-emerald-700" },
  low: { label: "낮음", cls: "bg-yellow-900 text-yellow-300 border-yellow-700" },
  medium: { label: "중간", cls: "bg-orange-900 text-orange-300 border-orange-700" },
  high: { label: "높음", cls: "bg-red-900 text-red-300 border-red-700" },
  critical: { label: "치명적", cls: "bg-red-950 text-red-200 border-red-800 font-bold" },
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
  all: "전체",
  queued: "대기 중",
  running: "실행 중",
  approved: "승인됨",
  skipped_due_to_risk: "생략됨",
  completed: "완료됨",
  failed: "실패",
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
        <span className="text-text-primary font-medium">총 {jobs.length}개 작업</span>
        {(["queued", "running", "approved", "skipped_due_to_risk", "completed", "failed"] as DispatchJobStatus[]).map(
          (s) => {
            const count = countByStatus(jobs, s);
            if (count === 0) return null;
            return (
              <span key={s}>
                {count} {STATUS_LABELS[s]}
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
          <p className="text-sm text-text-secondary">아직 실행 대기 중인 작업이 없습니다.</p>
          <p className="text-sm text-text-secondary mt-1">기획 채팅에서 작업을 만들면 여기에 표시됩니다.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_1fr_auto_auto_1fr_auto] gap-3 px-4 py-2 bg-surface-2 border-b border-border text-xs font-semibold text-text-secondary uppercase tracking-wide">
            <span>작업 / 태스크</span>
            <span>에이전트</span>
            <span>리스크</span>
            <span>상태</span>
            <span>타임스탬프</span>
            <span>액션</span>
          </div>

          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((job) => {
              const statusCfg = STATUS_BADGE[job.status];
              const riskCfg = RISK_BADGE[job.riskLevel];
              const canRunInWorkbench = job.featurePlanId && job.taskId;
              return (
                <div
                  key={job.id}
                  className="grid grid-cols-[1fr_1fr_auto_auto_1fr_auto] gap-3 px-4 py-3 items-start hover:bg-surface-2 transition-colors"
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
                    <p>생성: {formatTs(job.createdAt)}</p>
                    {job.approvedAt && <p>승인: {formatTs(job.approvedAt)}</p>}
                    {job.timeoutAt && <p>타임아웃: {formatTs(job.timeoutAt)}</p>}
                    {job.completedAt && <p>완료: {formatTs(job.completedAt)}</p>}
                    {job.retryCount > 0 && (
                      <p className="text-orange-400">재시도: {job.retryCount}</p>
                    )}
                  </div>

                  {/* Workbench action */}
                  <div className="self-center">
                    {canRunInWorkbench ? (
                      <Link
                        href={`/workbench?planId=${job.featurePlanId}&taskId=${job.taskId}`}
                        className="inline-flex items-center px-2 py-1 rounded border border-pink-primary text-pink-primary text-xs font-medium hover:bg-pink-primary/10 transition-colors whitespace-nowrap"
                      >
                        워크벤치
                      </Link>
                    ) : (
                      <span className="text-xs text-text-secondary">—</span>
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
