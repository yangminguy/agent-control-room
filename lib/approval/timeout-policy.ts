// ─── Constants ────────────────────────────────────────────────────────────────

/** Approval timeout: 5 minutes in milliseconds */
export const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000;

// ─── Pure functions ───────────────────────────────────────────────────────────

/**
 * Returns true if the approval request has timed out.
 * Accepts either a Date object or an ISO 8601 string.
 */
export function hasApprovalTimedOut(createdAt: Date | string): boolean {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  return Date.now() - created.getTime() >= APPROVAL_TIMEOUT_MS;
}

/**
 * Returns the remaining milliseconds before the approval request times out.
 * Returns 0 if already timed out.
 * Accepts either a Date object or an ISO 8601 string.
 */
export function getApprovalTimeoutRemaining(createdAt: Date | string): number {
  const created = typeof createdAt === "string" ? new Date(createdAt) : createdAt;
  const elapsed = Date.now() - created.getTime();
  return Math.max(0, APPROVAL_TIMEOUT_MS - elapsed);
}
