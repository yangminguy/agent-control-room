import type { ExecutionLog, ExecutionResultSummary, CheckResult } from "@/lib/types";

/**
 * Inspects log lines for a known check pattern (e.g. typecheck, lint) and
 * returns whether it passed, failed, or was not run.
 *
 * Looks for lines containing the check name alongside success/error keywords.
 * This is best-effort: if no matching line is found we return "not_run".
 */
function detectCheckResult(logLines: string[], checkName: string): CheckResult {
  const relevant = logLines.filter((line) =>
    line.toLowerCase().includes(checkName.toLowerCase()),
  );

  if (relevant.length === 0) return "not_run";

  const hasError = relevant.some((line) => {
    const lower = line.toLowerCase();
    return (
      lower.includes("error") ||
      lower.includes("failed") ||
      lower.includes("✗") ||
      lower.includes("× ") ||
      lower.includes("exit code: 1")
    );
  });

  return hasError ? "failed" : "passed";
}

/**
 * Derives a recommended next action from the normalized execution status
 * and whether any check failed.
 */
function deriveRecommendedNextAction(
  status: ExecutionLog["status"],
  checksRun: ExecutionResultSummary["checksRun"],
): ExecutionResultSummary["recommendedNextAction"] {
  if (status === "boundary_violation") return "manual_review";
  if (status === "review_blocked") return "manual_review";
  if (status === "failed") return "retry_same_agent";

  // status === "done" — check if any check failed
  const checkValues = Object.values(checksRun) as Array<CheckResult | undefined>;
  const anyFailed = checkValues.some((v) => v === "failed");
  if (anyFailed) return "handoff_to_agent";

  return "continue";
}

/**
 * Builds a failure reason string from the log when the execution did not
 * finish cleanly.
 */
function extractFailureReason(
  status: ExecutionLog["status"],
  logLines: string[],
): string | undefined {
  if (status === "done") return undefined;

  // Find the first [ERROR] or [REVIEW_BLOCKED] or [BOUNDARY] line
  const errorLine = logLines.find((line) =>
    line.startsWith("[ERROR]") ||
    line.startsWith("[REVIEW_BLOCKED]") ||
    line.startsWith("[BOUNDARY]"),
  );

  if (errorLine) return errorLine.replace(/^\[.*?\]\s*/, "").trim();

  // Fall back to the exit code line if present
  const doneLine = logLines.find((line) => line.startsWith("[DONE]"));
  if (doneLine) return doneLine;

  return `Execution ended with status: ${status}`;
}

/**
 * Normalizes a completed ExecutionLog into an ExecutionResultSummary.
 *
 * changedFiles: must be passed in from the caller (collected via git at
 * completion time in the runner route) because this function is pure and
 * does not perform I/O.
 *
 * checksRun: derived from log line inspection. No separate check commands
 * are re-run here — we parse what the agent already printed.
 */
export function normalizeExecutionResult(
  log: ExecutionLog,
  planId: string,
  changedFiles: string[],
): ExecutionResultSummary {
  const joinedLogs = log.logLines.join("\n");
  const logSummary = joinedLogs.slice(0, 200);

  const checksRun: ExecutionResultSummary["checksRun"] = {
    typecheck: detectCheckResult(log.logLines, "typecheck"),
    lint: detectCheckResult(log.logLines, "lint"),
    test: detectCheckResult(log.logLines, "test"),
    build: detectCheckResult(log.logLines, "build"),
  };

  const failureReason = extractFailureReason(log.status, log.logLines);
  const recommendedNextAction = deriveRecommendedNextAction(log.status, checksRun);

  return {
    planId,
    taskId: log.planTaskId,
    assignedAgent: log.agent,
    status: log.status,
    logSummary,
    changedFiles,
    checksRun,
    failureReason,
    recommendedNextAction,
  };
}
