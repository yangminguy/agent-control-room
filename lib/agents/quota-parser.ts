/**
 * Quota & Rate Limit Parser
 *
 * Parses error messages from various agents to extract quota/rate limit information.
 * Updates model and agent registries with quota status and retry time.
 */

import { updateModel, getModelsByQuotaStatus } from "./model-registry";
import { updateAgentRuntime } from "./runtime-registry";

export type QuotaParseResult = {
  status: "rate_limited" | "token_exhausted" | "unknown";
  source: "codex" | "claude" | "antigravity" | "unknown";
  nextRetryAt?: string;
  reason: string;
};

/**
 * Parse Codex rate limit error
 * Example: "You've hit your usage limit. Upgrade to Pro (...), visit ... to purchase more credits or try again at May 27th, 2026 3:58 PM."
 */
function parseCodexError(errorMessage: string): QuotaParseResult | null {
  // Check for hit your usage limit phrase
  if (errorMessage.includes("hit your usage limit") || errorMessage.includes("usage limit")) {
    // Try to extract date info with flexible pattern
    // Matches: "May 27th, 2026 3:58 PM" or "May 27 2026 3:58 PM" etc
    const dateMatch = errorMessage.match(
      /(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?[\s,]*(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)/i
    );

    if (dateMatch) {
      try {
        const [, month, day, year, hour, minute, meridiem] = dateMatch;
        // Construct a date string that JavaScript can parse
        let hourNum = parseInt(hour, 10);
        if (meridiem.toUpperCase() === "PM" && hourNum !== 12) {
          hourNum += 12;
        } else if (meridiem.toUpperCase() === "AM" && hourNum === 12) {
          hourNum = 0;
        }

        // Create date: "Month Day, Year HH:MM" format that JS can parse
        const dateStr = `${month} ${day}, ${year} ${String(hourNum).padStart(2, "0")}:${minute}`;
        const parsedDate = new Date(dateStr);

        if (!isNaN(parsedDate.getTime())) {
          return {
            status: "rate_limited",
            source: "codex",
            nextRetryAt: parsedDate.toISOString(),
            reason: "Codex usage limit hit",
          };
        }
      } catch (e) {
        // Fall through to generic response
      }
    }

    return {
      status: "rate_limited",
      source: "codex",
      reason: "Codex usage limit hit",
    };
  }

  return null;
}

/**
 * Parse Claude API rate limit error
 * Example: "429 Rate limit reached. Retry after 30 seconds."
 */
function parseClaudeError(errorMessage: string): QuotaParseResult | null {
  // Check for rate limit
  if (
    errorMessage.includes("Rate limit") ||
    errorMessage.includes("rate limit")
  ) {
    // Try to extract retry-after seconds
    const secondsMatch = errorMessage.match(/after (\d+) seconds/i);
    if (secondsMatch) {
      const seconds = parseInt(secondsMatch[1], 10);
      const nextRetryAt = new Date(
        Date.now() + seconds * 1000
      ).toISOString();

      return {
        status: "rate_limited",
        source: "claude",
        nextRetryAt,
        reason: "Claude API rate limit",
      };
    }

    return {
      status: "rate_limited",
      source: "claude",
      reason: "Claude API rate limit",
    };
  }

  // Check for overloaded
  if (errorMessage.includes("overloaded")) {
    return {
      status: "rate_limited",
      source: "claude",
      reason: "Claude API overloaded",
    };
  }

  return null;
}

/**
 * Parse Antigravity quota error
 */
function parseAntigravityError(errorMessage: string): QuotaParseResult | null {
  if (errorMessage.includes("quota") || errorMessage.includes("limit")) {
    return {
      status: "token_exhausted",
      source: "antigravity",
      reason: "Antigravity quota exhausted",
    };
  }

  return null;
}

/**
 * Generic error parser that tries all known patterns
 */
export function parseQuotaError(
  errorMessage: string
): QuotaParseResult | null {
  // Try specific parsers
  let result = parseCodexError(errorMessage);
  if (result) return result;

  result = parseClaudeError(errorMessage);
  if (result) return result;

  result = parseAntigravityError(errorMessage);
  if (result) return result;

  // No known pattern matched
  return null;
}

/**
 * Update registries based on quota parse result
 */
export function applyQuotaParseResult(
  parseResult: QuotaParseResult
): void {
  if (parseResult.source === "codex") {
    // Update Codex model status
    const codexModels = getModelsByQuotaStatus("rate_limited").filter(
      (m) => m.agentId === "codex"
    );

    for (const model of codexModels) {
      updateModel(model.id, {
        quotaStatus: parseResult.status === "rate_limited" ? "rate_limited" : "exhausted",
        nextRefreshAt: parseResult.nextRetryAt,
      });
    }

    // Also try other Codex models
    updateModel("gpt-5.5", {
      quotaStatus: parseResult.status === "rate_limited" ? "rate_limited" : "exhausted",
      nextRefreshAt: parseResult.nextRetryAt,
    });

    // Update agent status
    updateAgentRuntime("codex", {
      status: parseResult.status === "rate_limited" ? "rate_limited" : "token_exhausted",
      nextRetryAt: parseResult.nextRetryAt,
      lastFailureReason: parseResult.reason,
    });
  } else if (parseResult.source === "claude") {
    // Update Claude agent status
    updateAgentRuntime("claude-code", {
      status: "rate_limited",
      nextRetryAt: parseResult.nextRetryAt,
      lastFailureReason: parseResult.reason,
    });
  } else if (parseResult.source === "antigravity") {
    // Update Antigravity status
    updateAgentRuntime("antigravity", {
      status: "token_exhausted",
      lastFailureReason: parseResult.reason,
    });
  }
}

/**
 * Check if an error string looks like a quota/rate limit error
 */
export function isQuotaError(errorMessage: string): boolean {
  return parseQuotaError(errorMessage) !== null;
}

/**
 * Get next retry time from a parsed result
 */
export function getNextRetryTime(
  parseResult: QuotaParseResult
): Date | null {
  if (parseResult.nextRetryAt) {
    return new Date(parseResult.nextRetryAt);
  }
  return null;
}
