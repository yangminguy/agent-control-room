/**
 * Tests for the ACR Kernel Worktree Manager + boundary check (PRD §12, §26).
 *
 * A real, throwaway git repo is created under os.tmpdir() and real
 * `git worktree add/remove` commands run against it. The ACR repo itself is
 * NEVER used as a worktree target.
 *
 * Flow covered:
 *   createWorktree → write files in worktree → collectDiff → checkBoundary
 *   → cleanupWorktree, plus a boundary_violation case.
 */

import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { promises as fs } from "fs";

// Isolate the run store to a temp dir BEFORE importing it.
const STORE_DIR = path.join(os.tmpdir(), `acr-wt-store-${Date.now()}`);
process.env.JSON_STORE_DATA_DIR = STORE_DIR;

import { checkBoundary, matchesAnyGlob } from "@/lib/worktree/boundary-check";
import {
  createWorktree,
  collectDiff,
  collectDiffAndCheckBoundary,
  cleanupWorktree,
  worktreeLocation,
} from "@/lib/worktree/worktree-manager";
import {
  createExecutionRun,
  getExecutionRun,
  clearAllExecutionRuns,
} from "@/lib/storage/execution-run-store";
import {
  provisionWorktreeForRun,
  finalizeRunDiff,
  teardownRunWorktree,
} from "@/lib/worktree/run-worktree";
import type { ExecutionRun } from "@/lib/execution-run/types";

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

/** Create a real temp git repo with one initial commit on main. */
async function makeTempRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "acr-wt-repo-"));
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.email", "test@acr.local"]);
  git(repo, ["config", "user.name", "ACR Test"]);
  await fs.writeFile(path.join(repo, "README.md"), "# temp\n", "utf8");
  await fs.mkdir(path.join(repo, "src"), { recursive: true });
  await fs.writeFile(path.join(repo, "src", "index.ts"), "export const x = 1;\n", "utf8");
  git(repo, ["add", "."]);
  git(repo, ["commit", "-m", "init"]);
  return repo;
}

const repos: string[] = [];
async function trackedRepo(): Promise<string> {
  const r = await makeTempRepo();
  repos.push(r);
  return r;
}

function resetMemory(): void {
  const g = globalThis as typeof globalThis & { __executionRunMemoryStore?: ExecutionRun[] };
  g.__executionRunMemoryStore = [];
}

beforeEach(async () => {
  resetMemory();
  await clearAllExecutionRuns();
});

afterAll(async () => {
  for (const r of repos) {
    await fs.rm(r, { recursive: true, force: true });
    await fs.rm(path.join(path.dirname(r), ".agent-worktrees"), { recursive: true, force: true });
  }
  await fs.rm(STORE_DIR, { recursive: true, force: true });
});

// ─── glob / boundary unit ────────────────────────────────────────────────────

describe("boundary check globs", () => {
  it("matches ** across segments and * within a segment", () => {
    expect(matchesAnyGlob("src/a/b/c.ts", ["src/**"])).toBe(true);
    expect(matchesAnyGlob("src/a.ts", ["src/*.ts"])).toBe(true);
    expect(matchesAnyGlob("src/a/b.ts", ["src/*.ts"])).toBe(false);
    expect(matchesAnyGlob("packages/core/x.ts", ["packages/**"])).toBe(true);
    expect(matchesAnyGlob("README.md", ["src/**"])).toBe(false);
  });

  it("passes when all changed files are inside allowedFiles", () => {
    const res = checkBoundary({
      changedFiles: ["src/a.ts", "src/sub/b.ts"],
      allowedFiles: ["src/**"],
      blockedFiles: [],
    });
    expect(res.status).toBe("pass");
    expect(res.violations).toHaveLength(0);
  });

  it("fails when a file is outside allowedFiles", () => {
    const res = checkBoundary({
      changedFiles: ["src/a.ts", "secrets/key.ts"],
      allowedFiles: ["src/**"],
      blockedFiles: [],
    });
    expect(res.status).toBe("fail");
    expect(res.violations).toEqual(["secrets/key.ts"]);
  });

  it("fails on blockedFiles glob match", () => {
    const res = checkBoundary({
      changedFiles: ["src/a.ts"],
      allowedFiles: ["src/**"],
      blockedFiles: ["src/a.ts"],
    });
    expect(res.status).toBe("fail");
    expect(res.violations).toEqual(["src/a.ts"]);
  });

  it("hard-blocks .env / lockfile / node_modules / .git unconditionally", () => {
    const res = checkBoundary({
      changedFiles: [
        ".env",
        "pnpm-lock.yaml",
        "node_modules/foo/index.js",
        ".git/config",
      ],
      allowedFiles: ["**"], // even a permissive allow-list cannot rescue them
      blockedFiles: [],
    });
    expect(res.status).toBe("fail");
    expect(res.violations.sort()).toEqual(
      [".env", ".git/config", "node_modules/foo/index.js", "pnpm-lock.yaml"].sort(),
    );
  });

  it("disables the allow-set gate when allowedFiles is empty", () => {
    const res = checkBoundary({
      changedFiles: ["anything/here.ts"],
      allowedFiles: [],
      blockedFiles: [],
    });
    expect(res.status).toBe("pass");
  });
});

// ─── worktree path convention ────────────────────────────────────────────────

describe("worktreeLocation", () => {
  it("derives branch and path per PRD convention", () => {
    const loc = worktreeLocation("/tmp/myrepo", "task-123", "run_20260606_001");
    expect(loc.runBranch).toBe("agent/task-123-run_20260606_001");
    expect(loc.worktreePath).toBe(
      "/tmp/.agent-worktrees/myrepo-task-123-run_20260606_001",
    );
  });
});

// ─── real git worktree lifecycle ─────────────────────────────────────────────

describe("worktree lifecycle on a real temp repo", () => {
  it("creates a worktree, collects diff, then cleans up", async () => {
    const repo = await trackedRepo();
    const runId = "run_20260606_001";
    const taskId = "task-1";

    const { worktreePath, runBranch } = await createWorktree({
      repoPath: repo,
      baseBranch: "main",
      runId,
      taskId,
    });

    expect(runBranch).toBe("agent/task-1-run_20260606_001");
    // worktree dir really exists
    await expect(fs.stat(worktreePath)).resolves.toBeDefined();
    // and it is registered as a git worktree
    expect(git(repo, ["worktree", "list"])).toContain(worktreePath);

    // agent edits an existing tracked file + adds a new file inside the worktree
    await fs.writeFile(
      path.join(worktreePath, "src", "index.ts"),
      "export const x = 2;\n",
      "utf8",
    );
    await fs.writeFile(path.join(worktreePath, "src", "new.ts"), "export const y = 9;\n", "utf8");

    const diff = await collectDiff(worktreePath);
    expect(diff.changedFiles).toEqual(["src/index.ts", "src/new.ts"]);
    expect(diff.diffStat).toContain("src/index.ts");

    // cleanup removes worktree + branch
    await cleanupWorktree({ repoPath: repo, worktreePath, runBranch });
    await expect(fs.stat(worktreePath)).rejects.toBeDefined();
    expect(git(repo, ["worktree", "list"])).not.toContain(worktreePath);
    expect(git(repo, ["branch", "--list", runBranch]).trim()).toBe("");
  });

  it("collectDiffAndCheckBoundary passes inside allowed scope", async () => {
    const repo = await trackedRepo();
    const { worktreePath, runBranch } = await createWorktree({
      repoPath: repo,
      baseBranch: "main",
      runId: "run_20260606_010",
      taskId: "task-2",
    });
    await fs.writeFile(path.join(worktreePath, "src", "ok.ts"), "export const ok = true;\n", "utf8");

    const res = await collectDiffAndCheckBoundary(worktreePath, ["src/**"], []);
    expect(res.changedFiles).toContain("src/ok.ts");
    expect(res.boundary.status).toBe("pass");

    await cleanupWorktree({ repoPath: repo, worktreePath, runBranch });
  });
});

// ─── full run wiring incl. boundary_violation ────────────────────────────────

describe("run ⇄ worktree wiring", () => {
  it("provisions, finalizes (clean), and tears down a run", async () => {
    const repo = await trackedRepo();
    const run = await createExecutionRun({
      taskId: "task-3",
      repoPath: repo,
      baseBranch: "main",
      agent: "claude-code",
      prompt: "edit src",
      allowedFiles: ["src/**"],
      blockedFiles: [],
      complexity: "C2",
      mode: "implement_verify",
    });

    const provisioned = await provisionWorktreeForRun(run);
    expect(provisioned.worktreePath).toBeTruthy();
    expect(provisioned.runBranch).toBe(`agent/task-3-${run.id}`);

    await fs.writeFile(
      path.join(provisioned.worktreePath!, "src", "index.ts"),
      "export const x = 42;\n",
      "utf8",
    );

    const fin = await finalizeRunDiff(provisioned);
    expect(fin.boundaryViolation).toBe(false);
    expect(fin.run.checks.boundary).toBe("pass");
    expect(fin.run.changedFiles).toContain("src/index.ts");
    expect(fin.run.status).not.toBe("boundary_violation");

    await teardownRunWorktree(fin.run);
    expect(git(repo, ["worktree", "list"])).not.toContain(provisioned.worktreePath);
  });

  it("marks run boundary_violation when an out-of-scope file is changed", async () => {
    const repo = await trackedRepo();
    // add a file outside allowed scope to the base so it can be edited
    await fs.mkdir(path.join(repo, "secrets"), { recursive: true });
    await fs.writeFile(path.join(repo, "secrets", "key.ts"), "export const k = 0;\n", "utf8");
    git(repo, ["add", "."]);
    git(repo, ["commit", "-m", "add secrets"]);

    const run = await createExecutionRun({
      taskId: "task-4",
      repoPath: repo,
      baseBranch: "main",
      agent: "claude-code",
      prompt: "edit",
      allowedFiles: ["src/**"],
      blockedFiles: [],
      complexity: "C2",
      mode: "implement_verify",
    });

    const provisioned = await provisionWorktreeForRun(run);
    // agent goes out of bounds
    await fs.writeFile(
      path.join(provisioned.worktreePath!, "secrets", "key.ts"),
      "export const k = 999;\n",
      "utf8",
    );

    const fin = await finalizeRunDiff(provisioned);
    expect(fin.boundaryViolation).toBe(true);
    expect(fin.violations).toEqual(["secrets/key.ts"]);

    const stored = await getExecutionRun(run.id);
    expect(stored?.status).toBe("boundary_violation");
    expect(stored?.checks.boundary).toBe("fail");
    expect(stored?.resultSummary).toContain("secrets/key.ts");

    await teardownRunWorktree(fin.run);
  });

  it("hard-blocks a lockfile change even inside an allowed dir", async () => {
    const repo = await trackedRepo();
    const run = await createExecutionRun({
      taskId: "task-5",
      repoPath: repo,
      baseBranch: "main",
      agent: "claude-code",
      prompt: "edit",
      allowedFiles: ["**"],
      blockedFiles: [],
      complexity: "C2",
      mode: "implement_verify",
    });

    const provisioned = await provisionWorktreeForRun(run);
    await fs.writeFile(
      path.join(provisioned.worktreePath!, "pnpm-lock.yaml"),
      "lockfileVersion: 9\n",
      "utf8",
    );

    const fin = await finalizeRunDiff(provisioned);
    expect(fin.boundaryViolation).toBe(true);
    expect(fin.violations).toContain("pnpm-lock.yaml");

    await teardownRunWorktree(fin.run);
  });

  it("marks run blocked and throws when worktree creation fails", async () => {
    const repo = await trackedRepo();
    const run = await createExecutionRun({
      taskId: "task-6",
      repoPath: repo,
      baseBranch: "does-not-exist",
      agent: "claude-code",
      prompt: "edit",
      complexity: "C1",
      mode: "safe_solo",
    });

    await expect(provisionWorktreeForRun(run)).rejects.toThrow();
    const stored = await getExecutionRun(run.id);
    expect(stored?.status).toBe("blocked");
    expect(stored?.resultSummary).toContain("Worktree provisioning failed");
  });

  it("cleanup is idempotent (safe to call twice / on missing worktree)", async () => {
    const repo = await trackedRepo();
    const { worktreePath, runBranch } = await createWorktree({
      repoPath: repo,
      baseBranch: "main",
      runId: "run_20260606_099",
      taskId: "task-7",
    });
    await cleanupWorktree({ repoPath: repo, worktreePath, runBranch });
    await expect(
      cleanupWorktree({ repoPath: repo, worktreePath, runBranch }),
    ).resolves.toBeUndefined();
  });
});
