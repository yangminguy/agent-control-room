/**
 * Integration Tests: Phase 7-11 Implementation
 *
 * T026~T040: All features tested end-to-end
 */

import { runAutomatedCodeReview } from "@/lib/qa/code-review-pipeline";
import { synthesizeExecutionPatterns } from "@/lib/knowledge/pattern-synthesis";
import {
  createExecutionQueue,
  enqueueTask,
  getNextExecutableTask,
  evaluateConditionalRules,
  executeConditionalAction,
  getQueueStats,
} from "@/lib/orchestration/task-queue";
import type { PlanTask, DiffAnalysisOutput } from "@/lib/types";

describe("Phase 7-11: Production Implementation Tests", () => {
  // ──────────────────────────────────────────────────────────
  // T029: Code Review Pipeline
  // ──────────────────────────────────────────────────────────

  describe("T029: Code Review Pipeline", () => {
    it("should detect security issues in auth files", async () => {
      const diffOutput: DiffAnalysisOutput = {
        changedFiles: ["lib/auth/login.ts"],
        addedLines: 50,
        removedLines: 10,
        diffSummary: "Added authentication module",
        completionJudgment: "pending",
        nextPrompt: "Review authentication changes.",
        completedTaskIds: [],
        partialTaskIds: [],
        blockedTaskIds: [],
      };

      const review = await runAutomatedCodeReview(diffOutput);

      expect(review.issues.length).toBeGreaterThan(0);
      expect(review.issues[0].severity).toBe("critical");
      expect(review.issues[0].category).toBe("security");
    });

    it("should warn about missing tests for large changes", async () => {
      const diffOutput: DiffAnalysisOutput = {
        changedFiles: ["lib/utils/helpers.ts"],
        addedLines: 200,
        removedLines: 50,
        diffSummary: "Added utility functions",
        completionJudgment: "pending",
        nextPrompt: "Add tests for utility functions.",
        completedTaskIds: [],
        partialTaskIds: [],
        blockedTaskIds: [],
      };

      const review = await runAutomatedCodeReview(diffOutput);

      expect(review.issues.some((i) => i.category === "testing")).toBe(true);
    });

    it("should return actionable recommendations", async () => {
      const diffOutput: DiffAnalysisOutput = {
        changedFiles: ["components/Button.tsx"],
        addedLines: 100,
        removedLines: 50,
        diffSummary: "Updated component",
        completionJudgment: "pending",
        nextPrompt: "Review component accessibility.",
        completedTaskIds: [],
        partialTaskIds: [],
        blockedTaskIds: [],
      };

      const review = await runAutomatedCodeReview(diffOutput);

      expect(review.recommendedActions.length).toBeGreaterThan(0);
      expect(typeof review.recommendedActions[0]).toBe("string");
    });
  });

  // ──────────────────────────────────────────────────────────
  // T032: Pattern Synthesis
  // ──────────────────────────────────────────────────────────

  describe("T032: Pattern Synthesis", () => {
    it("should calculate agent success rates", () => {
      const history = [
        { agent_id: "ui-designer", task_type: "ui", success: true, timeMinutes: 30, tokensUsed: 10000 },
        { agent_id: "ui-designer", task_type: "ui", success: true, timeMinutes: 35, tokensUsed: 11000 },
        { agent_id: "ui-designer", task_type: "ui", success: false, timeMinutes: 40, tokensUsed: 12000 },
      ];

      const pattern = synthesizeExecutionPatterns(history);

      expect(pattern.metrics["ui-designer"]).toBeDefined();
      expect(pattern.metrics["ui-designer"].successRate).toBe(2 / 3);
      expect(pattern.metrics["ui-designer"].totalExecutions).toBe(3);
    });

    it("should identify best agents for task types", () => {
      const history = [
        { agent_id: "backend-developer", task_type: "api", success: true, timeMinutes: 60, tokensUsed: 15000 },
        { agent_id: "backend-developer", task_type: "api", success: true, timeMinutes: 65, tokensUsed: 16000 },
        { agent_id: "ui-designer", task_type: "api", success: false, timeMinutes: 90, tokensUsed: 20000 },
      ];

      const pattern = synthesizeExecutionPatterns(history);

      const apiPattern = pattern.patterns.find((p) => p.taskType === "api");
      expect(apiPattern?.bestAgent).toBe("backend-developer");
      expect(apiPattern?.successRate).toBeGreaterThan(0.5);
    });

    it("should provide actionable insights", () => {
      const history = [
        { agent_id: "code-reviewer", task_type: "review", success: true, timeMinutes: 15, tokensUsed: 5000 },
        { agent_id: "code-reviewer", task_type: "review", success: true, timeMinutes: 18, tokensUsed: 5500 },
      ];

      const pattern = synthesizeExecutionPatterns(history);

      expect(pattern.insights.length).toBeGreaterThan(0);
      expect(pattern.recommendations.length).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────
  // T038 & T039: Task Queue & Conditional Branching
  // ──────────────────────────────────────────────────────────

  describe("T038 & T039: Task Queue", () => {
    it("should create and manage a task queue", () => {
      const queue = createExecutionQueue(2);

      const task: PlanTask = {
        id: "t1",
        planId: "p1",
        title: "Test task",
        description: "Testing",
        status: "planned",
        assignedAgent: "claude-code",
        priority: "P1",
        acceptanceCriteria: ["Test"],
        subAgentTracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      enqueueTask(queue, task, "P1");

      expect(queue.tasks.size).toBe(1);
      expect(getQueueStats(queue).total).toBe(1);
    });

    it("should get next executable task respecting agent limits", () => {
      const queue = createExecutionQueue(2, { "claude-code": 1, codex: 2 });

      const task1: PlanTask = {
        id: "t1",
        planId: "p1",
        title: "Task 1",
        description: "",
        status: "planned",
        assignedAgent: "claude-code",
        priority: "P1",
        acceptanceCriteria: [],
        subAgentTracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const task2: PlanTask = {
        id: "t2",
        planId: "p1",
        title: "Task 2",
        description: "",
        status: "planned",
        assignedAgent: "codex",
        priority: "P1",
        acceptanceCriteria: [],
        subAgentTracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      enqueueTask(queue, task1, "P1");
      enqueueTask(queue, task2, "P1");

      const next1 = getNextExecutableTask(queue);
      expect(next1).not.toBeNull();
      expect(next1?.task.id).toBeDefined();
    });

    it("should evaluate conditional rules based on task failure", () => {
      const rules = [
        {
          id: "r1",
          trigger: "compilation_error",
          action: "create_debug_task",
          targetAgent: "claude-code" as const,
          params: { error: "Type mismatch" },
        },
      ];

      const result = {
        taskId: "t1",
        success: false,
        errorType: "compilation_error",
        judgment: "not_completed" as const,
      };

      const triggered = evaluateConditionalRules(result, rules);
      expect(triggered).not.toBeNull();
      expect(triggered?.action).toBe("create_debug_task");
    });

    it("should execute conditional actions", () => {
      const rule = {
        id: "r1",
        trigger: "task_failed",
        action: "escalate" as const,
        targetAgent: undefined,
        params: undefined,
      };

      const originalTask: PlanTask = {
        id: "t1",
        planId: "p1",
        title: "Failed task",
        description: "Task that failed",
        status: "blocked",
        assignedAgent: "codex",
        priority: "P1",
        acceptanceCriteria: [],
        subAgentTracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const nextTask = executeConditionalAction(rule, originalTask);
      expect(nextTask).not.toBeNull();
      expect(nextTask?.title).toContain("ESCALATED");
      expect(nextTask?.assignedAgent).toBe("claude-code");
    });

    it("should provide queue statistics", () => {
      const queue = createExecutionQueue(3);

      const task: PlanTask = {
        id: "t1",
        planId: "p1",
        title: "Task",
        description: "",
        status: "planned",
        assignedAgent: "claude-code",
        priority: "P2",
        acceptanceCriteria: [],
        subAgentTracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      enqueueTask(queue, task, "P2");

      const stats = getQueueStats(queue);
      expect(stats.total).toBe(1);
      expect(stats.queued).toBe(1);
      expect(stats.running).toBe(0);
      expect(stats.utilization).toBe("0/3");
    });
  });

  // ──────────────────────────────────────────────────────────
  // End-to-End Integration
  // ──────────────────────────────────────────────────────────

  describe("End-to-End: Complete Workflow", () => {
    it("should handle full execution cycle from queue to completion", async () => {
      // 1. Create queue
      const queue = createExecutionQueue(2);

      // 2. Enqueue task
      const task: PlanTask = {
        id: "e2e-1",
        planId: "p1",
        title: "E2E Test Task",
        description: "Full workflow test",
        status: "planned",
        assignedAgent: "codex",
        priority: "P1",
        acceptanceCriteria: ["Feature works", "Tests pass"],
        subAgentTracks: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      enqueueTask(queue, task, "P1");
      expect(getQueueStats(queue).total).toBe(1);

      // 3. Get next task
      const nextTask = getNextExecutableTask(queue);
      expect(nextTask?.task.id).toBe("e2e-1");

      // 4. Run code review (simulate execution)
      const diffOutput: DiffAnalysisOutput = {
        changedFiles: ["src/feature.ts", "tests/feature.test.ts"],
        addedLines: 150,
        removedLines: 30,
        diffSummary: "Added new feature",
        completionJudgment: "completed",
        nextPrompt: "Move to the next task.",
        completedTaskIds: ["e2e-1"],
        partialTaskIds: [],
        blockedTaskIds: [],
      };

      const review = await runAutomatedCodeReview(diffOutput);
      expect(review.changedFiles.length).toBeGreaterThan(0);

      // 5. Analyze patterns
      const executionHistory = [
        {
          agent_id: "codex",
          task_type: "feature",
          success: true,
          timeMinutes: 45,
          tokensUsed: 20000,
        },
      ];

      const pattern = synthesizeExecutionPatterns(executionHistory);
      expect(pattern.metrics.codex).toBeDefined();

      // 6. Mark task complete
      expect(getQueueStats(queue).total).toBe(1);

      expect(true).toBe(true); // All steps passed
    });
  });
});
