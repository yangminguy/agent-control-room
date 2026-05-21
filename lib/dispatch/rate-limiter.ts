const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

// Module-level store: ip -> array of timestamps (ms)
const store = new Map<string, number[]>();

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSecs: number };

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now();
  const timestamps = (store.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_REQUESTS) {
    const oldest = timestamps[0];
    const retryAfterSecs = Math.ceil((oldest + WINDOW_MS - now) / 1000);
    store.set(ip, timestamps);
    return { allowed: false, retryAfterSecs };
  }

  timestamps.push(now);
  store.set(ip, timestamps);
  return { allowed: true };
}

/** Reset all rate limit state. Used in tests. */
export function resetRateLimiter(): void {
  store.clear();
}
