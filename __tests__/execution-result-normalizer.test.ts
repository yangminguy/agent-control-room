/**
 * execution-result-normalizer.test.ts
 *
 * Tests for lib/runner/execution-result-normalizer.ts
 * Covers: success, failure, check failures, no-change, boundary_violation, missing log cases.
 */

import { describe, it, expect } from "@jest/globals";
import { normalizeExecutionResult } from "@/lib/runner/execution-result-normalizer";
import type { ExecutionLog } from "@/lib/types";

// Minimal valid ExecutionLog factory
function makeLog(overrides: Partial<ExecutionLog> = {}): ExecutionLog {
  return {
    id: "log-1",
    planTaskId: "task-1",
    agent: "claude-code",
    branchName: "feat/test",
    startedAt: "2026-05-23T00:00:00.000Z",
    completedAt: "2026-05-23T00:01:00.000Z",
    exitCode: 0,
    logLines: [],
    status: "done",
    ...overrides,
  };
}

describe("normalizeExecutionResult", () => {
  it("success case: exit 0 with done status → status='done'", () => {
    const log = makeLog({ status: "done", exitCode: 0 });
    const result = normalizeExecutionResult(log, "plan-1", ["src/foo.ts"]);

    expect(result.status).toBe("done");
    expect(result.planId).toBe("plan-1");
    expect(result.taskId).toBe("task-1");
    expect(result.changedFiles).toEqual(["src/foo.ts"]);
    expect(result.recommendedNextAction).toBe("continue");
  });

  it("failure case: exit non-zero with failed status → status='failed'", () => {
    const log = makeLog({
      status: "failed",
      exitCode: 1,
      logLines: ["[ERROR] Build step failed with exit 1"],
    });
    const result = normalizeExecutionResult(log, "plan-1", []);

    expect(result.status).toBe("failed");
    expect(result.recommendedNextAction).toBe("retry_same_agent");
    expect(result.failureReason).toBeDefined();
  });

  it("checks failed case: exit 0 but build failed → includes check failures", () => {
    const log = makeLog({
      status: "done",
      exitCode: 0,
      logLines: [
        "Running typecheck...",
        "typecheck: 2 errors found",
        "typecheck failed — error TS2345",
      ],
    });
    const result = normalizeExecutionResult(log, "plan-2", ["src/bar.ts"]);

    expect(result.status).toBe("done");
    expect(result.checksRun.typecheck).toBe("failed");
    // recommended action should reflect check failure
    expect(result.recommendedNextAction).toBe("handoff_to_agent");
  });

  it("no changed files case: changedFiles=[]", () => {
    const log = makeLog({ status: "done", exitCode: 0, logLines: [] });
    const result = normalizeExecutionResult(log, "plan-1", []);

    expect(result.changedFiles).toEqual([]);
    expect(result.status).toBe("done");
  });

  it("boundary_violation case: status='boundary_violation' → recommendedNextAction='manual_review'", () => {
    const log = makeLog({
      status: "boundary_violation",
      exitCode: 1,
      logLines: ["[BOUNDARY] File outside allowed scope touched"],
    });
    const result = normalizeExecutionResult(log, "plan-3", ["lib/UNSAFE.ts"]);

    expect(result.status).toBe("boundary_violation");
    expect(result.recommendedNextAction).toBe("manual_review");
    expect(result.failureReason).toBeDefined();
  });

  it("review_blocked case: status='review_blocked' → recommendedNextAction='manual_review'", () => {
    const log = makeLog({
      status: "review_blocked",
      logLines: ["[REVIEW_BLOCKED] High-risk operation requires review"],
    });
    const result = normalizeExecutionResult(log, "plan-4", []);

    expect(result.status).toBe("review_blocked");
    expect(result.recommendedNextAction).toBe("manual_review");
  });

  it("logSummary is truncated to first 200 chars of joined log lines", () => {
    const longLine = "X".repeat(300);
    const log = makeLog({ logLines: [longLine] });
    const result = normalizeExecutionResult(log, "plan-1", []);

    expect(result.logSummary.length).toBeLessThanOrEqual(200);
  });
});
