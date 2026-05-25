// Subagent Team Registry Types
// Based on mission-control skill-registry pattern

export type SubagentSource = "builtin" | "clawhub" | "skills-sh" | "custom";

export type SubagentSecurityReport = {
  level: "clean" | "warning" | "rejected";
  message: string;
  details?: string[];
};

export type SubagentSpec = {
  id: string;
  name: string;
  parentAgent: "claude-code" | "codex" | "antigravity";

  runtimePreference:
    | "claude-direct"
    | "codex-direct"
    | "antigravity-direct"
    | "omc-runtime"
    | "omx-runtime"
    | "vibe-kanban-workbench";

  role: string;
  bestFor: string[];
  notFor: string[];

  allowedFiles: string[];
  blockedFiles: string[];
  allowedCommands: string[];
  blockedCommands: string[];

  promptTemplatePath: string;
  obsidianPath: string;

  source: SubagentSource;
  sourceUrl?: string;
  sourceHash?: string;

  successCount: number;
  failureCount: number;
  lastUsedAt?: string;
  averageQualityScore?: number;
  status: "active" | "experimental" | "retired";

  securityReport: SubagentSecurityReport;
};

export type AgentTeamPlan = {
  id: string;
  taskId: string;
  parentAgent: "claude-code" | "codex" | "antigravity";
  teamMode:
    | "single_subagent"
    | "sequential_team"
    | "parallel_team"
    | "review_only_team";

  subagents: SubagentSpec[];
  coordinationStrategy: string;
  handoffRules: string[];
  monitoringRequired: boolean;
  hermesWatchRules: string[];

  createdAt: string;
  completedAt?: string;
};
