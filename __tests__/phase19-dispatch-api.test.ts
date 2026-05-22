import { describe, expect, it, afterEach } from "@jest/globals";
import { POST } from "../app/api/orchestration/dispatch/route";
import type { DispatchJob } from "../lib/types";
import { AntigravityCliAdapter } from "../lib/dispatch/adapters/antigravity-cli-adapter";
import { classifyCodexOutput } from "../lib/dispatch/adapters/codex-cli-adapter";

const baseJob: DispatchJob = {
  id: "job-test-001",
  taskId: "task-test-001",
  agentId: "codex",
  riskLevel: "low",
  status: "queued",
  createdAt: new Date().toISOString(),
  retryCount: 0,
  prompt: "Run a harmless mock dispatch.",
};

function requestFor(body: unknown): Request {
  return new Request("http://localhost/api/orchestration/dispatch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("Phase 19 dispatch API", () => {
  const originalPath = process.env.PATH;

  afterEach(() => {
    delete process.env.MOCK_DISPATCH;
    delete process.env.CODEX_MOCK_MODE;
    process.env.PATH = originalPath;
  });

  it("returns a valid AgentResult in default mock mode", async () => {
    const response = await POST(requestFor(baseJob));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.result.dispatchJobId).toBe(baseJob.id);
    expect(payload.result.agentId).toBe(baseJob.agentId);
    expect(payload.result.resultStatus).toBe("pass");
  });

  it("blocks risky jobs that are not approved", async () => {
    const response = await POST(
      requestFor({
        ...baseJob,
        id: "job-risky-001",
        riskLevel: "high",
        status: "queued",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("requires approval");
  });

  it("allows approved risky jobs", async () => {
    const response = await POST(
      requestFor({
        ...baseJob,
        id: "job-risky-approved-001",
        riskLevel: "high",
        status: "approved",
        approvedAt: new Date().toISOString(),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.result.dispatchJobId).toBe("job-risky-approved-001");
  });

  it("rejects malformed payloads", async () => {
    const response = await POST(requestFor({ id: "bad" }));
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.success).toBe(false);
  });

  it("blocks real CLI mode on the dispatch endpoint", async () => {
    process.env.MOCK_DISPATCH = "false";

    const response = await POST(requestFor({ ...baseJob, id: "job-real-missing-cli-001" }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Use /api/runner");
  });

  it("still blocks real CLI mode even when the submitted job claims approval", async () => {
    process.env.MOCK_DISPATCH = "false";
    process.env.PATH = "";

    const response = await POST(requestFor({
      ...baseJob,
      id: "job-real-no-path-001",
      status: "approved",
      approvedAt: new Date().toISOString(),
    }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.success).toBe(false);
    expect(payload.error).toContain("Use /api/runner");
  });

  it("honors CODEX_MOCK_MODE when MOCK_DISPATCH is unset", async () => {
    process.env.CODEX_MOCK_MODE = "false";
    process.env.PATH = "";

    const response = await POST(requestFor({ ...baseJob, id: "job-codex-env-real-001" }));
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload.error).toContain("Use /api/runner");
  });

  it("classifies Codex output keywords into normalized result statuses", () => {
    expect(classifyCodexOutput("QA needed before merge", 0)).toBe("qa_needed");
    expect(classifyCodexOutput("Minor fix required in tests", 0)).toBe("minor_fix");
    expect(classifyCodexOutput("Blocked pending user decision", 0)).toBe("blocked");
    expect(classifyCodexOutput("Safety violation: forbidden file touched", 0)).toBe(
      "safety_violation",
    );
    expect(classifyCodexOutput("All checks passed", 0)).toBe("pass");
    expect(classifyCodexOutput("All checks passed", 1)).toBe("blocked");
  });

  it("can queue Antigravity through the executable adapter in mock mode", async () => {
    const adapter = new AntigravityCliAdapter(true);
    const result = await adapter.dispatch({
      ...baseJob,
      id: "job-antigravity-cli-001",
      agentId: "antigravity",
      prompt: "Polish the plan UI.",
    });

    expect(result.agentId).toBe("antigravity");
    expect(result.resultStatus).toBe("pass");
    expect(result.rawOutput).toContain("[MOCK] Antigravity job");
  });
});
