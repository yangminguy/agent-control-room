import type { ApprovalRequest, DispatchJob } from "@/lib/types";

// ─── Task context supplied by the caller ─────────────────────────────────────

export type TaskContext = {
  taskId: string;
  taskTitle: string;
  acceptanceCriteria: string[];
};

// ─── Message builder ──────────────────────────────────────────────────────────

const APPROVAL_TIMEOUT_LABEL = "5 minutes";

/**
 * Build a Discord-ready approval message string for a risky task.
 * No Discord SDK or network calls involved — returns a plain string.
 */
export function buildDiscordApprovalMessage(
  approvalRequest: ApprovalRequest,
  dispatchJob: DispatchJob,
  taskContext: TaskContext,
): string {
  const criteria = taskContext.acceptanceCriteria.slice(0, 3);
  const criteriaLines =
    criteria.length > 0
      ? criteria.map((c, i) => `  ${i + 1}. ${c}`).join("\n")
      : "  (none provided)";

  return [
    "**[APPROVAL REQUIRED] Risky Task Detected**",
    "",
    `**Task ID:** \`${taskContext.taskId}\``,
    `**Task:** ${taskContext.taskTitle}`,
    `**Agent:** \`${dispatchJob.agentId}\``,
    `**Risk Level:** \`${dispatchJob.riskLevel.toUpperCase()}\``,
    `**Approval Request ID:** \`${approvalRequest.id}\``,
    "",
    "**Acceptance Criteria (first 3):**",
    criteriaLines,
    "",
    "**Action Options:**",
    "  - **Approve** — proceed with task execution",
    "  - **Reject** — cancel this task",
    "  - **Defer** — skip now and re-queue later",
    "",
    `**Timeout:** This request will expire in **${APPROVAL_TIMEOUT_LABEL}** if no action is taken.`,
    `**Created:** ${approvalRequest.createdAt}`,
  ].join("\n");
}

// ─── Mock response simulator (for testing) ───────────────────────────────────

/**
 * Simulate a Discord response message for testing purposes.
 * Does not interact with Discord in any way.
 */
export function buildDiscordMockResponse(
  action: "approve" | "reject" | "defer",
): string {
  const actionLabels: Record<typeof action, string> = {
    approve: "APPROVED",
    reject: "REJECTED",
    defer: "DEFERRED",
  };

  return `[MOCK DISCORD RESPONSE] Action: ${actionLabels[action]} — simulated at ${new Date().toISOString()}`;
}
