/**
 * POST /api/execution-runs/:run_id/retry — re-runs a settled run with the same
 * work order (default agent) or an override agent. Trigger stays OFF in tests.
 */

import os from "os";
import path from "path";
import { promises as fs } from "fs";

const TMP_DIR = path.join(os.tmpdir(), `acr-exec-retry-${Date.now()}`);
process.env.JSON_STORE_DATA_DIR = TMP_DIR;

import type { ExecutionRun } from "@/lib/execution-run/types";
import {
  createExecutionRun,
  getExecutionRun,
  listExecutionRunsByTask,
  clearAllExecutionRuns,
} from "@/lib/storage/execution-run-store";
import { POST as retryRoute } from "@/app/api/execution-runs/[run_id]/retry/route";

function resetMemory(): void {
  const g = globalThis as typeof globalThis & { __executionRunMemoryStore?: ExecutionRun[] };
  g.__executionRunMemoryStore = [];
}

beforeEach(async () => {
  resetMemory();
  await clearAllExecutionRuns();
  delete process.env.ACR_EXECUTION_TRIGGER;
});

afterAll(async () => {
  await fs.rm(TMP_DIR, { recursive: true, force: true }).catch(() => {});
});

function retryReq(body?: unknown): Request {
  return new Request("http://x/api/execution-runs/run/retry", {
    method: "POST",
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

async function seedRun() {
  return createExecutionRun({
    taskId: "task-42",
    repoPath: "/repo",
    baseBranch: "main",
    agent: "claude-code",
    prompt: "do the work",
    acceptanceCriteria: ["builds"],
    allowedFiles: ["src/a.ts"],
    blockedFiles: [".env"],
    complexity: "C2",
    mode: "implement_verify",
  });
}

describe("retry route", () => {
  it("404s an unknown run", async () => {
    const res = await retryRoute(retryReq(), { params: Promise.resolve({ run_id: "nope" }) });
    expect(res.status).toBe(404);
  });

  it("creates a new run with the same work order and returns retried_from", async () => {
    const original = await seedRun();
    const res = await retryRoute(retryReq({}), {
      params: Promise.resolve({ run_id: original.id }),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { run_id: string; retried_from: string; status: string };
    expect(json.retried_from).toBe(original.id);
    expect(json.run_id).not.toBe(original.id);
    expect(json.status).toBe("queued");

    const runs = await listExecutionRunsByTask("task-42");
    expect(runs.length).toBe(2);

    const retried = await getExecutionRun(json.run_id);
    expect(retried?.agent).toBe("claude-code");
    expect(retried?.prompt).toBe("do the work");
    expect(retried?.allowedFiles).toEqual(["src/a.ts"]);
    // original is untouched history
    const orig = await getExecutionRun(original.id);
    expect(orig).toBeTruthy();
  });

  it("honors an agent override (retry_with_verifier escalation)", async () => {
    const original = await seedRun();
    const res = await retryRoute(retryReq({ agent: "codex" }), {
      params: Promise.resolve({ run_id: original.id }),
    });
    expect(res.status).toBe(201);
    const json = (await res.json()) as { run_id: string };
    const retried = await getExecutionRun(json.run_id);
    expect(retried?.agent).toBe("codex");
  });

  it("rejects an invalid agent override", async () => {
    const original = await seedRun();
    const res = await retryRoute(retryReq({ agent: "gpt-5" }), {
      params: Promise.resolve({ run_id: original.id }),
    });
    expect(res.status).toBe(400);
  });
});
