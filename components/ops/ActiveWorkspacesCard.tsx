"use client";

export type WorkspaceStatus = "running" | "needs_review" | "approved";

export interface ActiveWorkspace {
  id: string;
  task: string;
  primaryAgent: string;
  status: WorkspaceStatus;
  branch: string;
  detailHref?: string;
}

interface ActiveWorkspacesCardProps {
  workspaces: ActiveWorkspace[];
}

const STATUS_LABEL: Record<WorkspaceStatus, string> = {
  running: "Running",
  needs_review: "Needs Review",
  approved: "Approved",
};

const STATUS_CLASSES: Record<WorkspaceStatus, string> = {
  running: "bg-blue-100 text-blue-800 border-blue-200",
  needs_review: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
};

const STATUS_DOT: Record<WorkspaceStatus, string> = {
  running: "bg-blue-500",
  needs_review: "bg-yellow-500",
  approved: "bg-green-500",
};

export function ActiveWorkspacesCard({ workspaces }: ActiveWorkspacesCardProps) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-primary">Active Workspaces</h2>
        <span className="text-xs text-text-secondary">{workspaces.length} active</span>
      </div>

      {/* List */}
      {workspaces.length === 0 ? (
        <p className="text-xs text-text-secondary italic">No active workspaces.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {workspaces.map((ws) => (
            <li
              key={ws.id}
              className="flex flex-col gap-1.5 rounded-lg border border-border bg-surface-2 p-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${STATUS_DOT[ws.status]}`}
                  />
                  <span className="truncate text-xs font-medium text-text-primary">
                    {ws.task}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded border px-2 py-0.5 text-[10px] font-semibold ${STATUS_CLASSES[ws.status]}`}
                >
                  {STATUS_LABEL[ws.status]}
                </span>
              </div>

              <div className="flex items-center gap-3 text-[11px] text-text-secondary">
                <span>
                  <span className="font-medium">ID:</span> {ws.id}
                </span>
                <span>
                  <span className="font-medium">Agent:</span> {ws.primaryAgent}
                </span>
                <span className="font-mono">
                  <span className="font-medium not-italic">Branch:</span> {ws.branch}
                </span>
              </div>

              {ws.detailHref && (
                <a
                  href={ws.detailHref}
                  className="mt-0.5 self-start text-[11px] font-medium text-pink-primary hover:underline"
                >
                  View detail
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
