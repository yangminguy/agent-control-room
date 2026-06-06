/**
 * /api/execution-runs — ACR Kernel execution-runs collection
 *
 * POST: pulk CTO가 보낸 task 실행 요청을 받아 ExecutionRun을 생성하고 run_id를
 *       돌려준다(PRD §9.1). 기존 runner는 건드리지 않는 thin adapter 계층.
 * GET:  최근 run 목록 또는 task_id별 run 목록을 조회한다.
 *
 * 이 API는 planning brain이 아니다. pulk CTO가 task/spec/design/risk를 생성하고,
 * ACR Kernel은 execution run / worktree / log / diff / verification / result만 다룬다.
 */

import {
  createExecutionRun,
  listExecutionRuns,
  listExecutionRunsByTask,
} from "@/lib/storage/execution-run-store";
import { triggerHarnessRun } from "@/lib/harness/live-runner";
import { isRunnerAgent } from "@/lib/execution-run/runner-adapter";
import type {
  ExecutionAgent,
  ExecutionComplexity,
  ExecutionMode,
  ExecutionRiskLevel,
} from "@/lib/execution-run/types";

export const runtime = "nodejs";

const AGENTS = new Set<ExecutionAgent>(["claude-code", "codex", "antigravity", "hermes"]);
const COMPLEXITIES = new Set<ExecutionComplexity>(["C0", "C1", "C2", "C3", "C4", "C5"]);
const MODES = new Set<ExecutionMode>([
  "safe_solo",
  "implement_verify",
  "strict_sandbox",
  "parallel_patch_queue",
]);
const RISK_LEVELS = new Set<ExecutionRiskLevel>(["D0", "D1", "D2", "D3", "D4"]);

type CreateBody = {
  task_id?: string;
  repo_path?: string;
  base_branch?: string;
  agent?: string;
  prompt?: string;
  acceptance_criteria?: string[];
  allowed_files?: string[];
  blocked_files?: string[];
  complexity?: string;
  mode?: string;
  risk_level?: string;
};

export async function POST(request: Request) {
  let body: CreateBody;
  try {
    body = (await request.json()) as CreateBody;
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const { task_id, repo_path, base_branch, agent, prompt, complexity, mode } = body;

  if (!task_id || !repo_path || !base_branch || !agent || !prompt || !complexity || !mode) {
    return Response.json(
      {
        error:
          "task_id, repo_path, base_branch, agent, prompt, complexity, mode are required",
      },
      { status: 400 },
    );
  }
  if (!AGENTS.has(agent as ExecutionAgent)) {
    return Response.json({ error: `unsupported agent: ${agent}` }, { status: 400 });
  }
  if (!COMPLEXITIES.has(complexity as ExecutionComplexity)) {
    return Response.json({ error: `invalid complexity: ${complexity}` }, { status: 400 });
  }
  if (!MODES.has(mode as ExecutionMode)) {
    return Response.json({ error: `invalid mode: ${mode}` }, { status: 400 });
  }
  if (body.risk_level !== undefined && !RISK_LEVELS.has(body.risk_level as ExecutionRiskLevel)) {
    return Response.json({ error: `invalid risk_level: ${body.risk_level}` }, { status: 400 });
  }

  try {
    const run = await createExecutionRun({
      taskId: task_id,
      repoPath: repo_path,
      baseBranch: base_branch,
      agent: agent as ExecutionAgent,
      prompt,
      acceptanceCriteria: body.acceptance_criteria,
      allowedFiles: body.allowed_files,
      blockedFiles: body.blocked_files,
      complexity: complexity as ExecutionComplexity,
      mode: mode as ExecutionMode,
      riskLevel: body.risk_level as ExecutionRiskLevel | undefined,
    });

    // §14.3 — live execution trigger. Default OFF: the API stays a thin store
    // layer unless ACR_EXECUTION_TRIGGER=on explicitly opts into running the
    // real CLI. Fire-and-forget: the run settles asynchronously and the result
    // is fetched via GET /api/execution-runs/:run_id (§9.2). hermes (non-runner)
    // is never triggered — it routes to human/monitor flows.
    if (process.env.ACR_EXECUTION_TRIGGER === "on" && isRunnerAgent(run.agent)) {
      void triggerHarnessRun(run).catch((err) => {
        const reason = err instanceof Error ? err.message : String(err);
        console.error(`[execution-runs] harness trigger failed for ${run.id}: ${reason}`);
      });
    }

    return Response.json(
      {
        run_id: run.id,
        status: run.status,
        worktree_path: run.worktreePath ?? null,
        branch: run.runBranch ?? null,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const taskId = searchParams.get("task_id");
    const runs = taskId ? await listExecutionRunsByTask(taskId) : await listExecutionRuns();
    return Response.json({ runs, count: runs.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
