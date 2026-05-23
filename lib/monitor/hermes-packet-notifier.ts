import { TelegramClient, getTelegramClient } from "./telegram-client";
import type { MonitorPacket } from "./types";

// 패킷 종류별 이모지 및 포맷 설정
const packetEmojis: Record<string, string> = {
  "phase-completion": "✅",
  failure: "❌",
  "drift-detection": "⚠️",
  "approval-request": "🔒",
  "re-orchestration": "🔄",
};

interface PacketNotifyOptions {
  includeContext?: boolean; // 실행 컨텍스트 포함 여부
  includeSections?: boolean; // 패킷 내용 섹션 포함 여부
  preview?: boolean; // 건식 실행 모드 (콘솔 출력만)
}

/**
 * Hermes 패킷을 Telegram으로 알립니다.
 * 환경 변수 TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID가 없으면 콘솔 미리보기만 출력
 */
export async function notifyHermesPacket(
  packet: MonitorPacket,
  options: PacketNotifyOptions = {}
): Promise<boolean> {
  const { includeContext = true, includeSections = false, preview = false } =
    options;

  try {
    const message = buildPacketNotification(packet, {
      includeContext,
      includeSections,
    });

    if (preview) {
      console.log("\n[Hermes Packet Notification Preview]");
      console.log(message);
      console.log("");
      return true;
    }

    const client = getTelegramClient();
    return await client.sendMessage(message);
  } catch (error) {
    console.error(
      "[Hermes Notifier] Error notifying packet:",
      error instanceof Error ? error.message : String(error)
    );
    return false;
  }
}

/**
 * Hermes 패킷을 Telegram 메시지로 포맷팅합니다.
 */
function buildPacketNotification(
  packet: MonitorPacket,
  options: {
    includeContext: boolean;
    includeSections: boolean;
  }
): string {
  const emoji = packetEmojis[packet.kind] || "📌";
  let message = `*${emoji} [Hermes] ${packet.kind}*\n\n`;
  message += `*${packet.title}*\n`;
  message += `${packet.description}\n`;

  // 실행 컨텍스트 포함
  if (options.includeContext && packet.content.metadata) {
    const ctx = packet.content.metadata;
    if (ctx.taskId) message += `\nTask: \`${ctx.taskId}\``;
    if (ctx.status) message += `\nStatus: ${ctx.status}`;
    if (ctx.riskLevel) message += `\nRisk: ${ctx.riskLevel}`;
  }

  // 패킷 섹션 포함 (첫 2개만)
  if (options.includeSections && packet.content.sections.length > 0) {
    message += "\n\n*Details:*\n";
    const sections = packet.content.sections.slice(0, 2);
    for (const section of sections) {
      message += `\n*${section.title}*\n`;
      // 너무 길면 자르기
      const body = section.body.length > 150 ? section.body.slice(0, 150) + "..." : section.body;
      message += `${body}\n`;
    }
  }

  message += `\nTime: ${new Date(packet.createdAt).toLocaleString("ko-KR")}`;

  return message.trim();
}

/**
 * 실행 결과 기반 패킷 알림 (편의 함수)
 */
export async function notifyExecutionResult(
  taskId: string,
  status: "success" | "failure" | "drift",
  summary: string,
  options?: PacketNotifyOptions
): Promise<boolean> {
  const client = getTelegramClient();
  const statusEmoji = {
    success: "✅",
    failure: "❌",
    drift: "⚠️",
  }[status];

  const message = `*${statusEmoji} [Execution Result]*\n\nTask: ${taskId}\n${summary}`;
  return await client.sendMessage(message);
}

/**
 * 승인 요청 패킷 알림
 */
export async function notifyApprovalRequired(
  taskId: string,
  reason: string,
  riskLevel: "low" | "medium" | "high"
): Promise<boolean> {
  const client = getTelegramClient();
  const riskEmoji = {
    low: "🟢",
    medium: "🟡",
    high: "🔴",
  }[riskLevel];

  const message = `*🔒 [Approval Required]*\n\n${riskEmoji} Risk: ${riskLevel.toUpperCase()}\nTask: ${taskId}\n\nReason:\n${reason}`;
  return await client.sendMessage(message);
}

/**
 * 콘솔 미리보기 (dry-run 모드용)
 */
export function previewPacketNotification(packet: MonitorPacket): void {
  const emoji = packetEmojis[packet.kind] || "📌";
  console.log(`\n${emoji} [Hermes Packet]`);
  console.log(`   Kind: ${packet.kind}`);
  console.log(`   Title: ${packet.title}`);
  console.log(`   Description: ${packet.description}`);
  if (packet.content.metadata?.taskId) {
    console.log(`   Task: ${packet.content.metadata.taskId}`);
  }
  if (packet.content.metadata?.status) {
    console.log(`   Status: ${packet.content.metadata.status}`);
  }
  console.log(`   Created: ${new Date(packet.createdAt).toLocaleString("ko-KR")}`);
}
