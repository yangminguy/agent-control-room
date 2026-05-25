// Release Gate Action Envelope
// Captures approved actions and validates execution against approval

import crypto from "crypto";

export type ActionType =
  | "git_push"
  | "preview_deploy"
  | "production_deploy"
  | "db_migration"
  | "package_install"
  | "env_change"
  | "destructive_git"
  | "telegram_approval_authority";

export type RiskLevel = "medium" | "high" | "critical";

export type ActionEnvelope = {
  id: string;
  taskId: string;
  workspaceId?: string;
  subagentTeamId?: string;

  actionType: ActionType;
  command: string;
  changedFiles: string[];
  riskLevel: RiskLevel;

  riskExplanation: string;
  rollbackPlan: string;
  requiredChecks: string[];

  createdAt: string;
  expiresAt: string;
  requestedBy: "control_tower" | "runtime_router" | "hermes";
  approver?: string;
  approvedAt?: string;

  intentHash: string;
  executionResult?: string;
};

/**
 * Generate intent hash from envelope contents
 * Used to verify that what was approved matches what gets executed
 */
export function generateIntentHash(envelope: Omit<ActionEnvelope, "intentHash">): string {
  const content = JSON.stringify({
    actionType: envelope.actionType,
    command: envelope.command,
    changedFiles: envelope.changedFiles.sort(),
    riskLevel: envelope.riskLevel,
  });

  return crypto.createHash("sha256").update(content).digest("hex");
}

/**
 * Create a new action envelope
 */
export function createActionEnvelope(options: {
  taskId: string;
  actionType: ActionType;
  command: string;
  changedFiles: string[];
  riskLevel: RiskLevel;
  riskExplanation: string;
  rollbackPlan: string;
  requiredChecks: string[];
  expiresInMinutes?: number;
}): ActionEnvelope {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + (options.expiresInMinutes || 30) * 60000);

  const envelope: Omit<ActionEnvelope, "intentHash"> = {
    id,
    taskId: options.taskId,
    actionType: options.actionType,
    command: options.command,
    changedFiles: options.changedFiles,
    riskLevel: options.riskLevel,
    riskExplanation: options.riskExplanation,
    rollbackPlan: options.rollbackPlan,
    requiredChecks: options.requiredChecks,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    requestedBy: "control_tower",
  };

  return {
    ...envelope,
    intentHash: generateIntentHash(envelope),
  };
}

/**
 * Verify that executed command matches approved action
 */
export function verifyActionEnvelopeExecution(
  envelope: ActionEnvelope,
  executedCommand: string
): boolean {
  // Verify:
  // 1. intentHash matches (approved action unchanged)
  // 2. command matches exactly
  // 3. not expired
  // 4. approver exists

  if (!envelope.approver) {
    return false;
  }

  const now = new Date();
  if (new Date(envelope.expiresAt) < now) {
    return false;
  }

  if (envelope.command !== executedCommand) {
    return false;
  }

  const verifyHash = generateIntentHash({
    id: envelope.id,
    taskId: envelope.taskId,
    actionType: envelope.actionType,
    command: envelope.command,
    changedFiles: envelope.changedFiles,
    riskLevel: envelope.riskLevel,
    riskExplanation: envelope.riskExplanation,
    rollbackPlan: envelope.rollbackPlan,
    requiredChecks: envelope.requiredChecks,
    createdAt: envelope.createdAt,
    expiresAt: envelope.expiresAt,
    requestedBy: envelope.requestedBy,
  });

  return verifyHash === envelope.intentHash;
}
