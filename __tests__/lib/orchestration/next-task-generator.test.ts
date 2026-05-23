/**
 * Tests for next-task-generator.ts
 * Verifies decision-to-task mapping logic
 */

import { generateNextTaskRecommendation } from "@/lib/orchestration/next-task-generator";
import type {
  ExecutionResultSummary,
  DecisionClassification,
  PlanTask,
} from "@/lib/types";

describe("generateNextTaskRecommendation", () => {
  const mockTask: PlanTask = {
    id: "task-1",
    planId: "plan-1",
    title: "Implement feature X",
    description: "Implement feature X",
    status: "running",
    assignedAgent: "claude-code",
    priority: "P0",
    acceptanceCriteria: ["Feature works"],
    subAgentTracks: [],
    createdAt: "2026-05-23T00:00:00Z",
    updatedAt: "2026-05-23T00:00:00Z",
  };

  const baseExecutionResult: ExecutionResultSummary = {
    planId: "plan-1",
    taskId: "task-1",
    assignedAgent: "claude-code",
    status: "done",
    logSummary: "Execution completed",
    changedFiles: ["src/feature.ts"],
    checksRun: {
      typecheck: "passed",
      lint: "passed",
      test: "passed",
      build: "passed",
    },
    recommendedNextAction: "continue",
  };

  it("should generate pass task when decision is pass", () => {
    const decision: DecisionClassification = {
      decision: "pass",
      reason: "All checks passed",
      confidence: 100,
      nextAction: "proceed_to_next_task",
    };

    const result = generateNextTaskRecommendation(baseExecutionResult, decision, mockTask, "plan-1");

    expect(result.title).toContain("다음 작업");
    expect(result.riskLevel).toBe("low");
    expect(result.executionMode).toBe("single");
    expect(result.shouldAutoRun).toBe(false);
  });

  it("should generate fail task for implementation errors", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      status: "failed",
      failureReason: "Logic error in implementation",
      errorMessages: ["Error: undefined is not a function"],
      exitCode: 1,
    };

    const decision: DecisionClassification = {
      decision: "fail",
      reason: "Implementation error",
      confidence: 90,
      nextAction: "halt_and_notify",
    };

    const result = generateNextTaskRecommendation(executionResult, decision, mockTask, "plan-1");

    expect(result.title).toContain("수정");
    expect(result.recommendedAgent).toBe("claude-code");
    expect(result.riskLevel).toBe("medium");
  });

  it("should generate qa task when qa_needed", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      checksRun: {
        typecheck: "passed",
        lint: "failed",
        test: "passed",
        build: "passed",
      },
    };

    const decision: DecisionClassification = {
      decision: "qa_needed",
      reason: "Lint checks failed",
      confidence: 95,
      nextAction: "run_qa_agent",
    };

    const result = generateNextTaskRecommendation(executionResult, decision, mockTask, "plan-1");

    expect(result.title).toContain("QA");
    expect(result.recommendedAgent).toBe("codex");
  });

  it("should generate retry task when retry_needed", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      status: "failed",
      failureReason: "Connection timeout",
      errorMessages: ["Error: ECONNRESET"],
      exitCode: 1,
    };

    const decision: DecisionClassification = {
      decision: "retry_needed",
      reason: "Temporary network error",
      confidence: 80,
      nextAction: "retry_same_agent",
    };

    const result = generateNextTaskRecommendation(executionResult, decision, mockTask, "plan-1");

    expect(result.title).toContain("재시도");
    expect(result.recommendedAgent).toBe("claude-code");
    expect(result.riskLevel).toBe("low");
  });

  it("should generate drift analysis task when drift_detected", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      changedFiles: ["src/unrelated-file.ts"],
    };

    const decision: DecisionClassification = {
      decision: "drift_detected",
      reason: "Changed files outside allowed boundary",
      confidence: 85,
      nextAction: "halt_and_notify",
    };

    const result = generateNextTaskRecommendation(executionResult, decision, mockTask, "plan-1");

    expect(result.title).toContain("일탈");
    expect(result.riskLevel).toBe("high");
    expect(result.executionMode).toBe("single");
  });

  it("should generate manual review task for blocked decision", () => {
    const decision: DecisionClassification = {
      decision: "blocked",
      reason: "File boundary violation detected",
      confidence: 100,
      nextAction: "halt_and_notify",
    };

    const result = generateNextTaskRecommendation(baseExecutionResult, decision, mockTask, "plan-1");

    expect(result.title).toContain("사용자");
    expect(result.executionMode).toBe("blocked");
  });

  it("should preserve allowed and forbidden files", () => {
    const task: PlanTask = {
      ...mockTask,
      allowedFiles: ["src/**"],
      doNotTouchFiles: [".env", "package.json"],
    };

    const decision: DecisionClassification = {
      decision: "fail",
      reason: "Build failed",
      confidence: 90,
      nextAction: "halt_and_notify",
    };

    const result = generateNextTaskRecommendation(baseExecutionResult, decision, task, "plan-1");

    expect(result.allowedFiles).toEqual(["src/**"]);
    expect(result.doNotTouchFiles).toEqual([".env", "package.json"]);
  });

  it("should set shouldAutoRun to false for all tasks", () => {
    const decisions: DecisionClassification[] = [
      {
        decision: "pass",
        reason: "Passed",
        confidence: 100,
        nextAction: "proceed_to_next_task",
      },
      {
        decision: "fail",
        reason: "Failed",
        confidence: 90,
        nextAction: "halt_and_notify",
      },
      {
        decision: "qa_needed",
        reason: "QA needed",
        confidence: 95,
        nextAction: "run_qa_agent",
      },
    ];

    decisions.forEach((decision) => {
      const result = generateNextTaskRecommendation(
        baseExecutionResult,
        decision,
        mockTask,
        "plan-1",
      );
      expect(result.shouldAutoRun).toBe(false);
    });
  });
});
