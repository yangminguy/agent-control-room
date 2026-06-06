/**
 * WorktreeManager — ACR Kernel (PRD §12, 3차 프롬프트 §26)
 *
 * Creates an isolated git worktree per ExecutionRun so agents never touch the
 * main repo. Also collects the diff produced inside the worktree and tears the
 * worktree down afterwards.
 *
 * This is a NEW module. It does not modify /api/runner, lib/runner/* or
 * lib/workspace/*. It shells out to real `git worktree` commands.
 *
 *   createWorktree  → worktree 생성 (실패 시 throw → 호출부가 run.status='blocked')
 *   collectDiff     → git diff --name-only / --stat 수집
 *   checkBoundary   → 변경 파일이 allowed/blocked 경계를 지켰는지 검사
 *   cleanupWorktree → worktree 제거 + run branch 정리
 *
 * Layout (PRD §12.1 / 계약):
 *   branch:   agent/{taskId}-{runId}
 *   worktree: {repo부모}/.agent-worktrees/{repoName}-{taskId}-{runId}
 */

import { execFile } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";
import { generateRunBranch } from "@/lib/execution-run/run-id";
import {
  checkBoundary,
  type BoundaryCheckResult,
} from "@/lib/worktree/boundary-check";

const exec = promisify(execFile);

async function git(repoPath: string, args: string[]): Promise<string> {
  // execFile (no shell) avoids injection and quoting issues entirely.
  const { stdout } = await exec("git", ["-C", repoPath, ...args], {
    maxBuffer: 64 * 1024 * 1024,
  });
  return stdout;
}

// ─── paths ───────────────────────────────────────────────────────────────────

export type WorktreeLocation = {
  worktreePath: string;
  runBranch: string;
};

/**
 * Compute the deterministic worktree path + branch for a run. Exported so
 * cleanup can run from a runId/taskId without re-deriving the convention.
 */
export function worktreeLocation(
  repoPath: string,
  taskId: string,
  runId: string,
): WorktreeLocation {
  const repoName = path.basename(path.resolve(repoPath));
  const parent = path.dirname(path.resolve(repoPath));
  const worktreePath = path.join(
    parent,
    ".agent-worktrees",
    `${repoName}-${taskId}-${runId}`,
  );
  return { worktreePath, runBranch: generateRunBranch(taskId, runId) };
}

// ─── create ──────────────────────────────────────────────────────────────────

export type CreateWorktreeInput = {
  repoPath: string;
  baseBranch: string;
  runId: string;
  taskId: string;
};

/**
 * Create an isolated worktree with a fresh run branch off baseBranch.
 * Throws on any git failure so the caller can set run.status='blocked'.
 */
export async function createWorktree(
  input: CreateWorktreeInput,
): Promise<WorktreeLocation> {
  const { repoPath, baseBranch, runId, taskId } = input;
  const { worktreePath, runBranch } = worktreeLocation(repoPath, taskId, runId);

  await fs.mkdir(path.dirname(worktreePath), { recursive: true });

  try {
    // git worktree add -b agent/{taskId}-{runId} <worktreePath> <baseBranch>
    await git(repoPath, [
      "worktree",
      "add",
      "-b",
      runBranch,
      worktreePath,
      baseBranch,
    ]);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    throw new Error(
      `createWorktree failed for run ${runId} (branch ${runBranch}): ${msg}`,
    );
  }

  return { worktreePath, runBranch };
}

// ─── diff ────────────────────────────────────────────────────────────────────

export type WorktreeDiff = {
  changedFiles: string[];
  diffStat: string;
};

/**
 * Collect the diff produced inside the worktree. Uses HEAD as the comparison
 * base and includes both committed-and-untracked changes:
 *   - tracked changes:   git diff HEAD --name-only
 *   - untracked (new):   git ls-files --others --exclude-standard
 * diffStat is the human-readable `git diff HEAD --stat` summary.
 */
export async function collectDiff(worktreePath: string): Promise<WorktreeDiff> {
  const trackedOut = await git(worktreePath, ["diff", "HEAD", "--name-only"]);
  const untrackedOut = await git(worktreePath, [
    "ls-files",
    "--others",
    "--exclude-standard",
  ]);
  const diffStat = await git(worktreePath, ["diff", "HEAD", "--stat"]);

  const tracked = trackedOut.split("\n").map((s) => s.trim()).filter(Boolean);
  const untracked = untrackedOut.split("\n").map((s) => s.trim()).filter(Boolean);
  const changedFiles = Array.from(new Set([...tracked, ...untracked])).sort();

  return { changedFiles, diffStat: diffStat.trim() };
}

/**
 * Convenience: collect the diff and run the boundary check in one call.
 */
export async function collectDiffAndCheckBoundary(
  worktreePath: string,
  allowedFiles: string[],
  blockedFiles: string[],
): Promise<WorktreeDiff & { boundary: BoundaryCheckResult }> {
  const diff = await collectDiff(worktreePath);
  const boundary = checkBoundary({
    changedFiles: diff.changedFiles,
    allowedFiles,
    blockedFiles,
  });
  return { ...diff, boundary };
}

// ─── cleanup ─────────────────────────────────────────────────────────────────

export type CleanupWorktreeInput =
  | { worktreePath: string; repoPath: string; runBranch?: string }
  | { repoPath: string; taskId: string; runId: string };

/**
 * Remove the worktree and delete its run branch. Tolerant of partial state:
 * a missing worktree or branch is not an error (cleanup is idempotent).
 */
export async function cleanupWorktree(input: CleanupWorktreeInput): Promise<void> {
  let worktreePath: string;
  let runBranch: string | undefined;

  if ("worktreePath" in input) {
    worktreePath = input.worktreePath;
    runBranch = input.runBranch;
  } else {
    const loc = worktreeLocation(input.repoPath, input.taskId, input.runId);
    worktreePath = loc.worktreePath;
    runBranch = loc.runBranch;
  }

  // git worktree remove --force <path> — tolerate already-removed worktree.
  try {
    await git(input.repoPath, ["worktree", "remove", "--force", worktreePath]);
  } catch {
    // already gone / never created — fall through and still prune.
  }

  // Prune dangling administrative entries.
  try {
    await git(input.repoPath, ["worktree", "prune"]);
  } catch {
    /* best-effort */
  }

  // Delete the run branch if we know it.
  if (runBranch) {
    try {
      await git(input.repoPath, ["branch", "-D", runBranch]);
    } catch {
      // branch already gone or still checked out elsewhere — non-fatal.
    }
  }
}
