import type { RiskLevel } from "@/lib/types";
import { getTelegramClient } from "./telegram-client";

export type HermesContactKind = "status" | "approval" | "warning" | "failure";

export type HermesContactRequest = {
  kind?: HermesContactKind;
  message: string;
  taskId?: string;
  taskName?: string;
  riskLevel?: RiskLevel;
  reason?: string;
  affectedFiles?: string[];
  recommendation?: string;
};

export type HermesContactResult = {
  success: boolean;
  channel: "telegram" | "telegram-mock" | "none";
  fallbackUsed: boolean;
  message: string;
  error?: string;
};

function hasTelegramConfig(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID);
}

export function formatHermesContactMessage(request: HermesContactRequest): string {
  const kind = request.kind ?? "status";
  const title = {
    approval: "[Hermes Approval Required]",
    failure: "[Hermes Failure]",
    warning: "[Hermes Warning]",
    status: "[Hermes Status]",
  }[kind];

  const lines = [
    `*${title}*`,
    "",
    request.taskId ? `Task: ${request.taskId}` : undefined,
    request.taskName ? `Name: ${request.taskName}` : undefined,
    request.riskLevel ? `Risk Level: ${request.riskLevel.toUpperCase()}` : undefined,
    request.reason ? `Reason: ${request.reason}` : undefined,
    "",
    request.message,
  ].filter((line): line is string => line !== undefined);

  if (request.affectedFiles?.length) {
    lines.push("", "*Affected Files:*", ...request.affectedFiles.map((file) => `- ${file}`));
  }

  if (request.recommendation) {
    lines.push("", "*Recommendation:*", request.recommendation);
  }

  if (kind === "approval") {
    lines.push(
      "",
      "*Reply options:*",
      "approve / reject / preview_first / control_room",
      "",
      "Execution is not triggered by this message. Agent Control Room records the decision first."
    );
  }

  return lines.join("\n").trim();
}

export async function contactUserViaHermes(
  request: HermesContactRequest
): Promise<HermesContactResult> {
  const message = formatHermesContactMessage(request);

  try {
    const sent = await getTelegramClient().sendMessage(message);

    return {
      success: sent,
      channel: hasTelegramConfig() ? "telegram" : "telegram-mock",
      fallbackUsed: false,
      message: sent
        ? "Hermes Telegram notification sent."
        : "Hermes Telegram notification failed.",
    };
  } catch (error) {
    return {
      success: false,
      channel: "none",
      fallbackUsed: false,
      message: "Hermes Telegram notification failed.",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
