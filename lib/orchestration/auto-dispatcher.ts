/**
 * Auto-Dispatcher — Phase 14 (L5 무인 실행 루프)
 *
 * Picks up D1-D2 phase tasks dispatched by L5 CTO and runs them through
 * /api/runner without UI interaction.
 *
 * Lifecycle:
 *   1. dispatch route saves CTOTaskMetadata sidecar with auto_execute=true
 *   2. dispatch route calls scheduleAutoDispatch(planId) fire-and-forget
 *   3. runAutoDispatchForPlan picks the next eligible task, issues an
 *      internal approval token, and POSTs to /api/runner with that token
 *   4. /api/runner streams SSE; this worker consumes the stream to detect
 *      completion, then advances to the next task
 *
 * Eligibility (per task):
 *   - status === "planned"
 *   - metadata.auto_execute === true
 *   - metadata.release_gate_type === "none"
 *   - metadata.runtime is supported by spawn-runner ("claude" | "codex" | "antigravity")
 *   - cwd resolvable (metadata.cwd → project lookup → env fallback)
 */
import { getFeaturePlanById } from "@/lib/storage/feature-plan-store";
import {
  listCTOTaskMetadataByPlan,
  type CTOTaskMetadata,
} from "@/lib/storage/cto-task-metadata-store";
import { issueApprovalToken } from "@/lib/orchestration/approval-token-store";
import { getProjectById } from "@/lib/storage/project-actions";
import { getExecutionLogByTaskId } from "@/lib/storage/execution-log-store";
import { getDiffSummary, getLogTail } from "@/lib/runner/git-utils";
import { replanNextPrompt } from "@/lib/orchestration/llm-replanner";
import type { PlanTask } from "@/lib/types";

const SUPPORTED_RUNTIMES = new Set<CTOTaskMetadata["runtime"]>(["claude", "codex", "antigravity"]);

function runtimeToAgent(
  runtime: CTOTaskMetadata["runtime"],
): "claude-code" | "codex" | "antigravity" {
  if (runtime === "claude") return "claude-code";
  if (runtime === "codex") return "codex";
  if (runtime === "antigravity") return "antigravity";
  // omc → fallback claude-code
  return "claude-code";
}

async function resolveCwd(meta: CTOTaskMetadata, planProjectId: string): Promise<string | null> {
  if (meta.cwd) return meta.cwd;
  // Try registered project lookup. L5 plans use projectId `l5-<task>` which is
  // synthetic, so this is best-effort.
  try {
    const project = await getProjectById(planProjectId);
    if (project?.path) return project.path;
  } catch {
    // ignore
  }
  const fallback = process.env.L5_DEFAULT_PROJECT_PATH;
  return fallback ?? null;
}

/**
 * Phase 16: Build a `[PRIOR PHASE CONTEXT]` block from the immediately preceding
 * completed task in the same plan. Returns "" if no prior phase or no log.
 *
 * The block embeds the previous phase's branch diff stat + log tail so the next
 * agent invocation can reason about what was already done without rediscovery.
 */
async function buildPriorPhaseContext(
  tasks: PlanTask[],
  nextTaskId: string,
  cwd: string,
): Promise<string> {
  const idx = tasks.findIndex((t) => t.id === nextTaskId);
  if (idx <= 0) return "";
  // Walk backwards to find the most recent done task.
  for (let i = idx - 1; i >= 0; i -= 1) {
    const prev = tasks[i];
    if (prev.status !== "done") continue;
    const log = await getExecutionLogByTaskId(prev.id).catch(() => null);
    if (!log) continue;
    const tail = getLogTail(log.logLines ?? []);
    const diff = getDiffSummary(cwd, "main");
    const parts = [
      `[PRIOR PHASE CONTEXT]`,
      `Phase: ${prev.title}`,
      `Branch: ${log.branchName ?? "n/a"}`,
      `Exit code: ${log.exitCode ?? "n/a"}`,
    ];
    if (diff) parts.push(`Diff stat:\n${diff}`);
    if (tail) parts.push(`Log tail:\n${tail}`);
    parts.push(`[END PRIOR PHASE CONTEXT]`);
    return parts.join("\n");
  }
  return "";
}

interface DispatchOutcome {
  taskId: string;
  status: "dispatched" | "skipped" | "failed";
  reason?: string;
}

/**
 * Pick the next eligible task in `planned` status and run it through /api/runner.
 * Returns the outcome of a single task (one task per call); call repeatedly to
 * drain the plan.
 *
 * `excludeTaskIds` lets the caller skip tasks already attempted in the current
 * drain. /api/runner normally updates the PlanTask status to "running"/"done",
 * but if status writes are delayed or the runner is mocked, the exclude set
 * prevents re-dispatching the same task in a tight loop.
 */
export async function dispatchNextTask(
  planId: string,
  excludeTaskIds: Set<string> = new Set(),
): Promise<DispatchOutcome | null> {
  const plan = await getFeaturePlanById(planId);
  if (!plan) return null;

  const metaList = await listCTOTaskMetadataByPlan(planId);
  const metaByTask = new Map(metaList.map((m) => [m.taskId, m]));

  // Phase 16.5: skip tasks whose dependsOn[] aren't all done yet.
  const taskById = new Map(plan.tasks.map((t) => [t.id, t]));
  const dependenciesMet = (t: PlanTask): boolean => {
    if (!t.dependsOn || t.dependsOn.length === 0) return true;
    return t.dependsOn.every((id) => taskById.get(id)?.status === "done");
  };

  const nextTask: PlanTask | undefined = plan.tasks.find(
    (t) =>
      t.status === "planned" && !excludeTaskIds.has(t.id) && dependenciesMet(t),
  );
  if (!nextTask) return null;

  const meta = metaByTask.get(nextTask.id);
  if (!meta) {
    return { taskId: nextTask.id, status: "skipped", reason: "no CTO metadata" };
  }
  if (!meta.auto_execute) {
    return { taskId: nextTask.id, status: "skipped", reason: "auto_execute=false" };
  }
  if (meta.release_gate_type !== "none") {
    return { taskId: nextTask.id, status: "skipped", reason: `gate=${meta.release_gate_type}` };
  }
  if (!SUPPORTED_RUNTIMES.has(meta.runtime)) {
    return { taskId: nextTask.id, status: "skipped", reason: `runtime=${meta.runtime}` };
  }

  const cwd = await resolveCwd(meta, plan.projectId);
  if (!cwd) {
    return {
      taskId: nextTask.id,
      status: "failed",
      reason: "cwd unresolved (set L5_DEFAULT_PROJECT_PATH or project_path on ACRIntent)",
    };
  }

  const agent = runtimeToAgent(meta.runtime);
  const token = issueApprovalToken({ planId, taskId: nextTask.id, agent, cwd });
  const basePrompt = nextTask.generatedPrompt ?? nextTask.description ?? nextTask.title;
  const priorContext = await buildPriorPhaseContext(plan.tasks, nextTask.id, cwd);
  const prompt = await replanNextPrompt({
    userGoal: plan.userGoal,
    nextPhaseTitle: nextTask.title,
    basePrompt,
    priorContext,
  });

  const base = process.env.ACR_BASE_URL ?? "http://localhost:3001";
  try {
    const response = await fetch(`${base}/api/runner`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        planId,
        taskId: nextTask.id,
        prompt,
        cwd,
        agent,
        approvalToken: token,
      }),
    });
    // /api/runner returns SSE; drain it to completion so the worker waits
    // for spawn → exit before advancing to the next task.
    if (response.body) {
      const reader = response.body.getReader();
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    }
    return { taskId: nextTask.id, status: "dispatched" };
  } catch (err) {
    return {
      taskId: nextTask.id,
      status: "failed",
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Drain auto-executable tasks for a plan, one at a time, until no eligible
 * task remains. Used by fire-and-forget from /api/workbench/dispatch.
 */
export async function runAutoDispatchForPlan(planId: string): Promise<DispatchOutcome[]> {
  const outcomes: DispatchOutcome[] = [];
  const attempted = new Set<string>();
  // Safety cap: 20 phases per plan.
  for (let i = 0; i < 20; i += 1) {
    const outcome = await dispatchNextTask(planId, attempted);
    if (!outcome) break;
    attempted.add(outcome.taskId);
    outcomes.push(outcome);
    if (outcome.status !== "dispatched") break;
  }
  return outcomes;
}

/**
 * Schedule auto-dispatch on the next tick so the originating HTTP request
 * (dispatch route) can return immediately.
 */
export function scheduleAutoDispatch(planId: string): Promise<DispatchOutcome[]> {
  return new Promise((resolve) => {
    setImmediate(() => {
      runAutoDispatchForPlan(planId)
        .then(resolve)
        .catch((err) => {
          console.warn(`[auto-dispatcher] plan ${planId} failed:`, err?.message ?? err);
          resolve([]);
        });
    });
  });
}
