/**
 * GET /api/execution-runs/:run_id — ACR Kernel execution-run lookup (PRD §9.2)
 *
 * 단일 run의 현재 상태/agent/worktree/branch/log tail/changed files를 반환한다.
 */

import { getExecutionRun } from "@/lib/storage/execution-run-store";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  try {
    const { run_id } = await params;
    const run = await getExecutionRun(run_id);
    if (!run) {
      return Response.json({ error: `run not found: ${run_id}` }, { status: 404 });
    }

    return Response.json({
      run_id: run.id,
      task_id: run.taskId,
      status: run.status,
      agent: run.agent,
      worktree_path: run.worktreePath ?? null,
      branch: run.runBranch ?? null,
      current_phase: run.currentPhase ?? null,
      checks: run.checks,
      log_tail: run.logTail ?? "",
      changed_files: run.changedFiles,
      diff_stat: run.diffStat ?? null,
      result_summary: run.resultSummary ?? null,
      next_action: run.nextAction ?? null,
      created_at: run.createdAt,
      updated_at: run.updatedAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
