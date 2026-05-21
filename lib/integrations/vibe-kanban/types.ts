/**
 * Vibe Kanban Bridge Type System
 *
 * Types for the Agent Control Room ↔ Vibe Kanban bridge layer.
 * Agent Control Room owns product intent, task decomposition, and prompt generation.
 * Vibe Kanban owns session lifecycle, git worktrees, diff/review UI, and workspaces.
 */

export type VibeBridgeKind =
  | "workspace"
  | "session"
  | "issue"
  | "diff"
  | "markdown";

export interface VibeBridgeData {
  kind: VibeBridgeKind;
  projectId?: string;
  taskId?: string;
  agentId?: string;
  title?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface VibeBridgeWorkspace {
  kind: "workspace";
  projectId: string;
  workspaceName: string;
  branch?: string;
  agent?: string;
  notes?: string;
}

export interface VibeBridgeSession {
  kind: "session";
  projectId: string;
  sessionId?: string;
  taskTitle: string;
  agentId: string;
  prompt: string;
  acceptanceCriteria?: string[];
  doNotTouchFiles?: string[];
}

export interface VibeBridgeIssue {
  kind: "issue";
  projectId: string;
  statusId: string;
  title: string;
  description: string;
  priority: "urgent" | "high" | "medium" | "low";
  agentId?: string;
  metadata?: Record<string, unknown>;
}

export interface VibeBridgeDiff {
  kind: "diff";
  sessionId: string;
  changedFiles: string[];
  summary: string;
  accepted?: boolean;
  notes?: string;
}

export interface VibeBridgeMarkdown {
  kind: "markdown";
  title: string;
  body: string;
  tags?: string[];
}

export type VibeBridgePayload =
  | VibeBridgeWorkspace
  | VibeBridgeSession
  | VibeBridgeIssue
  | VibeBridgeDiff
  | VibeBridgeMarkdown;
