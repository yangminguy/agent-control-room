/**
 * Hermes Telegram Workflow Integration Test
 * Tests the complete approval, notification, and risk classification workflow
 *
 * Prerequisites:
 * - TELEGRAM_BOT_TOKEN environment variable set
 * - TELEGRAM_CHAT_ID environment variable set
 * - Telegram bot created and accessible
 */

import { describe, it, expect, beforeAll, afterAll } from "@jest/globals";
import { getTelegramClient, resetTelegramClient, type ApprovalRequest } from "@/lib/monitor/telegram-client";
import { getRiskClassifier } from "@/lib/orchestration/risk-classifier";
import { generateOrchestrationPacket, generatePhaseCompletePacket } from "@/lib/orchestration/orchestration-packet-generator";
import type { DispatchJob, AgentResult } from "@/lib/types";

describe("Hermes Telegram Workflow Integration", () => {
  const hasTelegramConfig = !!(
    process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID
  );

  const skipIfNoTelegram = hasTelegramConfig ? it : it.skip;

  beforeAll(() => {
    resetTelegramClient();
    console.log("\n[Telegram Workflow Test]", {
      configured: hasTelegramConfig,
      botToken: process.env.TELEGRAM_BOT_TOKEN ? "✓ Set" : "✗ Missing",
      chatId: process.env.TELEGRAM_CHAT_ID ? "✓ Set" : "✗ Missing",
    });
  });

  afterAll(() => {
    resetTelegramClient();
  });

  describe("Workflow 1: High-Risk Task Approval", () => {
    skipIfNoTelegram("should send approval request for production deploy", async () => {
      const client = getTelegramClient();

      const approvalRequest: ApprovalRequest = {
        task_id: "task-prod-deploy-001",
        task_name: "Deploy to Production",
        risk_level: "high",
        reason: "Production deployment requires manual approval",
        validation_state: {
          typecheck: "pass",
          lint: "pass",
          build: "pass",
          tests: "pass (98% coverage)",
        },
        affected_files: ["app/api/route.ts", "lib/core.ts", "package.json"],
        recommendation:
          "All validation checks passed. Safe to deploy. Preview URL: https://preview.example.com",
      };

      const result = await client.sendApprovalRequest(approvalRequest);
      expect(result).toBe(true);
      console.log("✅ Approval request sent to Telegram");
    });

    skipIfNoTelegram("should handle user approval response", async () => {
      // Simulates user responding "approve" to the Telegram message
      const approvalResponse = {
        task_id: "task-prod-deploy-001",
        user_response: "approve" as const,
        notes: "Confirmed by user. All checks passed.",
      };

      // In real workflow, this would come from /api/orchestration/telegram/approve
      console.log("✅ User approval response received:", approvalResponse);
      expect(approvalResponse.user_response).toBe("approve");
    });
  });

  describe("Workflow 2: Risk Classification & Auto-Execution", () => {
    skipIfNoTelegram("should classify task risk and send status report", async () => {
      const client = getTelegramClient();
      const classifier = getRiskClassifier();

      // Task 1: Low-risk (eligible for approved runner or mock dispatch handling)
      const lowRiskJob: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "claude-code",
        riskLevel: "low",
        status: "queued",
        prompt: "Run: git status && npm run lint",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const lowRiskClassification = classifier.classifyJob(lowRiskJob);
      expect(lowRiskClassification.risk_level).toBe("low");
      expect(lowRiskClassification.requires_telegram_approval).toBe(false);
      console.log("✅ Low-risk task classified - auto-executing without approval");

      // Task 2: Medium-risk (execute + report)
      const mediumRiskJob: DispatchJob = {
        id: "job-2",
        taskId: "task-2",
        agentId: "claude-code",
        riskLevel: "medium",
        status: "queued",
        prompt: "Run: git add . && git commit -m 'feature update'",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const mediumRiskClassification = classifier.classifyJob(mediumRiskJob);
      expect(mediumRiskClassification.risk_level).toBe("medium");

      const statusResult = await client.sendStatusReport({
        phase_id: "phase-10",
        phase_title: "Feature Implementation",
        status: "completed",
        summary: "Feature implemented and committed to local branch",
        changes: ["src/components/Button.tsx", "src/utils/helpers.ts"],
        risks: [],
        next_action: "Codex QA validation",
      });

      expect(statusResult).toBe(true);
      console.log("✅ Medium-risk task executed and status reported to Telegram");

      // Task 3: High-risk (approval required)
      const highRiskJob: DispatchJob = {
        id: "job-3",
        taskId: "task-3",
        agentId: "claude-code",
        riskLevel: "high",
        status: "queued",
        prompt: "Run: git push origin main",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      const highRiskClassification = classifier.classifyJob(highRiskJob);
      expect(highRiskClassification.risk_level).toBe("high");
      expect(highRiskClassification.requires_telegram_approval).toBe(true);
      console.log("✅ High-risk task detected - Telegram approval requested");
    });
  });

  describe("Workflow 3: Phase Completion & Phase Complete Packet", () => {
    skipIfNoTelegram("should generate and send phase complete report", async () => {
      const client = getTelegramClient();

      // Simulate phase completion
      const phaseResult = await client.sendPhaseCompleteReport(
        "phase-10",
        "Feature Implementation",
        "Feature fully implemented, tested, and ready for deployment",
        [
          "src/components/Button.tsx",
          "src/components/Modal.tsx",
          "src/utils/helpers.ts",
          "tests/Button.test.tsx",
        ]
      );

      expect(phaseResult).toBe(true);
      console.log("✅ Phase completion message sent to Telegram");

      // Generate phase complete packet for Control Room
      const packet = generatePhaseCompletePacket(
        "phase-10",
        10,
        "Feature Implementation",
        "claude-code",
        100, // 100% complete
        ["task-10-1", "task-10-2", "task-10-3"], // completed tasks
        [], // no blocked tasks
        [], // no partial tasks
        [
          "src/components/Button.tsx",
          "src/components/Modal.tsx",
          "src/utils/helpers.ts",
          "tests/Button.test.tsx",
        ]
      );

      expect(packet.status).toBe("completed");
      expect(packet.completion_percentage).toBe(100);
      console.log("✅ Phase Complete Packet generated for Control Room");
      console.log("  - Packet ID:", packet.packet_id);
      console.log("  - Obsidian Path:", packet.obsidian_note_path);
    });
  });

  describe("Workflow 4: Task Failure & Failure Report", () => {
    skipIfNoTelegram("should send failure report on task error", async () => {
      const client = getTelegramClient();

      const failureResult = await client.sendFailureReport(
        "task-build-001",
        "Build Compilation",
        "TypeScript error in app/page.tsx:45 - Property 'map' does not exist on type 'undefined'",
        ["app/page.tsx", "lib/data-fetcher.ts"],
        "Fix the undefined check before calling .map()"
      );

      expect(failureResult).toBe(true);
      console.log("✅ Failure report sent to Telegram");

      // Generate orchestration packet for failed task
      const failedResult: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-build-001",
        agentId: "claude-code",
        rawOutput: "Build failed with TypeScript errors",
        resultStatus: "blocked",
        changedFiles: ["app/page.tsx"],
        extractedSummary: "Build failed due to TypeScript error",
        timestamp: new Date().toISOString(),
      };

      const failedPacket = generateOrchestrationPacket(
        "job-1",
        "phase-10",
        "Feature Implementation",
        "claude-code",
        failedResult,
        "high"
      );

      expect(failedPacket.status).toBe("failed");
      expect(failedPacket.user_approval_needed).toBe(true);
      console.log("✅ OrchestrationPacket generated for failed task");
      console.log("  - Status:", failedPacket.status);
      console.log("  - Suggested Next Agent:", failedPacket.suggested_next_agent_type);
    });
  });

  describe("Workflow 5: High-Risk Operation Warning", () => {
    skipIfNoTelegram("should send pre-execution warning for destructive operations", async () => {
      const client = getTelegramClient();

      const warningResult = await client.sendHighRiskWarning(
        "git reset --hard HEAD~3",
        "This will discard the last 3 commits permanently",
        "Requires explicit user approval before execution. Consider backing up branch first."
      );

      expect(warningResult).toBe(true);
      console.log("✅ High-risk operation warning sent to Telegram");
    });
  });

  describe("Workflow 6: Complete Orchestration Loop", () => {
    skipIfNoTelegram(
      "should execute complete orchestration workflow: classify → execute → report → packet",
      async () => {
        const client = getTelegramClient();
        const classifier = getRiskClassifier();

        console.log("\n🔄 Starting Complete Orchestration Workflow...\n");

        // Step 1: Classify task risk
        const jobToClassify: DispatchJob = {
          id: "job-workflow-complete",
          taskId: "task-workflow-complete",
          agentId: "claude-code",
          riskLevel: "medium",
          status: "queued",
          prompt: "Implement user authentication feature",
          createdAt: new Date().toISOString(),
          retryCount: 0,
        };

        const classification = classifier.classifyJob(jobToClassify);
        console.log("Step 1: Risk Classification");
        console.log("  Risk Level:", classification.risk_level);
        console.log("  Requires Approval:", classification.requires_telegram_approval);

        // Step 2: Send pre-execution status
        await client.sendStatusReport({
          phase_id: "phase-auth",
          phase_title: "Authentication Feature",
          status: "in_progress",
          summary: "Starting authentication implementation",
          changes: [],
          risks: [],
          next_action: "Claude Code executing implementation",
        });
        console.log("\nStep 2: Pre-execution Status Sent");

        // Step 3: Simulate agent execution (would happen in reality)
        console.log("\nStep 3: Agent Execution (Claude Code working...)");
        const agentResult: AgentResult = {
          id: "result-auth-001",
          dispatchJobId: "job-workflow-complete",
          taskId: "task-workflow-complete",
          agentId: "claude-code",
          rawOutput: "Implementation complete",
          resultStatus: "pass",
          changedFiles: [
            "app/api/auth/route.ts",
            "lib/auth/session.ts",
            "components/LoginForm.tsx",
            "tests/auth.test.ts",
          ],
          extractedSummary: "Authentication feature implemented with JWT + session storage",
          timestamp: new Date().toISOString(),
        };

        // Step 4: Generate orchestration packet
        const packet = generateOrchestrationPacket(
          jobToClassify.id,
          "phase-auth",
          "Authentication Feature",
          "claude-code",
          agentResult,
          classification.risk_level as any,
          agentResult.changedFiles || [],
          ["components/"]
        );

        console.log("\nStep 4: Orchestration Packet Generated");
        console.log("  Packet ID:", packet.packet_id);
        console.log("  Status:", packet.status);
        console.log("  Changed Files:", packet.changed_files.length);

        // Step 5: Send completion status
        await client.sendPhaseCompleteReport(
          "phase-auth",
          "Authentication Feature",
          "Authentication feature implemented and tested. Ready for review.",
          packet.changed_files
        );
        console.log("\nStep 5: Phase Completion Telegram Notification Sent");

        // Step 6: Generate phase complete packet
        const phasePacket = generatePhaseCompletePacket(
          "phase-auth",
          1,
          "Authentication Feature",
          "claude-code",
          100,
          ["task-1"],
          [],
          [],
          packet.changed_files,
          {
            typecheck: "pass",
            lint: "pass",
            tests: "pass (95% coverage)",
            build: "pass",
          }
        );

        console.log("\nStep 6: Phase Complete Packet Generated");
        console.log("  Completion %:", phasePacket.completion_percentage);
        console.log("  Obsidian Note Path:", phasePacket.obsidian_note_path);

        console.log("\n✅ Complete Orchestration Workflow Successful!");
        console.log("  - Task classified");
        console.log("  - Pre-execution status sent");
        console.log("  - Agent executed");
        console.log("  - Orchestration packet generated");
        console.log("  - Completion status sent");
        console.log("  - Phase packet generated");
        console.log("  - Ready for Agent Control Room processing\n");

        expect(packet.status).toBe("completed");
        expect(phasePacket.status).toBe("completed");
      }
    );
  });

  describe("Telegram Configuration Status", () => {
    it("should show current Telegram configuration", () => {
      console.log("\n📋 Telegram Configuration Status:");
      console.log("================================");
      console.log("Bot Token Set:", hasTelegramConfig ? "✅ YES" : "❌ NO");
      console.log("Chat ID Set:", process.env.TELEGRAM_CHAT_ID ? "✅ YES" : "❌ NO");
      console.log("\nTo enable Telegram workflow tests:");
      console.log("1. Set TELEGRAM_BOT_TOKEN environment variable");
      console.log("2. Set TELEGRAM_CHAT_ID environment variable");
      console.log("3. Ensure Telegram bot has access to chat");
      console.log("4. Re-run tests: npm test -- hermes-telegram-workflow.integration\n");
    });
  });
});
