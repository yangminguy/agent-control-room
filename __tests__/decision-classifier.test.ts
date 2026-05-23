/**
 * decision-classifier.test.ts
 *
 * Tests for lib/orchestration/decision-classifier.ts — classifyExecutionResult()
 * Covers all 8 classification rules.
 */

import { describe, it, expect } from "@jest/globals";
import { classifyExecutionResult } from "@/lib/orchestration/decision-classifier";
import type { HermesExecutionInput } from "@/lib/types";

// Minimal valid HermesExecutionInput that passes all rules → "pass"
function makeInput(overrides: Partial<HermesExecutionInput> = {}): HermesExecutionInput {
  return {
    taskId: "task-1",
    phaseId: "phase-1",
    planId: "plan-1",
    assignedAgent: "claude-code",
    executionStatus: "success",
    logSummary: "All done.",
    changedFiles: ["src/app.ts"],
    checksResult: { typecheck: "pass", lint: "pass", test: "pass", build: "pass" },
    riskLevel: "low",
    exitCode: 0,
    errorMessages: [],
    allowedFiles: ["src/**"],
    doNotTouchFiles: [],
    changesExpected: true,
    ...overrides,
  };
}

describe("classifyExecutionResult", () => {
  // Rule 1: null/undefined summary → blocked
  it("null summary → blocked", () => {
    // @ts-expect-error intentional null
    const result = classifyExecutionResult(null);
    expect(result.decision).toBe("blocked");
    expect(result.nextAction).toBe("halt_and_notify");
  });

  it("undefined summary → blocked", () => {
    // @ts-expect-error intentional undefined
    const result = classifyExecutionResult(undefined);
    expect(result.decision).toBe("blocked");
  });

  // Rule 2: boundary_violation → blocked (NEW RULE 5 in spec)
  it("boundary_violation status → blocked", () => {
    const result = classifyExecutionResult(
      makeInput({ executionStatus: "boundary_violation" }),
    );
    expect(result.decision).toBe("blocked");
    expect(result.nextAction).toBe("halt_and_notify");
    expect(result.confidence).toBe(100);
  });

  // Rule 3: changedFiles contains doNotTouchFiles → blocked
  it("changedFiles contains doNotTouchFiles → blocked", () => {
    const result = classifyExecutionResult(
      makeInput({
        changedFiles: ["secrets/.env", "src/app.ts"],
        doNotTouchFiles: ["secrets/.env"],
      }),
    );
    expect(result.decision).toBe("blocked");
    expect(result.reason).toContain("secrets/.env");
  });

  // Rule 4: changedFiles outside allowedFiles → drift_detected
  it("changedFiles outside allowedFiles → drift_detected", () => {
    const result = classifyExecutionResult(
      makeInput({
        changedFiles: ["unauthorized/module.ts"],
        allowedFiles: ["src/**"],
        doNotTouchFiles: [],
      }),
    );
    expect(result.decision).toBe("drift_detected");
    expect(result.nextAction).toBe("request_user_approval");
  });

  // Rule 5 (exitCode): status='failed' retryable error → retry_needed
  it("status=failed with retryable error → retry_needed", () => {
    const result = classifyExecutionResult(
      makeInput({
        executionStatus: "failure",
        exitCode: 1,
        errorMessages: ["rate limit exceeded, please wait"],
      }),
    );
    expect(result.decision).toBe("retry_needed");
    expect(result.nextAction).toBe("retry_same_agent");
  });

  // Rule 5 (exitCode): status='failed' non-retryable → fail
  it("status=failed with non-retryable error → fail", () => {
    const result = classifyExecutionResult(
      makeInput({
        executionStatus: "failure",
        exitCode: 1,
        errorMessages: ["SyntaxError: Unexpected token"],
      }),
    );
    expect(result.decision).toBe("fail");
    expect(result.nextAction).toBe("halt_and_notify");
  });

  // Rule 6: checksRun has failures → qa_needed
  it("checksResult has failures → qa_needed", () => {
    const result = classifyExecutionResult(
      makeInput({
        checksResult: { typecheck: "fail", lint: "pass" },
      }),
    );
    expect(result.decision).toBe("qa_needed");
    expect(result.nextAction).toBe("run_qa_agent");
    expect(result.reason).toContain("타입 검사");
  });

  // Rule 7: changesExpected but no changes → manual_review
  it("changesExpected=true but changedFiles=[] → manual_review", () => {
    const result = classifyExecutionResult(
      makeInput({
        changedFiles: [],
        changesExpected: true,
      }),
    );
    expect(result.decision).toBe("manual_review");
    expect(result.nextAction).toBe("request_manual_review");
  });

  // Rule 8: success with checks passed → pass
  it("all conditions clear → pass", () => {
    const result = classifyExecutionResult(makeInput());
    expect(result.decision).toBe("pass");
    expect(result.nextAction).toBe("proceed_to_next_task");
  });

  // needs_approval status → blocked
  it("executionStatus=needs_approval → blocked", () => {
    const result = classifyExecutionResult(
      makeInput({
        executionStatus: "needs_approval",
        approvalReason: "High risk operation",
      }),
    );
    expect(result.decision).toBe("blocked");
  });
});
