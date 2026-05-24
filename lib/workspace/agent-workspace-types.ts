// Agent Control Room Workspace Types
// Based on vibe-kanban workspace-per-task pattern + CodexMonitor worktree structure

export type WorkspaceStatus =
  | "created"
  | "running"
  | "needs_review"
  | "qa_failed"
  | "approved"
  | "rejected"
  | "merged"
  | "archived";

export type WorkspaceArtifact = {
  type: "file" | "diff" | "test_result" | "screenshot";
  path: string;
  content?: string;
  metadata?: Record<string, unknown>;
};

export type AgentWorkspace = {
  id: string;
  taskId: string;
  planId?: string;

  primaryAgent: "claude-code" | "codex" | "antigravity";
  runtimeId:
    | "claude-direct"
    | "codex-direct"
    | "antigravity-direct"
    | "omc-runtime"
    | "omx-runtime"
    | "vibe-kanban-workbench";

  branchName: string;
  worktreePath?: string;
  terminalSessionId?: string;
  devServerUrl?: string;

  status: WorkspaceStatus;

  changedFiles: string[];
  artifacts: WorkspaceArtifact[];
  lastRunSummary?: string;

  createdAt: string;
  updatedAt: string;
};

export type WorkspaceDiff = {
  path: string;
  oldPath?: string;
  newPath?: string;
  change: "added" | "deleted" | "modified" | "renamed" | "copied";
  oldContent?: string;
  newContent?: string;
  additions?: number;
  deletions?: number;
  isBinary?: boolean;
  repoId?: string;
};

export type WorkspaceReviewRequest = {
  workspaceId: string;
  executor: "claude-code" | "codex" | "antigravity";
  additionalPrompt?: string;
  baseBranch?: string;
  baseCommit?: string;
};

export type WorkspaceReviewResult = {
  success: boolean;
  workspaceId: string;
  reviewedAt: string;
  comments?: Array<{
    path: string;
    line: number;
    text: string;
  }>;
  approval?: "approved" | "changes_requested" | "rejected";
  summary?: string;
};
