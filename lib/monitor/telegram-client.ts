/**
 * Telegram Bot Client for Hermes
 * Handles approval requests, status reports, and notifications
 */

export interface TelegramMessage {
  chat_id: string;
  text: string;
  parse_mode?: "HTML" | "Markdown" | "MarkdownV2";
  reply_markup?: unknown;
}

export interface ApprovalRequest {
  task_id: string;
  task_name: string;
  risk_level: "low" | "medium" | "high";
  reason: string;
  validation_state?: Record<string, string>;
  affected_files?: string[];
  recommendation?: string;
}

export interface ApprovalResponse {
  task_id: string;
  user_response: "approve" | "reject" | "preview_first" | "control_room";
  timestamp: number;
  notes?: string;
}

export interface StatusReport {
  phase_id: string;
  phase_title: string;
  status: "completed" | "failed" | "blocked" | "in_progress";
  summary: string;
  changes?: string[];
  risks?: string[];
  next_action?: string;
}

export class TelegramClient {
  private botToken: string;
  private chatId: string;
  private endpoint = "https://api.telegram.org";
  private timeout = 10000; // 10초

  constructor(botToken: string, chatId: string) {
    if (!botToken || !chatId) {
      console.warn(
        "[Telegram] Bot token or chat ID not configured. Telegram notifications disabled."
      );
    }
    this.botToken = botToken;
    this.chatId = chatId;
  }

  async sendMessage(text: string): Promise<boolean> {
    if (!this.botToken || !this.chatId) {
      console.log("[Telegram Mock] sendMessage:", text);
      return true;
    }

    try {
      const response = await fetch(
        `${this.endpoint}/bot${this.botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: this.chatId,
            text,
            parse_mode: "Markdown",
          }),
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        console.error(`[Telegram] Failed to send message: ${response.status}`);
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "[Telegram] Error sending message:",
        error instanceof Error ? error.message : String(error)
      );
      return false;
    }
  }

  async sendApprovalRequest(request: ApprovalRequest): Promise<boolean> {
    const message = this._formatApprovalRequest(request);
    return this.sendMessage(message);
  }

  async sendStatusReport(report: StatusReport): Promise<boolean> {
    const message = this._formatStatusReport(report);
    return this.sendMessage(message);
  }

  async sendPhaseCompleteReport(
    phaseId: string,
    phaseTitle: string,
    summary: string,
    changedFiles: string[]
  ): Promise<boolean> {
    const message = `
*[Hermes Phase Complete]*

Phase: ${phaseId}
Title: ${phaseTitle}

${summary}

*Changed Files:*
${changedFiles.map((f) => `• ${f}`).join("\n")}

✅ Phase 완료. Agent Control Room으로 결과를 반환합니다.
    `.trim();

    return this.sendMessage(message);
  }

  async sendFailureReport(
    taskId: string,
    taskName: string,
    reason: string,
    affectedFiles: string[],
    suggestion: string
  ): Promise<boolean> {
    const message = `
*[Hermes Failure Report]*

Task: ${taskId}
Name: ${taskName}

*Reason:*
${reason}

*Affected Files:*
${affectedFiles.length > 0 ? affectedFiles.map((f) => `• ${f}`).join("\n") : "None"}

*Suggestion:*
${suggestion}

⚠️ Agent Control Room으로 Orchestration Packet을 반환합니다.
    `.trim();

    return this.sendMessage(message);
  }

  async sendHighRiskWarning(
    operation: string,
    reason: string,
    recommendation: string
  ): Promise<boolean> {
    const message = `
*[⚠️ High Risk Operation Detected]*

Operation: ${operation}

*Reason:*
${reason}

*Recommendation:*
${recommendation}

System is waiting for approval or Agent Control Room decision.
    `.trim();

    return this.sendMessage(message);
  }

  private _formatApprovalRequest(request: ApprovalRequest): string {
    const validationLines =
      request.validation_state && Object.keys(request.validation_state).length
        ? Object.entries(request.validation_state)
            .map(([key, value]) => `  • ${key}: ${value}`)
            .join("\n")
        : "  • 검증 상태 없음";

    const filesLines =
      request.affected_files && request.affected_files.length
        ? request.affected_files.map((f) => `  • ${f}`).join("\n")
        : "  • 영향받는 파일 없음";

    const recommendationSection = request.recommendation
      ? `\n*Recommendation:*\n${request.recommendation}`
      : "";

    return `
*[Hermes Approval Request]*

Task: ${request.task_id}
Name: ${request.task_name}
Risk Level: ${request.risk_level.toUpperCase()}

*Reason:*
${request.reason}

*Validation State:*
${validationLines}

*Affected Files:*
${filesLines}${recommendationSection}

*Please respond:*
1️⃣ approve - 진행 승인
2️⃣ reject - 거부
3️⃣ preview_first - 미리보기 먼저
4️⃣ control_room - Agent Control Room으로 전달
    `.trim();
  }

  private _formatStatusReport(report: StatusReport): string {
    const changeLines =
      report.changes && report.changes.length
        ? report.changes.map((c) => `  • ${c}`).join("\n")
        : "  • 변경사항 없음";

    const riskLines =
      report.risks && report.risks.length
        ? report.risks.map((r) => `  ⚠️ ${r}`).join("\n")
        : "  • 위험 신호 없음";

    const statusEmoji = {
      completed: "✅",
      failed: "❌",
      blocked: "🚫",
      in_progress: "⏳",
    }[report.status];

    const nextActionSection = report.next_action
      ? `\n*Next Action:*\n${report.next_action}`
      : "";

    return `
*[Hermes Status Report]*

${statusEmoji} Phase: ${report.phase_id}
Title: ${report.phase_title}
Status: ${report.status}

*Summary:*
${report.summary}

*Changes:*
${changeLines}

*Risks:*
${riskLines}${nextActionSection}

Agent Control Room으로 다음 판단을 요청합니다.
    `.trim();
  }
}

let telegramClient: TelegramClient | null = null;

export function initTelegramClient(
  botToken: string,
  chatId: string
): TelegramClient {
  if (!telegramClient) {
    telegramClient = new TelegramClient(botToken, chatId);
  }
  return telegramClient;
}

export function getTelegramClient(): TelegramClient {
  if (!telegramClient) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN || "";
    const chatId = process.env.TELEGRAM_CHAT_ID || "";
    telegramClient = new TelegramClient(botToken, chatId);
  }
  return telegramClient;
}

export function resetTelegramClient(): void {
  telegramClient = null;
}
