/**
 * Integration tests for the ACR Harness Pipeline (PRD §14.3).
 *
 * Drives the full 14-step pipeline on a REAL throwaway git repo under
 * os.tmpdir(), with a MOCK agent runner (no CLI spawn) and a MOCK verification
 * command runner. The ACR repo itself is never used as a worktree target.
 *
 * Covered settlement paths:
 *   - passed              (clean diff + all requested checks pass)
 *   - boundary_violation  (agent edits outside allowedFiles)
 *   - failed              (a requested verification check fails)
 *   - blocked             (agent proposes a guard-blocked command)
 */

import os from "os";
import path from "path";
import { execFileSync } from "child_process";
import { promises as fs } from "fs";

// Isolate the run store + handoff output to temp dirs BEFORE importing the store.
const STORE_DIR = path.join(os.tmpdir(), `acr-harness-store-${Date.now()}`);
process.env.JSON_STORE_DATA_DIR = STORE_DIR;

import {
  runHarness,
  type AgentRunner,
  type RunHarnessOptions,
} from "@/lib/harness/harness-pipeline";
import type { CommandRunner } from "@/lib/harness/verification-runner";
import {
  createExecutionRun,
  getExecutionRun,
  clearAllExecutionRuns,
} from "@/lib/storage/execution-run-store";
import { teardownRunWorktree } from "@/lib/worktree/run-worktree";
import type {
  ExecutionRun,
  ExecutionComplexity,
} from "@/lib/execution-run/types";
import type { HarnessInput, VerificationProfile } from "@/lib/harness/types";

// ─── temp repo helpers (mirrors worktree-manager.test.ts) ────────────────────

function git(cwd: string, args: string[]): string {
  return execFileSync("git", ["-C", cwd, ...args], { encoding: "utf8" });
}

async function makeTempRepo(): Promise<string> {
  const repo = await fs.mkdtemp(path.join(os.tmpdir(), "acr-harness-repo-"));
  git(repo, ["init", "-b", "main"]);
  git(repo, ["config", "user.email", "test@acr.local"]);
  git(repo, ["config", "user.name", "ACR Test"]);
  await fs.writeFile(path.join(repo, "README.md"), "# temp\n", "utf8");
  await fs.mkdir(path.join(repo, "src"), { recursive: true });
  await fs.writeFile(path.join(repo, "src", "index.ts"), "export const x = 1;\n", "utf8");
  await fs.mkdir(path.join(repo, "secrets"), { recursive: true });
  await fs.writeFile(path.join(repo, "secrets", "key.ts"), "export const k = 0;\n", "utf8");
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
  const g = globalThis as typeof globalThis & {
    __executionRunMemoryStore?: ExecutionRun[];
  };
  g.__executionRunMemoryStore = [];
}

const handoffRoots: string[] = [];
async function handoffRoot(): Promise<string> {
  const d = await fs.mkdtemp(path.join(os.tmpdir(), "acr-harness-handoff-"));
  handoffRoots.push(d);
  return d;
}

beforeEach(async () => {
  resetMemory();
  await clearAllExecutionRuns();
});

afterAll(async () => {
  for (const r of repos) {
    await fs.rm(r, { recursive: true, force: true });
    await fs.rm(path.join(path.dirname(r), ".agent-worktrees"), {
      recursive: true,
      force: true,
    });
  }
  for (const h of handoffRoots) {
    await fs.rm(h, { recursive: true, force: true });
  }
  await fs.rm(STORE_DIR, { recursive: true, force: true });
});

// ─── fixtures ────────────────────────────────────────────────────────────────

const FULL_PROFILE: VerificationProfile = {
  typecheck: true,
  lint: false,
  test: true,
  build: false,
  playwright: false,
  boundary: true,
};

async function seedRun(
  repo: string,
  complexity: ExecutionComplexity = "C2",
): Promise<ExecutionRun> {
  return createExecutionRun({
    taskId: "task-h",
    repoPath: repo,
    baseBranch: "main",
    agent: "claude-code",
    prompt: "edit src/index.ts",
    acceptanceCriteria: ["compiles", "tests pass"],
    allowedFiles: ["src/**"],
    blockedFiles: [],
    complexity,
    mode: "implement_verify",
  });
}

function harnessInput(run: ExecutionRun): HarnessInput {
  return {
    runId: run.id,
    taskId: run.taskId,
    repoPath: run.repoPath,
    baseBranch: run.baseBranch,
    agent: run.agent,
    prompt: run.prompt,
    acceptanceCriteria: run.acceptanceCriteria,
    allowedFiles: run.allowedFiles,
    blockedFiles: run.blockedFiles,
    complexity: run.complexity,
    mode: "standard",
    verificationProfile: FULL_PROFILE,
    contextPack: {
      globalRules: ["00-global.md"],
      pathRules: ["src/**"],
      docsIndex: ["docs/ARCHITECTURE.md"],
    },
  };
}

/** A command runner that returns exit 0 for every command. */
const passingCommandRunner: CommandRunner = async () => ({ exitCode: 0, output: "ok" });

/** Agent that writes a file inside the worktree, then reports done. */
function writingAgent(relPath: string, contents: string): AgentRunner {
  return async (run) => {
    await fs.writeFile(path.join(run.worktreePath!, relPath), contents, "utf8");
    return { log: `wrote ${relPath}` };
  };
}

function baseOptions(
  agentRunner: AgentRunner,
  commandRunner: CommandRunner,
  handoffDir: string,
): RunHarnessOptions {
  return {
    agentRunner,
    commandRunner,
    handoff: { outputRoot: handoffDir },
  };
}

// ─── tests ─────────────────────────────────────────────────────────────────

describe("runHarness — happy path", () => {
  it("settles 'passed' with merge_ready when diff is in-scope and checks pass", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo);

    const out = await runHarness(
      harnessInput(run),
      baseOptions(
        writingAgent(path.join("src", "index.ts"), "export const x = 2;\n"),
        passingCommandRunner,
        hRoot,
      ),
    );

    expect(out.status).toBe("passed");
    expect(out.recommendation).toBe("merge_ready");
    expect(out.changedFiles).toContain("src/index.ts");
    expect(out.checks.typecheck).toBe("pass");
    expect(out.checks.test).toBe("pass");
    expect(out.checks.boundary).toBe("pass");
    // unrequested checks are skipped
    expect(out.checks.lint).toBe("skipped");
    expect(out.checks.build).toBe("skipped");

    // store reflects terminal status
    const stored = await getExecutionRun(run.id);
    expect(stored?.status).toBe("passed");

    // handoff folder was written
    expect(out.artifacts.handoffPath).toBeTruthy();
    const result = await fs.readFile(
      path.join(out.artifacts.handoffPath!, "result.json"),
      "utf8",
    );
    expect(JSON.parse(result).status).toBe("passed");

    await teardownRunWorktree(stored!);
  });
});

describe("runHarness — boundary violation", () => {
  it("settles 'boundary_violation' + discard_patch when agent edits out of scope", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo);

    const out = await runHarness(
      harnessInput(run),
      baseOptions(
        writingAgent(path.join("secrets", "key.ts"), "export const k = 999;\n"),
        passingCommandRunner,
        hRoot,
      ),
    );

    expect(out.status).toBe("boundary_violation");
    expect(out.recommendation).toBe("discard_patch");
    expect(out.checks.boundary).toBe("fail");
    expect(out.summary).toContain("secrets/key.ts");

    const stored = await getExecutionRun(run.id);
    expect(stored?.status).toBe("boundary_violation");

    await teardownRunWorktree(stored!);
  });

  it("does NOT run verification commands once a boundary violation is detected", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo);

    let verifyCalls = 0;
    const countingRunner: CommandRunner = async () => {
      verifyCalls += 1;
      return { exitCode: 0, output: "" };
    };

    await runHarness(
      harnessInput(run),
      baseOptions(
        writingAgent(path.join("secrets", "key.ts"), "export const k = 1;\n"),
        countingRunner,
        hRoot,
      ),
    );

    expect(verifyCalls).toBe(0);
    const stored = await getExecutionRun(run.id);
    await teardownRunWorktree(stored!);
  });
});

describe("runHarness — verification failure", () => {
  it("settles 'failed' + retry_with_verifier when a requested check fails", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo);

    // typecheck passes, test fails
    const failingTest: CommandRunner = async (command) => {
      if (command.includes("test")) return { exitCode: 1, output: "1 test failed" };
      return { exitCode: 0, output: "ok" };
    };

    const out = await runHarness(
      harnessInput(run),
      baseOptions(
        writingAgent(path.join("src", "index.ts"), "export const x = 5;\n"),
        failingTest,
        hRoot,
      ),
    );

    expect(out.status).toBe("failed");
    expect(out.recommendation).toBe("retry_with_verifier");
    expect(out.checks.typecheck).toBe("pass");
    expect(out.checks.test).toBe("fail");
    // boundary still passed
    expect(out.checks.boundary).toBe("pass");
    expect(out.summary).toContain("Verification failed");

    const stored = await getExecutionRun(run.id);
    expect(stored?.status).toBe("failed");
    expect(stored?.logTail).toContain("1 test failed");

    await teardownRunWorktree(stored!);
  });
});

describe("runHarness — command guard block", () => {
  it("settles 'blocked' before verification when agent proposes a blocked command", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo);

    let verifyCalls = 0;
    const countingRunner: CommandRunner = async () => {
      verifyCalls += 1;
      return { exitCode: 0, output: "" };
    };

    const dangerousAgent: AgentRunner = async (r) => {
      await fs.writeFile(
        path.join(r.worktreePath!, "src", "index.ts"),
        "export const x = 3;\n",
        "utf8",
      );
      return { log: "tried to push", proposedCommands: ["git push origin main"] };
    };

    const out = await runHarness(
      harnessInput(run),
      baseOptions(dangerousAgent, countingRunner, hRoot),
    );

    expect(out.status).toBe("blocked");
    expect(out.recommendation).toBe("blocked");
    expect(out.summary).toContain("git push");
    // verification never ran
    expect(verifyCalls).toBe(0);

    const stored = await getExecutionRun(run.id);
    expect(stored?.status).toBe("blocked");

    await teardownRunWorktree(stored!);
  });
});

describe("runHarness — approval gate (strict rail)", () => {
  it("does NOT gate the non-approval 'standard' rail even when isApproved is false", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo);

    let agentRan = false;
    const agent: AgentRunner = async (r) => {
      agentRan = true;
      await fs.writeFile(
        path.join(r.worktreePath!, "src", "index.ts"),
        "export const x = 7;\n",
        "utf8",
      );
      return { log: "" };
    };

    // harnessInput defaults to mode 'standard', whose rail requires no approval.
    const out = await runHarness(harnessInput(run), {
      ...baseOptions(agent, passingCommandRunner, hRoot),
      isApproved: () => false,
    });

    expect(out.status).toBe("passed");
    expect(agentRan).toBe(true);

    await teardownRunWorktree((await getExecutionRun(run.id))!);
  });

  it("gates strict mode when unapproved and never spawns the agent", async () => {
    const repo = await trackedRepo();
    const hRoot = await handoffRoot();
    const run = await seedRun(repo, "C3");

    let agentRan = false;
    const agent: AgentRunner = async () => {
      agentRan = true;
      return { log: "" };
    };

    const input: HarnessInput = { ...harnessInput(run), mode: "strict" };

    const out = await runHarness(input, {
      agentRunner: agent,
      commandRunner: passingCommandRunner,
      handoff: { outputRoot: hRoot },
      isApproved: () => false,
    });

    expect(out.status).toBe("needs_approval");
    expect(out.recommendation).toBe("human_review");
    expect(agentRan).toBe(false);
  });
});

describe("runHarness — invalid work order", () => {
  it("throws on a missing required field", async () => {
    const repo = await trackedRepo();
    const run = await seedRun(repo);
    const bad = { ...harnessInput(run), prompt: "" };
    await expect(
      runHarness(bad, {
        agentRunner: writingAgent("src/index.ts", "x"),
        commandRunner: passingCommandRunner,
      }),
    ).rejects.toThrow(/Invalid Work Order/);
  });
});
