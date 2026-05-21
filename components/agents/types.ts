export type AgentType =
  | "claude_code"
  | "codex"
  | "antigravity"
  | "hermes"
  | "vibe_kanban"
  | "manual_user";

export type AgentAvailability =
  | "available"
  | "working"
  | "idle"
  | "cooling_down"
  | "token_limited"
  | "context_overloaded"
  | "blocked"
  | "background_worker"
  | "approval_required"
  | "disconnected";

export interface AgentStatus {
  id: string;
  type: AgentType;
  name: string;
  role: string;
  availability: AgentAvailability;
  currentTask?: string;
  bestFor: string[];
  notFor?: string[];
  nextRecommendedAction?: string;
}
