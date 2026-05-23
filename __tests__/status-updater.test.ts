/**
 * status-updater.test.ts
 *
 * Tests for lib/orchestration/status-updater.ts — applyStatusUpdate()
 * Storage functions are mocked so tests remain pure and fast.
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock both storage layers before importing the module under test
jest.mock("@/lib/storage/feature-plan-store", () => ({
  updatePlanTaskStatus: jest.fn().mockResolvedValue(undefined as never),
  updateKanbanCardResult: jest.fn().mockResolvedValue(undefined as never),
  getFeaturePlanById: jest.fn().mockResolvedValue(undefined as never),
}));

jest.mock("@/lib/storage/roadmap-store", () => ({
  updateRoadmapStageStatus: jest.fn().mockResolvedValue(undefined as never),
}));

import { applyStatusUpdate } from "@/lib/orchestration/status-updater";
import type { ExecutionResultSummary } from "@/lib/orchestration/status-updater";
import type { DecisionClassification } from "@/lib/types";
import {
  updatePlanTaskStatus,
  updateKanbanCardResult,
} from "@/lib/storage/feature-plan-store";

const mockUpdateStatus = updatePlanTaskStatus as jest.MockedFunction<typeof updatePlanTaskStatus>;
const mockUpdateKanban = updateKanbanCardResult as jest.MockedFunction<typeof updateKanbanCardResult>;

beforeEach(() => {
  jest.clearAllMocks();
  // Re-set defaults after clearAllMocks
  mockUpdateStatus.mockResolvedValue(undefined as never);
  mockUpdateKanban.mockResolvedValue(undefined as never);
});

// Minimal helpers
function makeResult(overrides: Partial<ExecutionResultSummary> = {}): ExecutionResultSummary {
  return {
    changedFiles: ["src/app.ts"],
    diffSummary: "Added feature X",
    checksPass: true,
    exitCode: 0,
    rawOutput: "Build successful",
    ...overrides,
  };
}

function makeDecision(
  decision: DecisionClassification["decision"],
  overrides: Partial<DecisionClassification> = {},
): DecisionClassification {
  const nextActionMap: Record<DecisionClassification["decision"], DecisionClassification["nextAction"]> = {
    pass: "proceed_to_next_task",
    fail: "halt_and_notify",
    qa_needed: "run_qa_agent",
    retry_needed: "retry_same_agent",
    blocked: "halt_and_notify",
    drift_detected: "request_user_approval",
    manual_review: "request_manual_review",
  };
  return {
    decision,
    reason: `결정: ${decision}`,
    confidence: 90,
    nextAction: nextActionMap[decision],
    ...overrides,
  };
}

describe("applyStatusUpdate — decision to status mapping", () => {
  it("decision='pass' → PlanTask status='done'", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("pass"));
    expect(summary.appliedStatus).toBe("done");
    expect(summary.skipped).toBe(false);
    expect(mockUpdateStatus).toHaveBeenCalledWith("plan-1", "task-1", "done");
  });

  it("decision='fail' → PlanTask status='blocked'", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult({ checksPass: true }), makeDecision("fail"));
    expect(summary.appliedStatus).toBe("blocked");
  });

  it("decision='qa_needed' → PlanTask status='needs_review'", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("qa_needed"));
    expect(summary.appliedStatus).toBe("needs_review");
  });

  it("decision='retry_needed' → PlanTask status='ready'", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("retry_needed"));
    expect(summary.appliedStatus).toBe("ready");
  });

  it("decision='blocked' → PlanTask status='blocked'", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult({ checksPass: true }), makeDecision("blocked"));
    expect(summary.appliedStatus).toBe("blocked");
  });

  it("decision='drift_detected' → PlanTask status='needs_review'", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("drift_detected"));
    expect(summary.appliedStatus).toBe("needs_review");
  });
});

describe("applyStatusUpdate — safety gates", () => {
  it("failed run (checksPass=false) cannot be marked done → skips update", async () => {
    const summary = await applyStatusUpdate(
      "plan-1", "task-1",
      makeResult({ checksPass: false }),
      makeDecision("pass"),
    );
    expect(summary.skipped).toBe(true);
    expect(summary.skipReason).toContain("checksPass is false");
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("exitCode !== 0 cannot be marked done → skips update", async () => {
    const summary = await applyStatusUpdate(
      "plan-1", "task-1",
      makeResult({ exitCode: 1 }),
      makeDecision("pass"),
    );
    expect(summary.skipped).toBe(true);
    expect(summary.skipReason).toContain("exitCode is 1");
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("missing planId → skips update", async () => {
    const summary = await applyStatusUpdate("", "task-1", makeResult(), makeDecision("pass"));
    expect(summary.skipped).toBe(true);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });

  it("missing taskId → skips update", async () => {
    const summary = await applyStatusUpdate("plan-1", "", makeResult(), makeDecision("pass"));
    expect(summary.skipped).toBe(true);
    expect(mockUpdateStatus).not.toHaveBeenCalled();
  });
});

describe("applyStatusUpdate — Kanban persistence", () => {
  it("Kanban status is persisted after a successful update", async () => {
    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("pass"));
    expect(summary.kanbanUpdated).toBe(true);
    expect(mockUpdateKanban).toHaveBeenCalledWith(
      "plan-1",
      "task-1",
      expect.objectContaining({ status: "done", completionJudgment: "completed" }),
    );
  });

  it("Kanban update failure is non-fatal: PlanTask still updated", async () => {
    mockUpdateKanban.mockRejectedValueOnce(new Error("DB timeout") as never);

    const summary = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("pass"));
    // PlanTask should still be updated
    expect(mockUpdateStatus).toHaveBeenCalled();
    // skipped should be false (update continued despite kanban error)
    expect(summary.skipped).toBe(false);
    // kanbanUpdated should be false due to the error
    expect(summary.kanbanUpdated).toBe(false);
  });

  it("retry_needed Kanban update uses partial completionJudgment", async () => {
    await applyStatusUpdate(
      "plan-1", "task-1",
      makeResult({ checksPass: true }),
      makeDecision("retry_needed"),
    );
    expect(mockUpdateKanban).toHaveBeenCalledWith(
      "plan-1",
      "task-1",
      expect.objectContaining({ completionJudgment: "partial", status: "ready" }),
    );
  });
});
