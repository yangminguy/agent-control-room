/**
 * Server-side approval token store for workbench execution.
 * Prevents client-side token forgery by issuing one-time, short-lived tokens.
 *
 * Token lifecycle:
 * 1. Client requests approval via /api/workbench/approval with context
 * 2. Server issues token tied to planId, taskId, agent, cwd
 * 3. Client uses token in /api/runner POST
 * 4. Server validates and consumes token (one-time use)
 * 5. Token expires after TTL
 */

export interface ApprovalTokenContext {
  planId: string;
  taskId: string;
  agent: "claude-code" | "codex" | "antigravity";
  cwd: string;
}

export interface StoredApprovalToken {
  token: string;
  context: ApprovalTokenContext;
  issuedAt: number;
  expiresAt: number;
  used: boolean;
}

// In-memory store: map token string -> StoredApprovalToken
// NOTE: Tokens are lost on server restart. For production, use Redis/database.
const tokenStore = new Map<string, StoredApprovalToken>();

export const TOKEN_TTL_MS = 5 * 60 * 1000; // 5 minutes expiry

/**
 * Issue a new approval token for the given context.
 * Token is one-time use and expires after TTL.
 */
export function issueApprovalToken(context: ApprovalTokenContext): string {
  const token = `appr-${Date.now()}-${crypto.randomUUID()}`;
  const now = Date.now();

  tokenStore.set(token, {
    token,
    context,
    issuedAt: now,
    expiresAt: now + TOKEN_TTL_MS,
    used: false,
  });

  return token;
}

/**
 * Validate and consume an approval token.
 * Returns context if valid, null if invalid/expired/already-used/wrong-context.
 */
export function validateAndConsumeApprovalToken(
  token: string,
  expectedContext: ApprovalTokenContext
): ApprovalTokenContext | null {
  const stored = tokenStore.get(token);

  if (!stored) {
    return null; // Token not issued
  }

  const now = Date.now();

  // Check expiry
  if (now > stored.expiresAt) {
    tokenStore.delete(token);
    return null; // Token expired
  }

  // Check one-time use
  if (stored.used) {
    return null; // Token already consumed
  }

  // Check context matches exactly
  const ctx = stored.context;
  if (
    ctx.planId !== expectedContext.planId ||
    ctx.taskId !== expectedContext.taskId ||
    ctx.agent !== expectedContext.agent ||
    ctx.cwd !== expectedContext.cwd
  ) {
    return null; // Context mismatch
  }

  // Mark as used and return context
  stored.used = true;
  return ctx;
}

/**
 * Clean up expired tokens periodically.
 * Call this from a background task or cron.
 */
export function cleanupExpiredTokens(): number {
  const now = Date.now();
  let count = 0;

  for (const [token, stored] of tokenStore.entries()) {
    if (now > stored.expiresAt) {
      tokenStore.delete(token);
      count++;
    }
  }

  return count;
}

/**
 * For testing: get token count (do not expose in production).
 */
export function getTokenCount(): number {
  return tokenStore.size;
}

/**
 * For testing: reset store (do not expose in production).
 */
export function resetTokenStore(): void {
  tokenStore.clear();
}
