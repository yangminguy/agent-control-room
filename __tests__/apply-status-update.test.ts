/**
 * applyStatusUpdate integration tests
 * Phase E Task 4 — State sync wiring verification
 *
 * Tests verify:
 * 1. pass + checksPass=true → done
 * 2. fail (exitCode≠0) → blocked
 * 3. qa_needed (check failure) → needs_review
 * 4. blocked (boundary_violation) → blocked
 * 5. Safety gate: checksPass=false with pass decision → skipped (not done)
 * 6. Safety gate: exitCode≠0 with pass decision → skipped (not done)
 * 7. manual_review → needs_review
 * 8. drift_detected → needs_review
 * 9. retry_needed → ready
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// ── Mock storage modules so we don't touch the filesystem ───────────────────
jest.mock("../lib/storage/feature-plan-store", () => ({
  updatePlanTaskStatus: jest.fn().mockResolvedValue(undefined),
  updateKanbanCardResult: jest.fn().mockResolvedValue({ tasks: [] }),
  getFeaturePlanById: jest.fn().mockResolvedValue({
    id: "plan-1",
    projectId: "proj-1",
    title: "Test Plan",
    userGoal: "test",
    status: "running",
    tasks: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }),
}));

jest.mock("../lib/storage/roadmap-store", () => ({
  updateRoadmapStageStatus: jest.fn().mockResolvedValue({
    projectId: "proj-1",
    stages: [],
    overallProgress: 0,
    completedStageCount: 0,
    activeStageCount: 0,
    blockedStageCount: 0,
    updatedAt: new Date().toISOString(),
  }),
}));

import { applyStatusUpdate } from "../lib/orchestration/status-updater";
import { updatePlanTaskStatus, updateKanbanCardResult, getFeaturePlanById } from "../lib/storage/feature-plan-store";
import { updateRoadmapStageStatus } from "../lib/storage/roadmap-store";
import type { DecisionClassification } from "../lib/types";
import type { ExecutionResultSummary } from "../lib/orchestration/status-updater";

const mockUpdatePlanTaskStatus = updatePlanTaskStatus as jest.MockedFunction<typeof updatePlanTaskStatus>;
const mockUpdateKanbanCardResult = updateKanbanCardResult as jest.MockedFunction<typeof updateKanbanCardResult>;
const mockGetFeaturePlanById = getFeaturePlanById as jest.MockedFunction<typeof getFeaturePlanById>;
const mockUpdateRoadmapStageStatus = updateRoadmapStageStatus as jest.MockedFunction<typeof updateRoadmapStageStatus>;

function makeDecision(decision: DecisionClassification["decision"]): DecisionClassification {
  return {
    decision,
    reason: `test reason for ${decision}`,
    confidence: 90,
    nextAction: "proceed_to_next_task",
  };
}

function makeResult(overrides: Partial<ExecutionResultSummary> = {}): ExecutionResultSummary {
  return {
    changedFiles: ["lib/foo.ts"],
    exitCode: 0,
    checksPass: true,
    ...overrides,
  };
}

describe("applyStatusUpdate — status mapping", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdatePlanTaskStatus.mockResolvedValue(undefined);
    mockUpdateKanbanCardResult.mockResolvedValue({ tasks: [], id: "plan-1", projectId: "proj-1", title: "", userGoal: "", status: "done", createdAt: "", updatedAt: "" });
    mockGetFeaturePlanById.mockResolvedValue({
      id: "plan-1",
      projectId: "proj-1",
      title: "Test Plan",
      userGoal: "test",
      status: "running",
      tasks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    mockUpdateRoadmapStageStatus.mockResolvedValue({
      projectId: "proj-1",
      stages: [],
      overallProgress: 0,
      completedStageCount: 0,
      activeStageCount: 0,
      blockedStageCount: 0,
      updatedAt: new Date().toISOString(),
    } as never);
  });

  it("pass + checksPass=true → done", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ checksPass: true, exitCode: 0 }), makeDecision("pass"));
    expect(result.appliedStatus).toBe("done");
    expect(result.skipped).toBe(false);
    expect(mockUpdatePlanTaskStatus).toHaveBeenCalledWith("plan-1", "task-1", "done");
  });

  it("fail → blocked", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 1, checksPass: false }), makeDecision("fail"));
    expect(result.appliedStatus).toBe("blocked");
    expect(result.skipped).toBe(false);
    expect(mockUpdatePlanTaskStatus).toHaveBeenCalledWith("plan-1", "task-1", "blocked");
  });

  it("qa_needed → needs_review", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 0, checksPass: false }), makeDecision("qa_needed"));
    expect(result.appliedStatus).toBe("needs_review");
    expect(result.skipped).toBe(false);
    expect(mockUpdatePlanTaskStatus).toHaveBeenCalledWith("plan-1", "task-1", "needs_review");
  });

  it("blocked (boundary_violation) → blocked", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 0 }), makeDecision("blocked"));
    expect(result.appliedStatus).toBe("blocked");
    expect(result.skipped).toBe(false);
    expect(mockUpdatePlanTaskStatus).toHaveBeenCalledWith("plan-1", "task-1", "blocked");
  });

  it("manual_review → needs_review", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("manual_review"));
    expect(result.appliedStatus).toBe("needs_review");
    expect(result.skipped).toBe(false);
  });

  it("drift_detected → needs_review", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult(), makeDecision("drift_detected"));
    expect(result.appliedStatus).toBe("needs_review");
    expect(result.skipped).toBe(false);
  });

  it("retry_needed → ready", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 1 }), makeDecision("retry_needed"));
    expect(result.appliedStatus).toBe("ready");
    expect(result.skipped).toBe(false);
    expect(mockUpdatePlanTaskStatus).toHaveBeenCalledWith("plan-1", "task-1", "ready");
  });
});

describe("applyStatusUpdate — safety gates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetFeaturePlanById.mockResolvedValue({
      id: "plan-1", projectId: "proj-1", title: "", userGoal: "", status: "planned", tasks: [],
      createdAt: "", updatedAt: "",
    });
  });

  it("checksPass=false with pass decision → skipped, not marked done", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ checksPass: false, exitCode: 0 }), makeDecision("pass"));
    expect(result.skipped).toBe(true);
    expect(result.appliedStatus).toBe("blocked"); // safe fallback
    expect(mockUpdatePlanTaskStatus).not.toHaveBeenCalled();
  });

  it("exitCode≠0 with pass decision → skipped, not marked done", async () => {
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ checksPass: true, exitCode: 1 }), makeDecision("pass"));
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("exitCode is 1");
    expect(mockUpdatePlanTaskStatus).not.toHaveBeenCalled();
  });

  it("empty planId → skipped", async () => {
    const result = await applyStatusUpdate("", "task-1", makeResult(), makeDecision("pass"));
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("planId is missing");
  });

  it("empty taskId → skipped", async () => {
    const result = await applyStatusUpdate("plan-1", "", makeResult(), makeDecision("pass"));
    expect(result.skipped).toBe(true);
    expect(result.skipReason).toContain("taskId is missing");
  });
});

describe("applyStatusUpdate — roadmap update", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUpdatePlanTaskStatus.mockResolvedValue(undefined);
    mockUpdateKanbanCardResult.mockResolvedValue({ tasks: [], id: "plan-1", projectId: "proj-1", title: "", userGoal: "", status: "done", createdAt: "", updatedAt: "" });
    mockGetFeaturePlanById.mockResolvedValue({
      id: "plan-1", projectId: "proj-1", title: "", userGoal: "", status: "planned", tasks: [],
      createdAt: "", updatedAt: "",
    });
    mockUpdateRoadmapStageStatus.mockResolvedValue({ stages: [] } as never);
  });

  it("pass decision triggers roadmap stage update with completed status", async () => {
    await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 0, checksPass: true }), makeDecision("pass"));
    expect(mockUpdateRoadmapStageStatus).toHaveBeenCalledWith(
      "proj-1",
      "plan-1",
      expect.objectContaining({ status: "completed" }),
    );
  });

  it("fail decision triggers roadmap stage update with failed status", async () => {
    await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 1 }), makeDecision("fail"));
    expect(mockUpdateRoadmapStageStatus).toHaveBeenCalledWith(
      "proj-1",
      "plan-1",
      expect.objectContaining({ status: "failed" }),
    );
  });

  it("roadmap update failure does not block the response", async () => {
    mockUpdateRoadmapStageStatus.mockRejectedValueOnce(new Error("roadmap unavailable"));
    const result = await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 0, checksPass: true }), makeDecision("pass"));
    // Should still succeed overall — roadmap failure is non-fatal
    expect(result.skipped).toBe(false);
    expect(result.appliedStatus).toBe("done");
    expect(result.roadmapUpdated).toBe(false);
  });

  it("kanban is updated even when roadmap update fails", async () => {
    mockUpdateRoadmapStageStatus.mockRejectedValueOnce(new Error("roadmap unavailable"));
    await applyStatusUpdate("plan-1", "task-1", makeResult({ exitCode: 0, checksPass: true }), makeDecision("pass"));
    expect(mockUpdateKanbanCardResult).toHaveBeenCalled();
  });
});
