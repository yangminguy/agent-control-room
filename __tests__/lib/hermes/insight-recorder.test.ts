/**
 * Tests for insight-recorder.ts
 * Verifies Hermes insight generation
 */

import { generateInsightsFromExecution, HermesInsightRecorder } from "@/lib/hermes/insight-recorder";
import type {
  ExecutionResultSummary,
  DecisionClassification,
  PlanTask,
} from "@/lib/types";

describe("generateInsightsFromExecution", () => {
  const mockTask: PlanTask = {
    id: "task-1",
    planId: "plan-1",
    title: "Test task",
    description: "Test task",
    status: "running",
    assignedAgent: "claude-code",
    priority: "P0",
    acceptanceCriteria: [],
    subAgentTracks: [],
    createdAt: "2026-05-23T00:00:00Z",
    updatedAt: "2026-05-23T00:00:00Z",
  };

  const baseExecutionResult: ExecutionResultSummary = {
    planId: "plan-1",
    taskId: "task-1",
    assignedAgent: "claude-code",
    status: "done",
    logSummary: "Completed",
    changedFiles: ["src/test.ts"],
    checksRun: {
      typecheck: "passed",
      lint: "passed",
      test: "passed",
      build: "passed",
    },
    recommendedNextAction: "continue",
  };

  const baseDecision: DecisionClassification = {
    decision: "pass",
    reason: "All checks passed",
    confidence: 100,
    nextAction: "proceed_to_next_task",
  };

  it("should generate file boundary violation insight", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      changedFiles: [".env", "src/test.ts"],
      doNotTouchFiles: [".env", "secrets/*"],
    };

    const insights = generateInsightsFromExecution(
      executionResult,
      baseDecision,
      mockTask,
    );

    const boundaryInsight = insights.find(
      (i) => i.patternType === "security",
    );
    expect(boundaryInsight).toBeDefined();
    expect(boundaryInsight?.severity).toBe("critical");
    expect(boundaryInsight?.summary).toContain("경계 위반");
  });

  it("should generate no-changes insight when changes expected but none found", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      changedFiles: [],
      changesExpected: true,
    };

    const insights = generateInsightsFromExecution(
      executionResult,
      baseDecision,
      mockTask,
    );

    const noChangesInsight = insights.find((i) => i.summary.includes("예상"));
    expect(noChangesInsight).toBeDefined();
    expect(noChangesInsight?.severity).toBe("warning");
  });

  it("should generate exit code insight for process errors", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      status: "failed",
      exitCode: 127,
      errorMessages: ["Command not found"],
    };

    const failDecision: DecisionClassification = {
      decision: "fail",
      reason: "Exit code 127",
      confidence: 90,
      nextAction: "halt_and_notify",
    };

    const insights = generateInsightsFromExecution(
      executionResult,
      failDecision,
      mockTask,
    );

    const exitCodeInsight = insights.find(
      (i) => i.patternType === "execution_error",
    );
    expect(exitCodeInsight).toBeDefined();
    expect(exitCodeInsight?.evidence).toContain("Exit code: 127");
  });

  it("should generate check failure insight", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      checksRun: {
        typecheck: "failed",
        lint: "passed",
        test: "failed",
        build: "passed",
      },
    };

    const insights = generateInsightsFromExecution(
      executionResult,
      baseDecision,
      mockTask,
    );

    const checkInsight = insights.find(
      (i) => i.patternType === "qa_failure",
    );
    expect(checkInsight).toBeDefined();
    expect(checkInsight?.summary).toContain("체크 실패");
  });

  it("should generate drift insight when drift_detected decision", () => {
    const decision: DecisionClassification = {
      decision: "drift_detected",
      reason: "Unexpected changes to system files",
      confidence: 85,
      nextAction: "halt_and_notify",
    };

    const insights = generateInsightsFromExecution(
      baseExecutionResult,
      decision,
      mockTask,
    );

    const driftInsight = insights.find((i) => i.patternType === "drift");
    expect(driftInsight).toBeDefined();
    expect(driftInsight?.severity).toBe("warning");
  });

  it("should generate scope creep insight for unallowed files", () => {
    const executionResult: ExecutionResultSummary = {
      ...baseExecutionResult,
      changedFiles: ["src/test.ts", "lib/unallowed.ts"],
      allowedFiles: ["src/**"],
    };

    const insights = generateInsightsFromExecution(
      executionResult,
      baseDecision,
      mockTask,
    );

    const scopeInsight = insights.find(
      (i) => i.patternType === "scope_creep",
    );
    expect(scopeInsight).toBeDefined();
    expect(scopeInsight?.evidence).toContain("lib/unallowed.ts");
  });

  it("should not generate insights when execution is clean", () => {
    const insights = generateInsightsFromExecution(
      baseExecutionResult,
      baseDecision,
      mockTask,
    );

    expect(insights.length).toBe(0);
  });
});

describe("HermesInsightRecorder", () => {
  it("should record and retrieve insights", () => {
    const recorder = new HermesInsightRecorder(false); // 파일 저장 비활성화 (테스트용)

    const insight = {
      id: "test-1",
      createdAt: new Date().toISOString(),
      source: "execution_result" as const,
      summary: "Test insight",
      details: "Test details",
      evidence: ["test"],
      recommendation: "Test recommendation",
      severity: "info" as const,
      frequency: 1,
    };

    recorder.recordInsight(insight);

    const insights = recorder.getAllInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].summary).toBe("Test insight");
  });

  it("should filter by severity", () => {
    const recorder = new HermesInsightRecorder(false);

    recorder.recordInsight({
      id: "critical-1",
      createdAt: new Date().toISOString(),
      source: "execution_result",
      summary: "Critical issue",
      details: "Details",
      evidence: [],
      recommendation: "Fix immediately",
      severity: "critical",
    });

    recorder.recordInsight({
      id: "info-1",
      createdAt: new Date().toISOString(),
      source: "execution_result",
      summary: "Info message",
      details: "Details",
      evidence: [],
      recommendation: "FYI",
      severity: "info",
    });

    const critical = recorder.getInsightsBySeverity("critical");
    expect(critical).toHaveLength(1);
    expect(critical[0].summary).toBe("Critical issue");
  });

  it("should aggregate duplicate insights", () => {
    const recorder = new HermesInsightRecorder(false);

    const now = new Date().toISOString();

    recorder.recordInsight({
      id: "test-1",
      createdAt: now,
      source: "execution_result",
      summary: "Repeated error",
      details: "Details",
      evidence: ["Error 1"],
      recommendation: "Fix",
      severity: "warning",
      patternType: "repeated_failure",
      frequency: 1,
    });

    recorder.recordInsight({
      id: "test-2",
      createdAt: now,
      source: "execution_result",
      summary: "Repeated error",
      details: "Details",
      evidence: ["Error 2"],
      recommendation: "Fix",
      severity: "warning",
      patternType: "repeated_failure",
      frequency: 1,
    });

    const insights = recorder.getAllInsights();
    expect(insights).toHaveLength(1);
    expect(insights[0].frequency).toBe(2);
    expect(insights[0].evidence).toHaveLength(2);
  });

  it("should filter recent insights by hours", () => {
    const recorder = new HermesInsightRecorder(false);

    const now = new Date();
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

    recorder.recordInsight({
      id: "recent-1",
      createdAt: twoHoursAgo.toISOString(),
      source: "execution_result",
      summary: "Recent insight",
      details: "Details",
      evidence: [],
      recommendation: "Fix",
      severity: "info",
    });

    recorder.recordInsight({
      id: "old-1",
      createdAt: threeHoursAgo.toISOString(),
      source: "execution_result",
      summary: "Old insight",
      details: "Details",
      evidence: [],
      recommendation: "Fix",
      severity: "info",
    });

    const recent = recorder.getRecentInsights(2.5);
    expect(recent).toHaveLength(1);
    expect(recent[0].summary).toBe("Recent insight");
  });
});
