/**
 * Tests for parallel-safety-decider.ts
 * Verifies parallel execution safety judgment
 */

import { decideParallelSafety } from "@/lib/orchestration/parallel-safety-decider";
import type { NextTaskRecommendation } from "@/lib/orchestration/next-task-generator";

describe("decideParallelSafety", () => {
  const baseTask: NextTaskRecommendation = {
    taskId: "task-1",
    planId: "plan-1",
    title: "Test task 1",
    goal: "Test goal",
    description: "Test description",
    recommendedAgent: "claude-code",
    recommendationReason: "Test reason",
    riskLevel: "low",
    acceptanceCriteria: [],
    executionMode: "single",
    conflictRisk: "none",
    shouldAutoRun: false,
    priority: "P0",
    createdAt: "2026-05-23T00:00:00Z",
  };

  it("should prevent parallel execution when same files are modified", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["src/feature.ts", "src/utils.ts"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["src/feature.ts", "src/other.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("sequential");
    expect(result.conflictRisk).toBe("high");
    expect(result.conflictingFiles).toContain("src/feature.ts");
  });

  it("should allow parallel execution for UI vs backend separation", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["app/components/**"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["lib/orchestration/**"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("parallel_safe");
    expect(result.conflictRisk).toBe("none");
  });

  it("should prevent parallel when high-risk tasks are involved", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      riskLevel: "high",
      allowedFiles: ["src/feature.ts"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["src/other.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("sequential");
    expect(result.conflictRisk).toBe("high");
  });

  it("should prevent parallel when critical system areas are touched", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["lib/runner/execution-runner.ts"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["src/other.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("sequential");
    expect(result.conflictRisk).toBe("high");
  });

  it("should prevent parallel when type files are modified", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["lib/types.ts"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["lib/orchestration/types.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("sequential");
    expect(result.conflictRisk).toBe("high");
  });

  it("should default to sequential for uncertain cases", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["src/feature-a.ts"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["src/feature-b.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("sequential");
    // lib/ files without explicit UI/backend distinction are treated conservatively
  });

  it("should detect pattern-based file conflicts", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["lib/runner/*"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["lib/runner/cli-adapter.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.mode).toBe("sequential");
    expect(result.conflictRisk).toBe("high");
  });

  it("should provide clear reasoning for decisions", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: ["src/feature.ts"],
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["src/feature.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    expect(result.reason).toBeTruthy();
    expect(result.recommendation).toBeTruthy();
    expect(result.reason).toMatch(/\./); // Should be a proper sentence
  });

  it("should handle empty file lists safely", () => {
    const task1: NextTaskRecommendation = {
      ...baseTask,
      allowedFiles: undefined,
    };

    const task2: NextTaskRecommendation = {
      ...baseTask,
      taskId: "task-2",
      allowedFiles: ["src/feature.ts"],
    };

    const result = decideParallelSafety(task1, task2);

    // Should not crash and should lean toward sequential for safety
    expect(result.mode).toBeTruthy();
    expect(result.reason).toBeTruthy();
  });
});
