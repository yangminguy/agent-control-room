import type { AgentType } from "@/lib/types";

// Risk assessment for compiled prompts
export type RiskLevel = "low" | "medium" | "high";

// Whether the work is safe to run in parallel
export type ParallelSafety = "safe" | "caution" | "unsafe";

// Conflict risk with other work streams
export type ConflictRisk = "low" | "medium" | "high";

// High-risk action flags
export type HighRiskAction =
  | "deployment"
  | "db-migration"
  | "package-change"
  | "file-deletion"
  | "git-push"
  | "auto-merge"
  | "auth-security"
  | "unknown-install"
  | "hermes-autonomous"
  | "runner-changes"
  | "env-variable"
  | "other";

// Core output from the Senior Dev Prompt Compiler
export interface SeniorDevCompiledPrompt {
  id: string;
  title: string;

  // Target execution agent
  targetAgent: AgentType | "hermes" | "vibe-kanban" | "manual";
  agentReason: string;

  // Risk assessment
  riskLevel: RiskLevel;
  riskDescription?: string;
  highRiskActions: HighRiskAction[];
  userApprovalRequired: boolean;

  // Parallel execution safety
  parallelSafety: ParallelSafety;
  conflictRisk: ConflictRisk;
  conflictDescription?: string;

  // Work scope and boundaries
  context: string;
  goal: string;
  scope: string;
  nonGoals: string[];

  // File boundaries (critical for safety)
  allowedFiles: string[];
  doNotTouchFiles: string[];

  // Work definition
  requiredWork: string[];
  doNotDoRules: string[];

  // Acceptance and validation
  acceptanceCriteria: string[];
  validationCommands: string[];

  // Handoff
  finalHandoffOutput: string;

  // Availability-aware recommendations (optional — added by availability check)
  suggestedHandoffRequired?: boolean;
  suggestedFallbackAgent?: string;
  suggestedContextPackRequired?: boolean;
  contextPackNotes?: string;

  // Copy-ready markdown prompt (all sections included)
  generatedPromptMarkdown: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Input to the compiler
export interface PromptCompilerInput {
  projectName: string;
  projectContext: string;
  userRequest: string; // Raw request from the user
  taskTitle?: string;
  acceptanceCriteria?: string[];
  allowedFiles?: string[]; // Task-specific allowed files (if provided, use these instead of defaults)
  doNotTouchFiles?: string[]; // Task-specific files to never modify
  preferredAgent?: AgentType | "auto";
  isRisky?: boolean; // Hint: user explicitly says this is risky
}

// Agent role definition
export interface AgentRoleDefinition {
  agent: AgentType | "hermes" | "vibe-kanban" | "manual";
  name: string;
  strengths: string[];
  weaknesses: string[];
  bestFor: string[];
  avoidWhen: string[];
  isExecutionAgent: boolean; // true = can execute code changes
  isBackgroundWorker: boolean; // true = hermes, memory/summary only
  isApprovalGate: boolean; // true = manual/user approval required
}

// Safety rule for detecting high-risk work
export interface SafetyRule {
  pattern: RegExp;
  action: HighRiskAction;
  severity: "warning" | "critical";
  requiresApproval: boolean;
}

// Agent routing decision
export interface AgentRoutingDecision {
  recommendedAgent: AgentType | "hermes" | "vibe-kanban" | "manual";
  primaryReason: string;
  fallbackAgent?: AgentType | "hermes" | "vibe-kanban" | "manual";
  fallbackReason?: string;
  handoffRequired: boolean;
}
