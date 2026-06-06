/**
 * POST /api/execution-runs/:run_id/result — ACR Kernel result submission (PRD §9.3)
 *
 * 실행 종료 시 status / changed_files / checks / diff_stat / summary / next_action을
 * 받아 run에 반영한다(Result Packet 회수). 존재하지 않는 run은 404.
 */

import { getExecutionRun, updateExecutionRun } from "@/lib/storage/execution-run-store";
import type {
  ExecutionChecks,
  ExecutionRunStatus,
} from "@/lib/execution-run/types";

export const runtime = "nodejs";

const STATUSES = new Set<ExecutionRunStatus>([
  "queued",
  "running",
  "needs_approval",
  "verifying",
  "passed",
  "failed",
  "blocked",
  "cancelled",
  "boundary_violation",
]);

type ResultBody = {
  status?: string;
  changed_files?: string[];
  checks?: ExecutionChecks;
  diff_stat?: string;
  log_tail?: string;
  summary?: string;
  next_action?: string;
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  const { run_id } = await params;

  let body: ResultBody;
  try {
    body = (await request.json()) as ResultBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.status || !STATUSES.has(body.status as ExecutionRunStatus)) {
    return Response.json({ error: `invalid or missing status: ${body.status}` }, { status: 400 });
  }

  const existing = await getExecutionRun(run_id);
  if (!existing) {
    return Response.json({ error: `run not found: ${run_id}` }, { status: 404 });
  }

  try {
    const updated = await updateExecutionRun(run_id, {
      status: body.status as ExecutionRunStatus,
      changedFiles: body.changed_files,
      checks: body.checks,
      diffStat: body.diff_stat,
      logTail: body.log_tail,
      resultSummary: body.summary,
      nextAction: body.next_action,
    });

    return Response.json({
      run_id,
      status: updated?.status,
      updated_at: updated?.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
