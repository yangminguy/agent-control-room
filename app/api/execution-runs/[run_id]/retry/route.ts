/**
 * POST /api/execution-runs/:run_id/retry — re-run a settled ExecutionRun
 * (PRD §16 recommendation `retry_same_agent` / §18.1 control-room retry).
 *
 * Loads the original run, creates a NEW run with the SAME work order (prompt,
 * agent, repo, complexity, mode, boundaries) and returns its run_id. The
 * original run is left intact as history. An optional `agent` override lets the
 * caller retry with a different CLI (e.g. retry_with_verifier escalation).
 *
 * Like POST /api/execution-runs, the live CLI is only triggered when
 * ACR_EXECUTION_TRIGGER=on; otherwise the new run sits as `queued`.
 */

import {
  getExecutionRun,
  createExecutionRun,
} from "@/lib/storage/execution-run-store";
import type { ExecutionAgent } from "@/lib/execution-run/types";
import { triggerHarnessRun } from "@/lib/harness/live-runner";
import { isRunnerAgent } from "@/lib/execution-run/runner-adapter";

export const runtime = "nodejs";

const AGENTS = new Set<ExecutionAgent>(["claude-code", "codex", "antigravity", "hermes"]);

type RetryBody = { agent?: string };

export async function POST(
  request: Request,
  { params }: { params: Promise<{ run_id: string }> },
) {
  const { run_id } = await params;

  let body: RetryBody = {};
  try {
    body = (await request.json()) as RetryBody;
  } catch {
    /* empty body is fine — retry with same agent */
  }

  if (body.agent !== undefined && !AGENTS.has(body.agent as ExecutionAgent)) {
    return Response.json({ error: `unsupported agent: ${body.agent}` }, { status: 400 });
  }

  const original = await getExecutionRun(run_id);
  if (!original) {
    return Response.json({ error: `run not found: ${run_id}` }, { status: 404 });
  }

  try {
    const retried = await createExecutionRun({
      taskId: original.taskId,
      repoPath: original.repoPath,
      baseBranch: original.baseBranch,
      agent: (body.agent as ExecutionAgent) ?? original.agent,
      prompt: original.prompt,
      acceptanceCriteria: original.acceptanceCriteria,
      allowedFiles: original.allowedFiles,
      blockedFiles: original.blockedFiles,
      complexity: original.complexity,
      mode: original.mode,
      riskLevel: original.riskLevel,
    });

    if (process.env.ACR_EXECUTION_TRIGGER === "on" && isRunnerAgent(retried.agent)) {
      void triggerHarnessRun(retried).catch((err) => {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[execution-runs:retry] trigger failed for ${retried.id}: ${reason}`);
      });
    }

    return Response.json(
      {
        run_id: retried.id,
        status: retried.status,
        retried_from: run_id,
        worktree_path: retried.worktreePath ?? null,
        branch: retried.runBranch ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
