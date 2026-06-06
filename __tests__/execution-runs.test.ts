/**
 * Tests for the ACR Kernel execution-runs layer.
 *
 * Covers create → get → result flow through both the store and the route
 * handlers. Disk I/O is isolated to a per-run temp dir via JSON_STORE_DATA_DIR,
 * and the in-memory singleton is reset between tests.
 */

import os from "os";
import path from "path";
import { promises as fs } from "fs";

// Isolate disk writes to a temp dir BEFORE importing the store.
const TMP_DIR = path.join(os.tmpdir(), `acr-exec-runs-${Date.now()}`);
process.env.JSON_STORE_DATA_DIR = TMP_DIR;

import { generateRunId, generateRunBranch } from "@/lib/execution-run/run-id";
import { toRunnerConnection, isRunnerAgent } from "@/lib/execution-run/runner-adapter";
import type { ExecutionRun } from "@/lib/execution-run/types";
import {
  createExecutionRun,
  getExecutionRun,
  listExecutionRunsByTask,
  clearAllExecutionRuns,
} from "@/lib/storage/execution-run-store";
import { POST as createRoute, GET as listRoute } from "@/app/api/execution-runs/route";
import { GET as getRoute } from "@/app/api/execution-runs/[run_id]/route";
import { POST as resultRoute } from "@/app/api/execution-runs/[run_id]/result/route";

function resetMemory(): void {
  const g = globalThis as typeof globalThis & { __executionRunMemoryStore?: ExecutionRun[] };
  g.__executionRunMemoryStore = [];
}

beforeEach(async () => {
  resetMemory();
  await clearAllExecutionRuns();
});

afterAll(async () => {
  await fs.rm(TMP_DIR, { recursive: true, force: true }).catch(() => {});
});

// ─── run-id util ──────────────────────────────────────────────────────────────

describe("generateRunId", () => {
  it("formats run_{YYYYMMDD}_{NNN} with zero-padded sequence", () => {
    const now = new Date("2026-06-06T10:00:00.000Z");
    const id = generateRunId([], now);
    expect(id).toBe("run_20260606_001");
  });

  it("increments the sequence for same-day runs", () => {
    const now = new Date("2026-06-06T10:00:00.000Z");
    const id = generateRunId([{ id: "run_20260606_001" }], now);
    expect(id).toBe("run_20260606_002");
  });

  it("builds branch as agent/{taskId}-{runId}", () => {
    expect(generateRunBranch("task_123", "run_20260606_001")).toBe(
      "agent/task_123-run_20260606_001",
    );
  });
});

// ─── runner adapter ─────────────────────────────────────────────────────────

describe("runner adapter", () => {
  it("treats claude-code/codex/antigravity as runner agents, hermes as not", () => {
    expect(isRunnerAgent("claude-code")).toBe(true);
    expect(isRunnerAgent("codex")).toBe(true);
    expect(isRunnerAgent("antigravity")).toBe(true);
    expect(isRunnerAgent("hermes")).toBe(false);
  });

  it("maps an ExecutionRun to existing runner fields, preferring worktreePath", async () => {
    const run = await createExecutionRun({
      taskId: "task_1",
      repoPath: "/repo",
      baseBranch: "main",
      agent: "claude-code",
      prompt: "do the thing",
      complexity: "C2",
      mode: "implement_verify",
    });
    const conn = toRunnerConnection({ ...run, worktreePath: "/wt/x" });
    expect(conn).not.toBeNull();
    expect(conn?.cwd).toBe("/wt/x");
    expect(conn?.agent).toBe("claude-code");
    expect(conn?.branchName).toBe(run.runBranch);
  });

  it("returns null for hermes (not a CLI runner agent)", async () => {
    const run = await createExecutionRun({
      taskId: "task_1",
      repoPath: "/repo",
      baseBranch: "main",
      agent: "hermes",
      prompt: "watch",
      complexity: "C0",
      mode: "safe_solo",
    });
    expect(toRunnerConnection(run)).toBeNull();
  });
});

// ─── store ──────────────────────────────────────────────────────────────────

describe("execution-run-store", () => {
  it("creates a run with queued status, pulk-cto source, and PRD branch name", async () => {
    const run = await createExecutionRun({
      taskId: "task_123",
      repoPath: "/repo",
      baseBranch: "main",
      agent: "claude-code",
      prompt: "Control Room 로그 표시",
      acceptanceCriteria: ["a", "b"],
      complexity: "C2",
      mode: "implement_verify",
    });
    expect(run.id).toMatch(/^run_\d{8}_\d{3}$/);
    expect(run.status).toBe("queued");
    expect(run.source).toBe("pulk-cto");
    expect(run.runBranch).toBe(`agent/task_123-${run.id}`);
    expect(run.checks).toEqual({});
    expect(run.changedFiles).toEqual([]);
  });

  it("retrieves a created run by id", async () => {
    const run = await createExecutionRun({
      taskId: "task_1",
      repoPath: "/repo",
      baseBranch: "main",
      agent: "codex",
      prompt: "p",
      complexity: "C1",
      mode: "safe_solo",
    });
    const got = await getExecutionRun(run.id);
    expect(got?.id).toBe(run.id);
  });

  it("filters runs by taskId", async () => {
    await createExecutionRun({ taskId: "A", repoPath: "/r", baseBranch: "main", agent: "codex", prompt: "p", complexity: "C1", mode: "safe_solo" });
    await createExecutionRun({ taskId: "B", repoPath: "/r", baseBranch: "main", agent: "codex", prompt: "p", complexity: "C1", mode: "safe_solo" });
    const a = await listExecutionRunsByTask("A");
    expect(a).toHaveLength(1);
    expect(a[0].taskId).toBe("A");
  });
});

// ─── route handlers: create → get → result ──────────────────────────────────

function jsonReq(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("execution-runs routes (create → get → result)", () => {
  it("POST creates a run and returns run_id (201)", async () => {
    const res = await createRoute(
      jsonReq("http://localhost/api/execution-runs", {
        task_id: "task_123",
        repo_path: "/repo",
        base_branch: "main",
        agent: "claude-code",
        prompt: "Control Room 로그 표시",
        acceptance_criteria: ["x"],
        complexity: "C2",
        mode: "implement_verify",
      }),
    );
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.run_id).toMatch(/^run_\d{8}_\d{3}$/);
    expect(json.status).toBe("queued");
    expect(json.branch).toBe(`agent/task_123-${json.run_id}`);
  });

  it("POST rejects missing required fields (400)", async () => {
    const res = await createRoute(
      jsonReq("http://localhost/api/execution-runs", { task_id: "t" }),
    );
    expect(res.status).toBe(400);
  });

  it("POST rejects unsupported agent (400)", async () => {
    const res = await createRoute(
      jsonReq("http://localhost/api/execution-runs", {
        task_id: "t",
        repo_path: "/r",
        base_branch: "main",
        agent: "gpt-9",
        prompt: "p",
        complexity: "C1",
        mode: "safe_solo",
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET :run_id returns the run state", async () => {
    const createRes = await createRoute(
      jsonReq("http://localhost/api/execution-runs", {
        task_id: "task_9",
        repo_path: "/repo",
        base_branch: "main",
        agent: "codex",
        prompt: "p",
        complexity: "C1",
        mode: "safe_solo",
      }),
    );
    const { run_id } = await createRes.json();

    const getRes = await getRoute(new Request(`http://localhost/api/execution-runs/${run_id}`), {
      params: Promise.resolve({ run_id }),
    });
    expect(getRes.status).toBe(200);
    const body = await getRes.json();
    expect(body.run_id).toBe(run_id);
    expect(body.task_id).toBe("task_9");
    expect(body.status).toBe("queued");
    expect(body.agent).toBe("codex");
  });

  it("GET unknown run_id returns 404", async () => {
    const res = await getRoute(new Request("http://localhost/api/execution-runs/nope"), {
      params: Promise.resolve({ run_id: "nope" }),
    });
    expect(res.status).toBe(404);
  });

  it("POST :run_id/result updates status and checks, visible via GET", async () => {
    const createRes = await createRoute(
      jsonReq("http://localhost/api/execution-runs", {
        task_id: "task_r",
        repo_path: "/repo",
        base_branch: "main",
        agent: "claude-code",
        prompt: "p",
        complexity: "C2",
        mode: "implement_verify",
      }),
    );
    const { run_id } = await createRes.json();

    const resultRes = await resultRoute(
      jsonReq(`http://localhost/api/execution-runs/${run_id}/result`, {
        status: "passed",
        changed_files: ["app/x.tsx"],
        checks: { typecheck: "pass", build: "pass", boundary: "pass" },
        diff_stat: "1 file changed, 10 insertions",
        summary: "done",
        next_action: "Human review recommended before merge.",
      }),
      { params: Promise.resolve({ run_id }) },
    );
    expect(resultRes.status).toBe(200);

    const getRes = await getRoute(new Request(`http://localhost/api/execution-runs/${run_id}`), {
      params: Promise.resolve({ run_id }),
    });
    const body = await getRes.json();
    expect(body.status).toBe("passed");
    expect(body.changed_files).toEqual(["app/x.tsx"]);
    expect(body.checks.typecheck).toBe("pass");
    expect(body.diff_stat).toBe("1 file changed, 10 insertions");
    expect(body.next_action).toBe("Human review recommended before merge.");
  });

  it("POST result on unknown run returns 404", async () => {
    const res = await resultRoute(
      jsonReq("http://localhost/api/execution-runs/ghost/result", { status: "passed" }),
      { params: Promise.resolve({ run_id: "ghost" }) },
    );
    expect(res.status).toBe(404);
  });

  it("POST result rejects invalid status (400)", async () => {
    const createRes = await createRoute(
      jsonReq("http://localhost/api/execution-runs", {
        task_id: "task_z",
        repo_path: "/repo",
        base_branch: "main",
        agent: "codex",
        prompt: "p",
        complexity: "C1",
        mode: "safe_solo",
      }),
    );
    const { run_id } = await createRes.json();
    const res = await resultRoute(
      jsonReq(`http://localhost/api/execution-runs/${run_id}/result`, { status: "weird" }),
      { params: Promise.resolve({ run_id }) },
    );
    expect(res.status).toBe(400);
  });

  it("GET collection lists runs and filters by task_id", async () => {
    await createRoute(
      jsonReq("http://localhost/api/execution-runs", {
        task_id: "task_list",
        repo_path: "/repo",
        base_branch: "main",
        agent: "codex",
        prompt: "p",
        complexity: "C1",
        mode: "safe_solo",
      }),
    );
    const res = await listRoute(new Request("http://localhost/api/execution-runs?task_id=task_list"));
    const body = await res.json();
    expect(body.count).toBe(1);
    expect(body.runs[0].taskId).toBe("task_list");
  });
});
