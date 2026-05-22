import { NextRequest } from "next/server";
import { POST as contactHermes } from "@/app/api/hermes/contact/route";
import { POST as classifyRisk } from "@/app/api/orchestration/classify/route";
import { contactUserViaHermes, formatHermesContactMessage } from "@/lib/hermes/hermes-contact-bridge";
import { resetTelegramClient } from "@/lib/hermes/telegram-client";
import type { DispatchJob } from "@/lib/types";

const originalEnv = process.env;
const fetchMock = jest.fn();

function makeRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  jest.resetModules();
  process.env = { ...originalEnv };
  process.env.TELEGRAM_BOT_TOKEN = "test-bot-token";
  process.env.TELEGRAM_CHAT_ID = "6308981865";
  resetTelegramClient();
  fetchMock.mockReset();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterAll(() => {
  process.env = originalEnv;
  resetTelegramClient();
});

describe("Hermes contact bridge", () => {
  it("formats approval messages with explicit non-execution wording", () => {
    const message = formatHermesContactMessage({
      kind: "approval",
      taskId: "job-approval-001",
      taskName: "Deploy preview",
      riskLevel: "high",
      reason: "High-risk operation",
      message: "Please approve or reject.",
    });

    expect(message).toContain("[Hermes Approval Required]");
    expect(message).toContain("approve / reject / preview_first / control_room");
    expect(message).toContain("Execution is not triggered by this message");
  });

  it("sends a Hermes Telegram notification when Telegram env is configured", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const result = await contactUserViaHermes({
      kind: "status",
      message: "Control Room smoke check",
    });

    expect(result).toMatchObject({
      success: true,
      channel: "telegram",
      fallbackUsed: false,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/bottest-bot-token/sendMessage"),
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining("Control Room smoke check"),
      })
    );
  });

  it("uses Telegram mock mode when Telegram env is absent", async () => {
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.TELEGRAM_CHAT_ID;
    resetTelegramClient();

    const result = await contactUserViaHermes({
      kind: "warning",
      message: "No credentials configured",
    });

    expect(result).toMatchObject({
      success: true,
      channel: "telegram-mock",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Hermes contact API", () => {
  it("rejects missing messages", async () => {
    const response = await contactHermes(makeRequest("http://localhost/api/hermes/contact", {
      kind: "status",
    }));

    expect(response.status).toBe(400);
  });

  it("accepts approval contact requests", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });

    const response = await contactHermes(makeRequest("http://localhost/api/hermes/contact", {
      kind: "approval",
      message: "Approval required",
      taskId: "job-approval-002",
      riskLevel: "high",
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      success: true,
      channel: "telegram",
    });
  });
});

describe("Risk classification Telegram notification", () => {
  it("notifies Hermes only when requested for high-risk jobs", async () => {
    fetchMock.mockResolvedValueOnce({ ok: true });
    const job: DispatchJob = {
      id: "dispatch-git-push-001",
      taskId: "task-git-push-001",
      agentId: "codex",
      riskLevel: "high",
      status: "queued",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      prompt: "Run git push after final approval",
    };

    const response = await classifyRisk(makeRequest("http://localhost/api/orchestration/classify", {
      job,
      notify: true,
    }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.approval_required).toBe(true);
    expect(body.notification).toMatchObject({
      sent: true,
      channel: "telegram",
    });
  });
});
