import { describe, expect, it, afterEach } from "@jest/globals";
import { POST } from "../app/api/orchestration/dispatch/route";
import type { DispatchJob } from "../lib/types";

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

  it("returns a blocked result when real CLI mode cannot complete", async () => {
    process.env.MOCK_DISPATCH = "false";

    const response = await POST(requestFor({ ...baseJob, id: "job-real-missing-cli-001" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.result.resultStatus).toBe("blocked");
  });

  it("returns a CLI-not-found result when real CLI mode cannot find the CLI", async () => {
    process.env.MOCK_DISPATCH = "false";
    process.env.PATH = "";

    const response = await POST(requestFor({ ...baseJob, id: "job-real-no-path-001" }));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.result.resultStatus).toBe("blocked");
    expect(payload.result.rawOutput).toContain("Codex CLI not found");
  });
});
