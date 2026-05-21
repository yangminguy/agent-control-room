import { RetryPolicy } from "@/lib/types";

export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2.0,
};

export function calculateRetryDelay(
  attemptNumber: number,
  policy: RetryPolicy
): number {
  const exponentialDelay =
    policy.initialDelayMs * Math.pow(policy.backoffMultiplier, attemptNumber - 1);
  return Math.min(exponentialDelay, policy.maxDelayMs);
}

export function shouldRetry(attemptNumber: number, policy: RetryPolicy): boolean {
  return attemptNumber < policy.maxRetries;
}

export function formatRetrySchedule(delayMs: number): string {
  const seconds = Math.round(delayMs / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

export type RetryableError = {
  code: string;
  isRetryable: boolean;
  message: string;
};

export function classifyError(errorMessage: string, errorCode?: string): RetryableError {
  const lowerMsg = errorMessage.toLowerCase();

  // Network/transient errors (retryable)
  if (
    lowerMsg.includes("econnrefused") ||
    lowerMsg.includes("enotfound") ||
    lowerMsg.includes("timeout") ||
    lowerMsg.includes("econnreset")
  ) {
    return {
      code: errorCode || "TRANSIENT_ERROR",
      isRetryable: true,
      message: "Transient network error - will retry",
    };
  }

  // Rate limiting (retryable with backoff)
  if (
    lowerMsg.includes("rate limit") ||
    lowerMsg.includes("429") ||
    lowerMsg.includes("too many requests")
  ) {
    return {
      code: "RATE_LIMIT",
      isRetryable: true,
      message: "Rate limited - will retry with exponential backoff",
    };
  }

  // Validation/config errors (not retryable)
  if (
    lowerMsg.includes("not found") ||
    lowerMsg.includes("invalid") ||
    lowerMsg.includes("forbidden") ||
    lowerMsg.includes("403") ||
    lowerMsg.includes("404")
  ) {
    return {
      code: errorCode || "VALIDATION_ERROR",
      isRetryable: false,
      message: "Validation error - will not retry",
    };
  }

  // Fatal errors (not retryable)
  if (
    lowerMsg.includes("out of memory") ||
    lowerMsg.includes("stack overflow") ||
    lowerMsg.includes("segmentation fault")
  ) {
    return {
      code: "FATAL_ERROR",
      isRetryable: false,
      message: "Fatal error - will not retry",
    };
  }

  // Default to retryable for unknown errors
  return {
    code: errorCode || "UNKNOWN_ERROR",
    isRetryable: true,
    message: "Unknown error - will retry once",
  };
}
