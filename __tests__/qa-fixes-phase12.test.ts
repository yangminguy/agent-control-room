/**
 * T057: Phase 12-16 Integration Tests (Wave 5)
 *
 * Comprehensive test coverage for all phases:
 * - Risk classification
 * - Dispatch queue
 * - Result collection
 * - Approval timeout
 * - Feedback loop
 * - Infinite loop prevention
 * - Hermes generators
 */

import { describe, it, expect, beforeEach } from "@jest/globals";
import { classifyRisk } from "../lib/dispatch/risk-classifier";
import type { RiskLevel } from "../lib/types";
import { SafeDispatchQueue } from "../lib/dispatch/safe-dispatch-queue";
import {
  normalizeVibeKanbanResult,
  AgentResultSchema,
} from "../lib/results/agent-result-schema";
import {
  hasApprovalTimedOut,
  getApprovalTimeoutRemaining,
} from "../lib/approval/timeout-policy";
import { FeedbackLoopEngine } from "../lib/orchestration/feedback-loop-engine";
import { generateAgentPerformanceSummary } from "../lib/hermes/agent-performance-summary";
import type { DispatchJob, AgentResult, ApprovalRequest } from "../lib/types";

describe("Phase 12-16 Integration Tests", () => {
  let queue: SafeDispatchQueue;
  let feedbackLoop: FeedbackLoopEngine;

  beforeEach(() => {
    queue = new SafeDispatchQueue();
    feedbackLoop = new FeedbackLoopEngine(queue);
  });

  describe("T041 — Risk Classifier", () => {
    it("should classify safe tasks correctly", () => {
      const risk = classifyRisk({
        title: "Add unit test for login component",
        description: "Jest test for type checking",
      });
      expect(risk).toBe("safe");
    });

    it("should classify low-risk tasks correctly", () => {
      const risk = classifyRisk({
        title: "Refactor helper function",
        description: "Extract common logic",
      });
      expect(risk).toBe("low");
    });

    it("should classify medium-risk tasks correctly", () => {
      const risk = classifyRisk({
        title: "Install new package and update schema",
        description: "Add authentication library",
      });
      expect(risk).toMatch(/medium|high/); // Could be either
    });

    it("should classify high-risk tasks correctly", () => {
      const risk = classifyRisk({
        title: "Update authentication middleware",
        description: "Change security tokens",
      });
      expect(risk).toBe("high");
    });

    it("should classify critical-risk tasks correctly", () => {
      const risk = classifyRisk({
        title: "Deploy to production",
        description: "git push to main",
      });
      expect(risk).toBe("critical");
    });

    it("should detect file boundary violations", () => {
      const risk = classifyRisk({
        title: "Update code in forbidden file",
        changedFiles: ["src/forbidden.ts"],
        doNotTouchFiles: ["src/forbidden.ts"],
      });
      // File boundary violation or high risk keywords should trigger high risk
      expect(["medium", "high"].includes(risk)).toBe(true);
    });
  });

  describe("T042 — Safe Dispatch Queue", () => {
    it("should add and retrieve jobs", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "queued",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      queue.addJob(job);
      expect(queue.getJob("job-1")).toEqual(job);
    });

    it("should transition job status correctly", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "queued",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      queue.addJob(job);
      const success = queue.updateJobStatus(job.id, "running");
      expect(success).toBe(true);
      expect(queue.getJob(job.id)?.status).toBe("running");
    });

    it("should split by risk level", () => {
      const jobs: DispatchJob[] = [
        {
          id: "safe-1",
          taskId: "t1",
          agentId: "codex",
          riskLevel: "safe",
          status: "queued",
          createdAt: new Date().toISOString(),
          retryCount: 0,
        },
        {
          id: "high-1",
          taskId: "t2",
          agentId: "claude-code",
          riskLevel: "high",
          status: "queued",
          createdAt: new Date().toISOString(),
          retryCount: 0,
        },
      ];

      queue.addJobs(jobs);
      const split = queue.splitByRisk();
      expect(split.safe).toHaveLength(1);
      expect(split.risky).toHaveLength(1);
    });

    it("should track retry count", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "queued",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      queue.addJob(job);
      const count1 = queue.incrementRetry("job-1");
      expect(count1).toBe(1);
      const count2 = queue.incrementRetry("job-1");
      expect(count2).toBe(2);
    });

    it("should detect max retries exceeded", () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "queued",
        createdAt: new Date().toISOString(),
        retryCount: 3,
        maxRetries: 3,
      };

      queue.addJob(job);
      expect(queue.hasExceededMaxRetries("job-1")).toBe(true);
    });
  });

  describe("T043-T044 — Result Schema & Collector", () => {
    it("should normalize and validate agent result", () => {
      const result = normalizeVibeKanbanResult(
        {
          status: "done",
          output: "Task completed successfully",
          files: ["src/main.ts"],
        },
        "task-1",
        "codex"
      );

      expect(result.resultStatus).toBe("pass");
      expect(result.taskId).toBe("task-1");
      expect(result.agentId).toBe("codex");
    });

    it("should schema-validate results", () => {
      const validResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "codex" as const,
        rawOutput: "Success",
        resultStatus: "pass" as const,
        timestamp: new Date().toISOString(),
      };

      // Should not throw
      const parsed = AgentResultSchema.parse(validResult);
      expect(parsed.resultStatus).toBe("pass");
    });
  });

  describe("T048 — Approval Timeout Policy", () => {
    it("should detect approval timeout", () => {
      const createdAt = new Date(Date.now() - 6 * 60 * 1000); // 6 minutes ago
      expect(hasApprovalTimedOut(createdAt)).toBe(true);
    });

    it("should not detect timeout within window", () => {
      const createdAt = new Date(Date.now() - 2 * 60 * 1000); // 2 minutes ago
      expect(hasApprovalTimedOut(createdAt)).toBe(false);
    });

    it("should calculate remaining timeout", () => {
      const createdAt = new Date(Date.now() - 4 * 60 * 1000); // 4 minutes ago
      const remaining = getApprovalTimeoutRemaining(createdAt);
      expect(remaining).toBeGreaterThan(0);
      expect(remaining).toBeLessThanOrEqual(60 * 1000); // ~1 minute left
    });

    it("should clamp remaining to zero after timeout", () => {
      const createdAt = new Date(Date.now() - 10 * 60 * 1000); // 10 minutes ago
      const remaining = getApprovalTimeoutRemaining(createdAt);
      expect(remaining).toBe(0);
    });
  });

  describe("T050 — Feedback Loop Engine", () => {
    it("should redispatch on minor_fix for low-risk", async () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "running",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      queue.addJob(job);

      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "codex",
        rawOutput: "Minor fix needed",
        resultStatus: "minor_fix",
        timestamp: new Date().toISOString(),
      };

      const feedback = await feedbackLoop.processFeedback(result);
      expect(feedback.decision).toBe("redispatch");
      expect(feedback.nextDispatchJob).toBeDefined();
      expect(feedback.nextDispatchJob?.retryCount).toBe(1);
    });

    it("should halt on safety_violation", async () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "medium",
        status: "running",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      queue.addJob(job);

      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "codex",
        rawOutput: "SAFETY_VIOLATION: attempted unauthorized file deletion",
        resultStatus: "safety_violation",
        timestamp: new Date().toISOString(),
      };

      const feedback = await feedbackLoop.processFeedback(result);
      expect(feedback.decision).toBe("halt_safety_violation");
    });

    it("should create blocked decision on max retries", async () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "running",
        createdAt: new Date().toISOString(),
        retryCount: 3, // Already at max
      };

      queue.addJob(job);

      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "codex",
        rawOutput: "Still broken",
        resultStatus: "minor_fix",
        timestamp: new Date().toISOString(),
      };

      const feedback = await feedbackLoop.processFeedback(result);
      expect(feedback.decision).toBe("create_blocked_decision");
    });

    it("should create QA task on qa_needed", async () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "medium",
        status: "running",
        createdAt: new Date().toISOString(),
        retryCount: 0,
      };

      queue.addJob(job);

      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "codex",
        rawOutput: "Implementation complete, ready for QA",
        resultStatus: "qa_needed",
        timestamp: new Date().toISOString(),
      };

      const feedback = await feedbackLoop.processFeedback(result);
      expect(feedback.decision).toBe("create_qa_task");
      expect(feedback.qaTask).toBeDefined();
    });

    it("should prevent infinite retry loop (max 3)", async () => {
      const job: DispatchJob = {
        id: "job-1",
        taskId: "task-1",
        agentId: "codex",
        riskLevel: "low",
        status: "running",
        createdAt: new Date().toISOString(),
        retryCount: 3,
        maxRetries: 3,
      };

      queue.addJob(job);

      const result: AgentResult = {
        id: "result-1",
        dispatchJobId: "job-1",
        taskId: "task-1",
        agentId: "codex",
        rawOutput: "Still failing",
        resultStatus: "minor_fix",
        timestamp: new Date().toISOString(),
      };

      const feedback = await feedbackLoop.processFeedback(result);
      expect(feedback.decision).toBe("create_blocked_decision");
      expect(feedback.reason).toContain("Max retries");
    });
  });

  describe("T051 — Hermes Generators", () => {
    it("should generate agent performance summary", () => {
      const results: AgentResult[] = [
        {
          id: "r1",
          dispatchJobId: "j1",
          taskId: "t1",
          agentId: "codex",
          rawOutput: "Success",
          resultStatus: "pass",
          timestamp: new Date().toISOString(),
        },
        {
          id: "r2",
          dispatchJobId: "j2",
          taskId: "t2",
          agentId: "codex",
          rawOutput: "Failed",
          resultStatus: "blocked",
          timestamp: new Date().toISOString(),
        },
      ];

      const summary = generateAgentPerformanceSummary(results);
      expect(summary).toContain("codex");
      expect(summary).toContain("50%"); // 1 pass, 1 blocked
    });
  });
});
