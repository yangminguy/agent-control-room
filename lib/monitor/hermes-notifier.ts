import { MonitorPacket } from "./types";

/**
 * Hermes Notifier
 * Sends Hermes packets to Telegram (if env set) or logs to console (mock/preview)
 */

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

interface NotifyOptions {
  dryRun?: boolean;
  verbose?: boolean;
}

/**
 * 한글 packet kind 레이블
 */
const KIND_LABELS: Record<string, string> = {
  "phase-completion": "✅ 작업 완료",
  failure: "❌ 작업 실패",
  "drift-detection": "⚠️ 드리프트 감지",
  "approval-request": "🔒 승인 요청",
  "re-orchestration": "🔄 재오케스트레이션",
  "session-summary": "📋 세션 요약",
  "context-pack": "📦 컨텍스트 팩",
  "handoff-pack": "🤝 핸드오프 팩",
  "failed-task-review": "🔍 실패 분석",
  "background-research": "🔬 배경 연구",
  "obsidian-note": "📝 Obsidian 노트",
};

/**
 * Notify via Telegram or mock
 */
export async function notifyHermesPacket(
  packet: MonitorPacket,
  options: NotifyOptions = {}
): Promise<{ success: boolean; mode: "telegram" | "mock"; message?: string }> {
  const { dryRun = false, verbose = false } = options;

  // Build message
  const message = buildTelegramMessage(packet);

  if (dryRun) {
    console.log("\n📤 [DRY-RUN] Hermes packet 알림:");
    console.log(message);
    console.log("(실제 전송 안 됨)\n");
    return { success: true, mode: "mock" };
  }

  // Check if Telegram env is set
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    // Mock mode
    if (verbose) {
      console.log("\n📤 [MOCK] Telegram env 없음. 콘솔에 출력합니다:");
      console.log(message);
      console.log("");
    }
    return { success: true, mode: "mock", message };
  }

  // Send to Telegram
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
        }),
      }
    );

    if (!response.ok) {
      console.error(
        `Telegram 전송 실패: ${response.status} ${response.statusText}`
      );
      return {
        success: false,
        mode: "telegram",
        message: `Failed: ${response.statusText}`,
      };
    }

    if (verbose) {
      console.log(`✅ Telegram으로 packet 전송됨: ${packet.id}`);
    }
    return { success: true, mode: "telegram" };
  } catch (error) {
    console.error("Telegram 전송 중 오류:", error);
    return {
      success: false,
      mode: "telegram",
      message: `Error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Build Telegram message from packet
 */
function buildTelegramMessage(packet: MonitorPacket): string {
  const kindLabel = KIND_LABELS[packet.kind] || `📌 ${packet.kind}`;
  const ctx = packet.executionContext || {};

  let message = `${kindLabel}\n`;
  message += `*${packet.title}*\n`;
  message += `${packet.description}\n\n`;

  // Execution context
  if (ctx.taskId || ctx.dispatchJobId) {
    message += "_Context:_\n";
    if (ctx.taskId) message += `• Task: \`${ctx.taskId}\`\n`;
    if (ctx.dispatchJobId) message += `• Job: \`${ctx.dispatchJobId}\`\n`;
    if (ctx.agentId) message += `• Agent: ${ctx.agentId}\n`;
    if (ctx.status) message += `• Status: ${ctx.status}\n`;
    if (ctx.riskLevel) message += `• Risk: ${ctx.riskLevel}\n`;
    message += "\n";
  }

  // Recommended next action
  if (ctx.recommendedNextAction) {
    message += `_다음 행동:_ ${ctx.recommendedNextAction}\n\n`;
  }

  // Summary of sections
  if (packet.content.sections.length > 0) {
    const firstSection = packet.content.sections[0];
    if (firstSection.body) {
      const truncated =
        firstSection.body.length > 200
          ? firstSection.body.substring(0, 200) + "…"
          : firstSection.body;
      message += `_${firstSection.title}:_\n${truncated}\n\n`;
    }
  }

  // Timestamp
  message += `_${new Date(packet.createdAt).toLocaleString("ko-KR")}_`;

  return message;
}

/**
 * Format packet for console output (dry-run preview)
 */
export function formatPacketForConsole(packet: MonitorPacket): string {
  const kindLabel = KIND_LABELS[packet.kind] || `[${packet.kind}]`;
  let output = `\n${"═".repeat(50)}\n`;
  output += `${kindLabel}\n`;
  output += `${packet.title}\n`;
  output += `${"─".repeat(50)}\n`;
  output += `${packet.description}\n\n`;

  // Execution context
  const ctx = packet.executionContext;
  if (ctx) {
    if (ctx.taskId || ctx.dispatchJobId || ctx.agentId) {
      output += "Context:\n";
      if (ctx.taskId) output += `  Task ID: ${ctx.taskId}\n`;
      if (ctx.dispatchJobId) output += `  Dispatch Job: ${ctx.dispatchJobId}\n`;
      if (ctx.agentId) output += `  Agent: ${ctx.agentId}\n`;
      if (ctx.status) output += `  Status: ${ctx.status}\n`;
      if (ctx.riskLevel) output += `  Risk: ${ctx.riskLevel}\n`;
      output += "\n";
    }

    if (ctx.recommendedNextAction) {
      output += `Recommended Action: ${ctx.recommendedNextAction}\n\n`;
    }
  }

  // Content sections
  if (packet.content.sections.length > 0) {
    output += "Content:\n";
    for (const section of packet.content.sections) {
      const indent = "  ".repeat(section.level - 1);
      output += `${indent}${section.title}\n`;
      const bodyLines = section.body.split("\n");
      for (const line of bodyLines.slice(0, 3)) {
        output += `${indent}  ${line}\n`;
      }
      if (bodyLines.length > 3) {
        output += `${indent}  ...\n`;
      }
    }
  }

  output += `${"═".repeat(50)}\n`;
  return output;
}
