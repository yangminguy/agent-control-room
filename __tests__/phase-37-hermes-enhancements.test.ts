/**
 * Phase 37-39: Hermes Enhancements
 * - Telegram Client
 * - OrchestrationPacket
 * - Risk Classification
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import {
  TelegramClient,
  initTelegramClient,
  getTelegramClient,
  resetTelegramClient,
  type ApprovalRequest,
} from "@/lib/monitor/telegram-client";
import { RiskClassifier } from "@/lib/orchestration/risk-classifier";
import {
  generateOrchestrationPacket,
  generatePhaseCompletePacket,
  renderOrchestrationPacketMarkdown,
  renderPhaseCompletePacketMarkdown,
} from "@/lib/orchestration/orchestration-packet-generator";
import type { DispatchJob, AgentResult } from "@/lib/types";

describe("Phase 37-39: Hermes Enhancements", () => {
  describe("Telegram Client", () => {
    let client: TelegramClient;

    beforeEach(() => {
      resetTelegramClient();
      // Use mock token/chat ID that won't actually try to call Telegram API
      client = new TelegramClient("", "");
    });

    it("should initialize Telegram client", () => {
      expect(client).toBeDefined();
    });

    it("should handle approval request (mock mode)", async () => {
      const request: ApprovalRequest = {
        task_id: "task-001",
        task_name: "Deploy to production",
        risk_level: "high",
        reason: "This is a production deployment",
        validation_state: {
          typecheck: "pass",
          tests: "pass",
        },
        affected_files: ["app/api/route.ts", "lib/core.ts"],
        recommendation: "All checks passed, safe to deploy",
      };

      // When token is not set, sendApprovalRequest logs instead of calling API
      const result = await client.sendApprovalRequest(request);
      // In mock mode (no token), returns true (logged successfully)
      expect(result).toBe(true);
    });

    it("should handle status report (mock mode)", async () => {
      const result = await client.sendStatusReport({
        phase_id: "phase-10",
        phase_title: "UI Integration",
        status: "completed",
        summary: "Phase completed successfully",
        changes: ["components/ui/Button.tsx", "lib/utils.ts"],
        risks: [],
        next_action: "Move to Phase 11",
      });

      expect(result).toBe(true);
    });

    it("should create approval request message format", async () => {
      const request: ApprovalRequest = {
        task_id: "task-001",
        task_name: "Database Migration",
        risk_level: "high",
        reason: "Schema update required",
      };

      const result = await client.sendApprovalRequest(request);
      expect(result).toBe(true);
    });

    it("should create phase complete report message", async () => {
      const result = await client.sendPhaseCompleteReport(
        "phase-10",
        "UI Integration",
        "All acceptance criteria met",
        ["components/ui/Button.tsx", "lib/utils.ts"]
      );

      expect(result).toBe(true);
    });

    it("should create failure report message", async () => {
      const result = await client.sendFailureReport(
        "task-001",
        "Build compilation",
        "TypeScript compilation error",
        ["app/page.tsx"],
        "Fix TypeScript errors and retry"
      );

      expect(result).toBe(true);
    });

    it("should create high risk warning message", async () => {
      const result = await client.sendHighRiskWarning(
        "git push origin main",
        "Pushing to main branch",
        "Requires manual approval"
      );

      expect(result).toBe(true);
    });

    it("should use singleton pattern for client", () => {
      const client1 = getTelegramClient();
      const client2 = getTelegramClient();
      expect(client1).toBe(client2);
    });
  });

  describe("Risk Classifier", () => {
    let classifier: RiskClassifier;

    beforeEach(() => {
      classifier = new RiskClassifier();
    });

    it("should classify high-risk git operations", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        riskLevel: "medium",
        status: "queued",
        prompt: "Run: git push origin main",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const result = classifier.classifyJob(job);

      expect(result.risk_level).toBe("high");
      expect(result.requires_telegram_approval).toBe(true);
    });

    it("should classify medium-risk local operations", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        riskLevel: "low",
        status: "queued",
        prompt: "Run: git add . && git commit -m 'update'",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const result = classifier.classifyJob(job);

      expect(result.risk_level).toBe("medium");
      expect(result.requires_telegram_approval).toBe(false);
    });

    it("should classify low-risk read-only operations", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        riskLevel: "safe",
        status: "queued",
        prompt: "Run: git status && git log --oneline -n 5",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const result = classifier.classifyJob(job);

      expect(result.risk_level).toBe("low");
      expect(result.requires_telegram_approval).toBe(false);
    });

    it("should detect package.json as high conflict risk", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "medium",
        status: "queued",
        prompt: "Modify package.json to add dependencies",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const result = classifier.classifyJob(job);

      expect(result.conflict_risk).toBe("high");
      expect(result.requires_user_approval).toBe(true);
    });

    it("should register file owners and detect conflicts", () => {
      classifier.registerFileOwner("app/page.tsx", "claude-code");
      classifier.registerFileOwner("app/page.tsx", "antigravity");

      const hasConflict = classifier.detectFileConflict(
        "app/page.tsx",
        "claude-code",
        ["antigravity"]
      );

      expect(hasConflict).toBe(true);
    });

    it("should not detect conflict when same agent is active", () => {
      classifier.registerFileOwner("app/page.tsx", "claude-code");

      const hasConflict = classifier.detectFileConflict(
        "app/page.tsx",
        "claude-code",
        ["claude-code"]
      );

      expect(hasConflict).toBe(false);
    });
  });

  describe("OrchestrationPacket Generation", () => {
    it("should generate orchestration packet with completed status", () => {
      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        rawOutput: "Task completed",
        resultStatus: "pass",
        changedFiles: ["app/page.tsx"],
        extractedSummary: "Implementation complete",
        timestamp: new Date().toISOString(),
      };

      const packet = generateOrchestrationPacket(
        "job-1",
        "phase-10",
        "UI Integration",
        "claude-code",
        result,
        "low",
        ["app/page.tsx"],
        ["components/ui/"]
      );

      expect(packet.packet_type).toBe("orchestration_packet");
      expect(packet.status).toBe("completed");
      expect(packet.source).toBe("hermes");
      expect(packet.phase_id).toBe("phase-10");
    });

    it("should generate orchestration packet with failed status", () => {
      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        rawOutput: "Error occurred",
        resultStatus: "blocked",
        timestamp: new Date().toISOString(),
      };

      const packet = generateOrchestrationPacket(
        "job-1",
        "phase-10",
        "UI Integration",
        "claude-code",
        result,
        "high"
      );

      expect(packet.status).toBe("failed");
      expect(packet.failure_summary).toBe("작업이 차단되었습니다");
      expect(packet.user_approval_needed).toBe(true);
    });

    it("should include do-not-touch files in packet", () => {
      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        rawOutput: "Done",
        resultStatus: "pass",
        timestamp: new Date().toISOString(),
      };

      const packet = generateOrchestrationPacket(
        "job-1",
        "phase-10",
        "UI Integration",
        "claude-code",
        result,
        "low"
      );

      expect(packet.do_not_touch_files).toContain("runner/");
      expect(packet.do_not_touch_files).toContain("package.json");
      expect(packet.do_not_touch_files).toContain("auth/");
    });
  });

  describe("PhaseCompletePacket Generation", () => {
    it("should generate phase complete packet", () => {
      const packet = generatePhaseCompletePacket(
        "phase-10",
        10,
        "UI Integration",
        "claude-code",
        100,
        ["task-1", "task-2", "task-3"],
        [],
        [],
        ["app/page.tsx", "components/ui/Button.tsx"]
      );

      expect(packet.packet_type).toBe("phase_complete_packet");
      expect(packet.status).toBe("completed");
      expect(packet.completion_percentage).toBe(100);
      expect(packet.phase_number).toBe(10);
      expect(packet.completed_tasks.length).toBe(3);
    });

    it("should generate partial phase packet", () => {
      const packet = generatePhaseCompletePacket(
        "phase-10",
        10,
        "UI Integration",
        "claude-code",
        75,
        ["task-1", "task-2"],
        ["task-3"],
        []
      );

      expect(packet.status).toBe("partial");
      expect(packet.blocked_tasks?.length).toBe(1);
    });

    it("should generate markdown for orchestration packet", () => {
      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        rawOutput: "Done",
        resultStatus: "pass",
        extractedSummary: "Implementation complete",
        timestamp: new Date().toISOString(),
      };

      const packet = generateOrchestrationPacket(
        "job-1",
        "phase-10",
        "UI Integration",
        "claude-code",
        result,
        "low",
        ["app/page.tsx"]
      );

      const markdown = renderOrchestrationPacketMarkdown(packet);

      expect(markdown).toContain("Orchestration Packet");
      expect(markdown).toContain("phase-10");
      expect(markdown).toContain("COMPLETED");
    });

    it("should generate markdown for phase complete packet", () => {
      const packet = generatePhaseCompletePacket(
        "phase-10",
        10,
        "UI Integration",
        "claude-code",
        100,
        ["task-1", "task-2"],
        [],
        [],
        ["app/page.tsx"]
      );

      const markdown = renderPhaseCompletePacketMarkdown(packet);

      expect(markdown).toContain("Phase 10");
      expect(markdown).toContain("UI Integration");
      expect(markdown).toContain("100%");
    });
  });
});
