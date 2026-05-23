import { NextResponse } from "next/server";
import { getExecutionLogByTaskId } from "@/lib/storage/execution-log-store";
import { normalizeExecutionResult } from "@/lib/runner/execution-result-normalizer";
import type { ExecutionResultSummary } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/runner/result-summary?planId=...&taskId=...
 *
 * Returns the normalized ExecutionResultSummary for the most recent
 * ExecutionLog matching the given taskId. changedFiles comes from the
 * stored ExecutionLog — the runner already records these at completion
 * through the file-boundary check. No additional git commands are run.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const planId = searchParams.get("planId");
  const taskId = searchParams.get("taskId");

  if (!planId || !taskId) {
    return NextResponse.json(
      { error: "planId and taskId are required" },
      { status: 400 },
    );
  }

  const log = await getExecutionLogByTaskId(taskId);
  if (!log) {
    return NextResponse.json(
      { error: `No execution log found for taskId: ${taskId}` },
      { status: 404 },
    );
  }

  // changedFiles are extracted from log lines recorded by the runner
  // (lines starting with [BOUNDARY] or captured by git status --porcelain).
  // We reconstruct them from the stored logLines as a best-effort fallback
  // because the runner does not persist changedFiles directly on ExecutionLog.
  const changedFiles = extractChangedFilesFromLog(log.logLines);

  const summary: ExecutionResultSummary = normalizeExecutionResult(
    log,
    planId,
    changedFiles,
  );

  return NextResponse.json({ summary });
}

/**
 * Attempts to reconstruct the changed file list from log lines.
 * The runner emits "[BOUNDARY] Forbidden files touched: ..." lines
 * and "[INFO] ..." lines. If no structured lines are found, returns [].
 */
function extractChangedFilesFromLog(logLines: string[]): string[] {
  // Try to find boundary violation lines first
  for (const line of logLines) {
    if (line.startsWith("[BOUNDARY] Forbidden files touched: ")) {
      const raw = line.replace("[BOUNDARY] Forbidden files touched: ", "");
      return raw
        .split(",")
        .map((f) => f.trim())
        .filter(Boolean);
    }
  }

  // No structured file list in logs — caller (WorkbenchRunPanel) may supply
  // this from the analyzer result instead.
  return [];
}
