/**
 * decision-classifier safety tests
 *
 * Focus: a boundary_violation execution must NEVER classify as "pass".
 * Also verifies failed build / failed test / non-zero exit do not pass.
 */

import { describe, it, expect } from "@jest/globals";
import { classifyExecutionResult } from "../lib/orchestration/decision-classifier";
import type { HermesExecutionInput } from "../lib/types";

function baseInput(overrides: Partial<HermesExecutionInput>): HermesExecutionInput {
  return {
    taskId: "task-1",
    phaseId: "phase-1",
    planId: "plan-1",
    assignedAgent: "claude-code",
    executionStatus: "success",
    logSummary: "ok",
    changedFiles: ["lib/foo.ts"],
    checksResult: {},
    riskLevel: "low",
    exitCode: 0,
    ...overrides,
  };
}

describe("decision-classifier — safety rules", () => {
  it("boundary_violation classifies as blocked (never pass)", () => {
    const result = classifyExecutionResult(
      baseInput({ executionStatus: "boundary_violation", exitCode: 0 }),
    );
    expect(result.decision).toBe("blocked");
    expect(result.decision).not.toBe("pass");
    expect(result.confidence).toBe(100);
    expect(result.nextAction).toBe("halt_and_notify");
  });

  it("boundary_violation blocks even with all checks passing and exit 0", () => {
    const result = classifyExecutionResult(
      baseInput({
        executionStatus: "boundary_violation",
        exitCode: 0,
        checksResult: { typecheck: "pass", lint: "pass", test: "pass", build: "pass" },
      }),
    );
    expect(result.decision).toBe("blocked");
  });

  it("failed build does not classify as pass", () => {
    const result = classifyExecutionResult(
      baseInput({ exitCode: 0, checksResult: { build: "fail" } }),
    );
    expect(result.decision).not.toBe("pass");
    expect(result.decision).toBe("qa_needed");
  });

  it("failed test does not classify as pass", () => {
    const result = classifyExecutionResult(
      baseInput({ exitCode: 0, checksResult: { test: "fail" } }),
    );
    expect(result.decision).not.toBe("pass");
    expect(result.decision).toBe("qa_needed");
  });

  it("runner exit non-zero does not classify as pass", () => {
    const result = classifyExecutionResult(
      baseInput({ executionStatus: "failure", exitCode: 1, failureReason: "build crashed" }),
    );
    expect(result.decision).not.toBe("pass");
    expect(result.decision).toBe("fail");
  });

  it("clean success still classifies as pass (control)", () => {
    const result = classifyExecutionResult(
      baseInput({
        executionStatus: "success",
        exitCode: 0,
        checksResult: { typecheck: "pass", test: "pass", build: "pass" },
      }),
    );
    expect(result.decision).toBe("pass");
  });
});
