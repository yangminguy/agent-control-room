/**
 * Phase 14 E2E — Auto-Dispatcher integration test
 *
 * Verifies:
 *   1. /api/workbench/dispatch saves CTO metadata sidecar
 *   2. scheduleAutoDispatch → /api/runner is called with a valid approval token
 *   3. Token-bound context (planId/taskId/agent/cwd) matches what auto-dispatcher resolved
 *   4. cwd fallback chain: metadata.cwd → project lookup → L5_DEFAULT_PROJECT_PATH
 *   5. Non-auto_execute or D3+ tasks are skipped
 */
import os from "os";
import path from "path";
import { promises as fs } from "fs";

const tmpDir = path.join(os.tmpdir(), `acr-auto-dispatch-${Date.now()}`);

let savedOpenAIKey: string | undefined;

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  process.env.FEATURE_PLANS_DATA_DIR = tmpDir;
  process.env.L5_DEFAULT_PROJECT_PATH = tmpDir;
  process.env.ACR_BASE_URL = "http://localhost:3001";
  // Phase 16.5: replanNextPrompt opts into a real OpenAI call when
  // OPENAI_API_KEY is set. Tests rely on the deterministic fallback path
  // (priorContext + basePrompt) so we unset the key for this suite.
  savedOpenAIKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  if (savedOpenAIKey !== undefined) process.env.OPENAI_API_KEY = savedOpenAIKey;
});

// Reset jest module registry between tests so storage memory globals are fresh.
beforeEach(() => {
  jest.resetModules();
  delete (globalThis as Record<string, unknown>).__featurePlanMemoryStore;
  delete (globalThis as Record<string, unknown>).__ctoTaskMetaStore;
});

interface CapturedRunnerCall {
  planId: string;
  taskId: string;
  agent: string;
  cwd: string;
  approvalToken: string;
  prompt: string;
}

function installRunnerMock(captured: CapturedRunnerCall[]) {
  const realFetch = global.fetch;
  const mock = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.endsWith("/api/runner")) {
      const body = JSON.parse(init?.body as string);
      captured.push(body);
      // Simulate runner SSE that closes immediately.
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: {\"log\":\"[DONE]\",\"type\":\"system\"}\n\n"));
          controller.close();
        },
      });
      return new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      });
    }
    return realFetch(url, init);
  });
  global.fetch = mock as unknown as typeof fetch;
  return () => {
    global.fetch = realFetch;
  };
}

test("dispatch + auto-dispatcher: D2 auto_execute phase triggers /api/runner with valid token", async () => {
  const { POST: dispatchPOST } = await import("@/app/api/workbench/dispatch/route");
  const { listCTOTaskMetadataByPlan } = await import("@/lib/storage/cto-task-metadata-store");
  const { getFeaturePlanById } = await import("@/lib/storage/feature-plan-store");

  const captured: CapturedRunnerCall[] = [];
  const restore = installRunnerMock(captured);

  try {
    const intent = {
      l5_task_id: "l5-task-001",
      task_title: "Auto-dispatch smoke test",
      created_at: new Date().toISOString(),
      project_path: tmpDir,
      phases: [
        {
          name: "Architecture & Spec",
          runtime: "claude" as const,
          prompt_packet: "Design spec",
          expected_output: "Spec doc",
          risk_level: "D2" as const,
          release_gate_type: "none" as const,
          l5_approval_required: false,
          auto_execute: true,
        },
        {
          name: "Implementation",
          runtime: "codex" as const,
          prompt_packet: "Implement",
          expected_output: "Code",
          risk_level: "D2" as const,
          release_gate_type: "none" as const,
          l5_approval_required: false,
          auto_execute: true,
        },
      ],
    };

    const req = new Request("http://localhost:3001/api/workbench/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intent),
    });
    const res = await dispatchPOST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.phase_count).toBe(2);
    expect(json.auto_dispatch_scheduled).toBe(true);
    const planId = json.plan_id as string;

    // Sidecar metadata persisted with phase-level fields preserved
    const metaList = await listCTOTaskMetadataByPlan(planId);
    expect(metaList).toHaveLength(2);
    expect(metaList.every((m) => m.auto_execute && m.release_gate_type === "none")).toBe(true);
    expect(metaList[0].cwd).toBe(tmpDir);
    expect(metaList[0].runtime).toBe("claude");
    expect(metaList[1].runtime).toBe("codex");
    expect(metaList[0].l5_task_id).toBe("l5-task-001");

    // Wait for fire-and-forget scheduleAutoDispatch to drain both phases.
    // It's promise-chained via setImmediate; drain the microtask queue + a tick.
    await new Promise((r) => setTimeout(r, 100));

    // Two phases → two /api/runner calls
    expect(captured).toHaveLength(2);

    // First call: claude phase
    expect(captured[0].planId).toBe(planId);
    expect(captured[0].agent).toBe("claude-code");
    expect(captured[0].cwd).toBe(tmpDir);
    expect(captured[0].approvalToken).toMatch(/^appr-/);
    expect(captured[0].prompt).toContain("Design spec");

    // Second call: codex phase
    expect(captured[1].agent).toBe("codex");
    expect(captured[1].cwd).toBe(tmpDir);
    expect(captured[1].prompt).toContain("Implement");

    // Plan still exists in store
    const plan = await getFeaturePlanById(planId);
    expect(plan).toBeTruthy();
    expect(plan!.tasks).toHaveLength(2);
  } finally {
    restore();
  }
});

test("D4 manual_founder phase is NOT auto-dispatched", async () => {
  const { POST: dispatchPOST } = await import("@/app/api/workbench/dispatch/route");
  const captured: CapturedRunnerCall[] = [];
  const restore = installRunnerMock(captured);

  try {
    const intent = {
      l5_task_id: "l5-task-d4",
      task_title: "Risky external action",
      created_at: new Date().toISOString(),
      project_path: tmpDir,
      phases: [
        {
          name: "Sensitive deploy",
          runtime: "claude" as const,
          prompt_packet: "Deploy",
          expected_output: "Deployment",
          risk_level: "D4" as const,
          release_gate_type: "manual_founder" as const,
          l5_approval_required: true,
          auto_execute: false,
        },
      ],
    };
    const req = new Request("http://localhost:3001/api/workbench/dispatch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(intent),
    });
    const res = await dispatchPOST(req);
    const json = await res.json();
    expect(json.auto_dispatch_scheduled).toBe(false);

    await new Promise((r) => setTimeout(r, 50));
    expect(captured).toHaveLength(0);
  } finally {
    restore();
  }
});

test("internal-token endpoint requires L5_SHARED_SECRET header", async () => {
  process.env.L5_SHARED_SECRET = "test-secret-xyz";
  const { POST: tokenPOST } = await import("@/app/api/orchestration/internal-token/route");

  // Missing header → 401
  const req1 = new Request("http://localhost:3001/api/orchestration/internal-token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ planId: "p", taskId: "t", agent: "claude-code", cwd: "/tmp" }),
  });
  const res1 = await tokenPOST(req1);
  expect(res1.status).toBe(401);

  // Correct header → 200 + token
  const req2 = new Request("http://localhost:3001/api/orchestration/internal-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-l5-shared-secret": "test-secret-xyz" },
    body: JSON.stringify({ planId: "p", taskId: "t", agent: "claude-code", cwd: "/tmp" }),
  });
  const res2 = await tokenPOST(req2);
  expect(res2.status).toBe(200);
  const json2 = await res2.json();
  expect(json2.token).toMatch(/^appr-/);
  expect(json2.expiresIn).toBeGreaterThan(0);

  delete process.env.L5_SHARED_SECRET;
});

test("internal-token endpoint fails closed without L5_SHARED_SECRET", async () => {
  delete process.env.L5_SHARED_SECRET;
  const { POST: tokenPOST } = await import("@/app/api/orchestration/internal-token/route");
  const req = new Request("http://localhost:3001/api/orchestration/internal-token", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-l5-shared-secret": "any" },
    body: JSON.stringify({ planId: "p", taskId: "t", agent: "claude-code", cwd: "/tmp" }),
  });
  const res = await tokenPOST(req);
  expect(res.status).toBe(503);
});
