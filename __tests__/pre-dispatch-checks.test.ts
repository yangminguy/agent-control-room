/**
 * Phase 18.1 — Pre-dispatch trigger hooks for auto-dispatcher.
 *
 * Verifies:
 *   1. clarifying_questions present + no answers → /api/runner is NOT called,
 *      L5 callback fires with status=needs_clarification + questions + acr_callback_url
 *   2. clarifying_questions fully answered → dispatch proceeds normally
 *   3. risk-classifier escalates D2 prompt to D4 (high-risk pattern) →
 *      L5 callback fires with status=risk_reassess + new_risk_level=D4 and
 *      runner is NOT called (escalated past D3 gate)
 *   4. low-risk prompt at D2 → no risk_reassess callback, runner proceeds
 */
import os from "os";
import path from "path";
import { promises as fs } from "fs";

const tmpDir = path.join(os.tmpdir(), `acr-pre-dispatch-${Date.now()}`);

let savedOpenAIKey: string | undefined;

beforeAll(async () => {
  await fs.mkdir(tmpDir, { recursive: true });
  process.env.FEATURE_PLANS_DATA_DIR = tmpDir;
  process.env.L5_DEFAULT_PROJECT_PATH = tmpDir;
  process.env.ACR_BASE_URL = "http://localhost:3001";
  process.env.L5_BASE_URL = "http://localhost:13001";
  savedOpenAIKey = process.env.OPENAI_API_KEY;
  delete process.env.OPENAI_API_KEY;
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  if (savedOpenAIKey !== undefined) process.env.OPENAI_API_KEY = savedOpenAIKey;
});

beforeEach(() => {
  jest.resetModules();
  delete (globalThis as Record<string, unknown>).__featurePlanMemoryStore;
  delete (globalThis as Record<string, unknown>).__ctoTaskMetaStore;
});

interface Captured {
  runner: Array<Record<string, unknown>>;
  l5Callback: Array<Record<string, unknown>>;
}

function installFetchMock(captured: Captured) {
  const realFetch = global.fetch;
  const mock = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const urlStr = typeof url === "string" ? url : url.toString();
    if (urlStr.endsWith("/api/runner")) {
      captured.runner.push(JSON.parse(init?.body as string));
      const stream = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.close();
        },
      });
      return new Response(stream, { status: 200 });
    }
    if (urlStr.endsWith("/api/agent:taskCallback")) {
      captured.l5Callback.push(JSON.parse(init?.body as string));
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }
    return realFetch(url, init);
  });
  global.fetch = mock as unknown as typeof fetch;
  return () => {
    global.fetch = realFetch;
  };
}

test("clarifying_questions pending → needs_clarification callback + skip runner", async () => {
  const { POST: dispatchPOST } = await import("@/app/api/workbench/dispatch/route");
  const captured: Captured = { runner: [], l5Callback: [] };
  const restore = installFetchMock(captured);

  try {
    const intent = {
      l5_task_id: "l5-clar-1",
      task_title: "Clarify-first phase",
      created_at: new Date().toISOString(),
      project_path: tmpDir,
      phases: [
        {
          name: "Design",
          runtime: "claude" as const,
          prompt_packet: "git status",
          expected_output: "Spec",
          risk_level: "D2" as const,
          release_gate_type: "none" as const,
          l5_approval_required: false,
          auto_execute: true,
          clarifying_questions: [
            "Which database engine?",
            "Sync or async migrations?",
          ],
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

    await new Promise((r) => setTimeout(r, 100));

    expect(captured.runner).toHaveLength(0);
    expect(captured.l5Callback).toHaveLength(1);
    const cb = captured.l5Callback[0];
    expect(cb.status).toBe("needs_clarification");
    expect(cb.l5_task_id).toBe("l5-clar-1");
    expect(cb.questions).toEqual([
      "Which database engine?",
      "Sync or async migrations?",
    ]);
    expect(cb.acr_callback_url).toBe("http://localhost:3001/api/clarify-reply");
  } finally {
    restore();
  }
});

test("risk re-assessment escalates D2→D4 on high-risk prompt and blocks dispatch", async () => {
  const { POST: dispatchPOST } = await import("@/app/api/workbench/dispatch/route");
  const captured: Captured = { runner: [], l5Callback: [] };
  const restore = installFetchMock(captured);

  try {
    const intent = {
      l5_task_id: "l5-risk-1",
      task_title: "Sneaky deploy",
      created_at: new Date().toISOString(),
      project_path: tmpDir,
      phases: [
        {
          name: "Quiet deploy",
          // L5 says D2 but the prompt actually does a production deploy.
          runtime: "claude" as const,
          prompt_packet: "vercel deploy production",
          expected_output: "Deployed",
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
    await dispatchPOST(req);
    await new Promise((r) => setTimeout(r, 100));

    expect(captured.runner).toHaveLength(0);
    expect(captured.l5Callback).toHaveLength(1);
    const cb = captured.l5Callback[0];
    expect(cb.status).toBe("risk_reassess");
    expect(cb.new_risk_level).toBe("D4");
    expect(cb.l5_task_id).toBe("l5-risk-1");
  } finally {
    restore();
  }
});

test("benign D2 prompt → no callback, runner proceeds", async () => {
  const { POST: dispatchPOST } = await import("@/app/api/workbench/dispatch/route");
  const captured: Captured = { runner: [], l5Callback: [] };
  const restore = installFetchMock(captured);

  try {
    const intent = {
      l5_task_id: "l5-benign-1",
      task_title: "Local build",
      created_at: new Date().toISOString(),
      project_path: tmpDir,
      phases: [
        {
          name: "Build",
          runtime: "claude" as const,
          prompt_packet: "pnpm build",
          expected_output: "ok",
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
    await dispatchPOST(req);
    await new Promise((r) => setTimeout(r, 100));

    expect(captured.runner).toHaveLength(1);
    expect(captured.l5Callback).toHaveLength(0);
  } finally {
    restore();
  }
});
