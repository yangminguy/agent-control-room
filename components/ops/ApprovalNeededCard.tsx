"use client";

export type RiskLevel = "medium" | "high" | "critical";

export interface PendingAction {
  taskId: string;
  actionType: string;
  riskLevel: RiskLevel;
  createdAt: string; // ISO 8601
  expiresAt?: string; // ISO 8601 — optional
}

export interface ApprovalNeededCardProps {
  pendingActions: PendingAction[];
  onApprove?: (taskId: string) => void;
  onReject?: (taskId: string) => void;
}

const RISK_CLASSES: Record<RiskLevel, string> = {
  medium: "border-yellow-300 bg-yellow-50",
  high: "border-orange-300 bg-orange-50",
  critical: "border-red-300 bg-red-50",
};

const RISK_BADGE: Record<RiskLevel, string> = {
  medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
  high: "bg-orange-100 text-orange-800 border-orange-300",
  critical: "bg-red-100 text-red-800 border-red-300",
};

const RISK_LABEL: Record<RiskLevel, string> = {
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

function formatRelativeTime(iso: string): string {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

function expiresInSeconds(iso: string): number {
  return Math.floor((new Date(iso).getTime() - Date.now()) / 1000);
}

export function ApprovalNeededCard({
  pendingActions,
  onApprove,
  onReject,
}: ApprovalNeededCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Approval Needed</h2>
        {pendingActions.length > 0 && (
          <span className="rounded-full bg-red-100 border border-red-200 px-2 py-0.5 text-[11px] font-bold text-red-700">
            {pendingActions.length}
          </span>
        )}
      </div>

      {pendingActions.length === 0 ? (
        <p className="text-xs text-text-secondary italic">No pending approvals.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {pendingActions.map((action) => {
            const secsLeft = action.expiresAt ? expiresInSeconds(action.expiresAt) : null;
            const isExpiringSoon = secsLeft !== null && secsLeft < 300 && secsLeft > 0;
            const isExpired = secsLeft !== null && secsLeft <= 0;

            return (
              <li
                key={action.taskId}
                className={`rounded-lg border-2 p-3 flex flex-col gap-2 ${RISK_CLASSES[action.riskLevel]}`}
              >
                {/* Row 1: task + risk badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <span className="text-xs font-medium text-text-primary truncate">
                      {action.actionType}
                    </span>
                    <span className="text-[10px] text-text-secondary font-mono">
                      {action.taskId}
                    </span>
                  </div>
                  <span
                    className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold ${RISK_BADGE[action.riskLevel]}`}
                  >
                    {RISK_LABEL[action.riskLevel]}
                  </span>
                </div>

                {/* Row 2: created time + expiry countdown */}
                <div className="flex items-center gap-3 text-[10px] text-text-secondary">
                  <span>Created {formatRelativeTime(action.createdAt)}</span>
                  {isExpired && (
                    <span className="font-semibold text-red-600">Expired</span>
                  )}
                  {isExpiringSoon && !isExpired && (
                    <span className="font-semibold text-red-600 animate-pulse">
                      Expires in {secsLeft}s
                    </span>
                  )}
                </div>

                {/* Row 3: approve / reject buttons */}
                {!isExpired && (onApprove || onReject) && (
                  <div className="flex items-center gap-2 mt-1">
                    {onApprove && (
                      <button
                        type="button"
                        onClick={() => onApprove(action.taskId)}
                        className="rounded px-3 py-1 text-[11px] font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        Approve
                      </button>
                    )}
                    {onReject && (
                      <button
                        type="button"
                        onClick={() => onReject(action.taskId)}
                        className="rounded px-3 py-1 text-[11px] font-semibold bg-white border border-red-300 text-red-700 hover:bg-red-50 transition-colors"
                      >
                        Reject
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
