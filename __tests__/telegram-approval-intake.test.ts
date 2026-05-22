import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/orchestration/telegram/approve/route";
import { ApprovalRequestStore } from "@/lib/approval/approval-request-store";
import { getGlobalQueue, resetGlobalQueue } from "@/lib/dispatch/safe-dispatch-queue";
import type { ApprovalRequest, DispatchJob } from "@/lib/types";

const originalApprovalPath = process.env.APPROVAL_REQUESTS_PATH;
const originalLogPath = process.env.ORCHESTRATION_LOG_PATH;
let tempDir = "";

function requestFor(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/orchestration/telegram/approve", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function baseJob(overrides: Partial<DispatchJob> = {}): DispatchJob {
  return {
    id: "telegram-job-001",
    taskId: "telegram-task-001",
    agentId: "claude-code",
    riskLevel: "high",
    status: "queued",
    createdAt: new Date().toISOString(),
    retryCount: 0,
    prompt: "High-risk approval test",
    ...overrides,
  };
}

function readApprovals(): ApprovalRequest[] {
  return JSON.parse(
    fs.readFileSync(path.join(tempDir, "approval-requests.json"), "utf8"),
  ) as ApprovalRequest[];
}

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "acr-telegram-approval-"));
  process.env.APPROVAL_REQUESTS_PATH = path.join(tempDir, "approval-requests.json");
  process.env.ORCHESTRATION_LOG_PATH = path.join(tempDir, "orchestration-logs.ndjson");
  resetGlobalQueue();
});

afterEach(() => {
  resetGlobalQueue();
  if (originalApprovalPath === undefined) {
    delete process.env.APPROVAL_REQUESTS_PATH;
  } else {
    process.env.APPROVAL_REQUESTS_PATH = originalApprovalPath;
  }
  if (originalLogPath === undefined) {
    delete process.env.ORCHESTRATION_LOG_PATH;
  } else {
    process.env.ORCHESTRATION_LOG_PATH = originalLogPath;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("Telegram approval intake", () => {
  it("persists approve responses and marks matching queued jobs approved", async () => {
    const queue = getGlobalQueue();
    queue.addJob(baseJob());

    const response = await POST(
      requestFor({
        task_id: "telegram-job-001",
        user_response: "approve",
        notes: "Approved from Telegram",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.success).toBe(true);
    expect(payload.mode).toBe("recorded");
    expect(payload.persisted).toBe(true);
    expect(payload.dispatch_job_updated).toBe(true);
    expect(payload.execution_triggered).toBe(false);
    expect(queue.getJob("telegram-job-001")?.status).toBe("approved");

    const approvals = readApprovals();
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      dispatchJobId: "telegram-job-001",
      status: "approved",
      approvalSource: "telegram",
      telegramResponse: "approve",
      approverNote: "Approved from Telegram",
    });
    expect(approvals[0].resolvedAt).toBeDefined();
  });

  it("persists reject responses and marks matching queued jobs skipped", async () => {
    const queue = getGlobalQueue();
    queue.addJob(baseJob({ id: "telegram-job-reject-001" }));

    const response = await POST(
      requestFor({
        task_id: "telegram-job-reject-001",
        user_response: "reject",
        notes: "Too risky",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.dispatch_job_updated).toBe(true);
    expect(queue.getJob("telegram-job-reject-001")?.status).toBe("skipped_due_to_risk");
    expect(readApprovals()[0]).toMatchObject({
      dispatchJobId: "telegram-job-reject-001",
      status: "rejected",
      telegramResponse: "reject",
    });
  });

  it("records preview/control-room responses without resolving approval or triggering execution", async () => {
    const store = new ApprovalRequestStore();
    await store.createApprovalRequest("telegram-job-preview-001");

    const response = await POST(
      requestFor({
        task_id: "telegram-job-preview-001",
        user_response: "preview_first",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.persisted).toBe(true);
    expect(payload.dispatch_job_updated).toBe(false);
    expect(payload.execution_triggered).toBe(false);

    const approvals = readApprovals();
    expect(approvals).toHaveLength(1);
    expect(approvals[0]).toMatchObject({
      dispatchJobId: "telegram-job-preview-001",
      status: "pending",
      telegramResponse: "preview_first",
      approvalSource: "telegram",
    });
    expect(approvals[0].resolvedAt).toBeUndefined();
  });

  it("rejects malformed Telegram approval responses", async () => {
    const response = await POST(
      requestFor({
        task_id: "telegram-job-001",
        user_response: "ship_it",
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error).toContain("Invalid response");
  });
});
