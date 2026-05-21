// ─── Result type ──────────────────────────────────────────────────────────────

export type DiscordSendResult = {
  success: boolean;
  reason: string;
  messageId?: string;
};

// ─── DiscordAdapter ───────────────────────────────────────────────────────────

/**
 * Adapter for Discord message delivery.
 *
 * This implementation is intentionally mock-only:
 * - If DISCORD_WEBHOOK_URL is absent or empty, logs locally and returns failure.
 * - If DISCORD_WEBHOOK_URL is configured, prepares the message but does NOT
 *   call fetch() or send to Discord. Returns mock success for testing.
 *
 * No real Discord network calls are made in any environment.
 */
export class DiscordAdapter {
  /**
   * Send (or simulate sending) an approval message to Discord.
   *
   * @param message           - The formatted approval message string
   * @param approvalRequestId - The associated ApprovalRequest ID for traceability
   */
  async sendApprovalMessage(
    message: string,
    approvalRequestId: string,
  ): Promise<DiscordSendResult> {
    try {
      const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

      if (!webhookUrl || webhookUrl.trim() === "") {
        console.log(
          `[DiscordAdapter] No webhook URL configured. Logging message locally.\n` +
          `[ApprovalRequest: ${approvalRequestId}]\n${message}`,
        );
        return { success: false, reason: "no_webhook_url" };
      }

      // Webhook URL is present — prepare message but do NOT send (mock mode).
      const mockMessageId = `mock-${Date.now()}-${approvalRequestId.slice(-6)}`;
      console.log(
        `[DiscordAdapter] Webhook URL found. Message prepared (mock mode — not sent).\n` +
        `[ApprovalRequest: ${approvalRequestId}] [MockMessageId: ${mockMessageId}]`,
      );

      return {
        success: true,
        reason: "message_prepared",
        messageId: mockMessageId,
      };
    } catch (err) {
      const message_ = err instanceof Error ? err.message : String(err);
      return { success: false, reason: `error: ${message_}` };
    }
  }
}
