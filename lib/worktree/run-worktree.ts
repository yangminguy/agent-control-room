/**
 * Run ⇄ Worktree wiring — ACR Kernel (PRD §12, §16, 3차 프롬프트 §26)
 *
 * Glue between the WorktreeManager and the ExecutionRun store. Keeps the status
 * transitions (PRD §8.2) in one place so callers don't hand-roll them:
 *
 *   - worktree 생성 실패  → run.status = 'blocked'
 *   - boundary_violation → run.status = 'boundary_violation' + 위반 파일을
 *                          resultSummary / diffStat 에 기록
 *
 * NEW module. Does not modify the existing runner. The store is updated through
 * the Phase-1 updateExecutionRun contract only.
 */

import {
  updateExecutionRun,
  type ExecutionRunPatch,
} from "@/lib/storage/execution-run-store";
import type { ExecutionRun } from "@/lib/execution-run/types";
import {
  cleanupWorktree,
  collectDiffAndCheckBoundary,
  createWorktree,
} from "@/lib/worktree/worktree-manager";

/**
 * Provision a worktree for a run and persist worktreePath/runBranch.
 *
 * On success the run is left in its current status with worktree fields set.
 * On git failure the run is marked 'blocked' (PRD §26 제약) and the error is
 * re-thrown so the API/caller can surface it.
 */
export async function provisionWorktreeForRun(run: ExecutionRun): Promise<ExecutionRun> {
  try {
    const { worktreePath, runBranch } = await createWorktree({
      repoPath: run.repoPath,
      baseBranch: run.baseBranch,
      runId: run.id,
      taskId: run.taskId,
    });
    const updated = await updateExecutionRun(run.id, { worktreePath, runBranch });
    return updated ?? { ...run, worktreePath, runBranch };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    await updateExecutionRun(run.id, {
      status: "blocked",
      resultSummary: `Worktree provisioning failed: ${reason}`,
      nextAction: "Inspect base branch / repo state, then retry.",
    });
    throw error;
  }
}

export type FinalizeDiffResult = {
  run: ExecutionRun;
  boundaryViolation: boolean;
  violations: string[];
};

/**
 * After the agent finishes, collect the worktree diff, run the boundary check,
 * and persist the outcome.
 *
 *   - boundary fail → status='boundary_violation', violations in summary
 *   - boundary pass → checks.boundary='pass', changedFiles/diffStat recorded
 *
 * Returns the updated run plus the violation detail (for the result packet).
 */
export async function finalizeRunDiff(run: ExecutionRun): Promise<FinalizeDiffResult> {
  if (!run.worktreePath) {
    throw new Error(`finalizeRunDiff: run ${run.id} has no worktreePath`);
  }

  const { changedFiles, diffStat, boundary } = await collectDiffAndCheckBoundary(
    run.worktreePath,
    run.allowedFiles,
    run.blockedFiles,
  );

  const isViolation = boundary.status === "fail";

  const patch: ExecutionRunPatch = {
    changedFiles,
    diffStat,
    checks: { boundary: isViolation ? "fail" : "pass" },
  };

  if (isViolation) {
    const lines = boundary.violations.map(
      (file, i) => `- ${file} (${boundary.reasons[i]})`,
    );
    patch.status = "boundary_violation";
    patch.resultSummary = `Boundary violation: ${boundary.violations.length} file(s) outside sandbox.\n${lines.join("\n")}`;
    patch.nextAction = "Human review required. Discard or scope the patch.";
  }

  const updated = await updateExecutionRun(run.id, patch);
  return {
    run: updated ?? { ...run, ...patch, checks: { ...run.checks, ...patch.checks } },
    boundaryViolation: isViolation,
    violations: boundary.violations,
  };
}

/** Tear down a run's worktree + branch. Idempotent. */
export async function teardownRunWorktree(run: ExecutionRun): Promise<void> {
  if (run.worktreePath) {
    await cleanupWorktree({
      repoPath: run.repoPath,
      worktreePath: run.worktreePath,
      runBranch: run.runBranch,
    });
  } else {
    await cleanupWorktree({
      repoPath: run.repoPath,
      taskId: run.taskId,
      runId: run.id,
    });
  }
}
