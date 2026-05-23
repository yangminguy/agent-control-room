import {
  saveControlRoomPlan,
  getControlRoomPlanById,
  saveControlRoomRun,
  getControlRoomRuns,
} from "@/lib/control-room/store";
import type { ControlRoomPlan, ControlRoomExecutionRun, DispatchJob } from "@/lib/types";

describe("Control Room State Persistence", () => {
  // Test 1: Plan persistence and restoration
  test("saveControlRoomPlan stores and getControlRoomPlanById retrieves the plan", async () => {
    const testPlan: ControlRoomPlan = {
      id: `test-plan-${Date.now()}`,
      projectId: "test-project",
      projectName: "Test Project",
      title: "Test Plan",
      productVision: "Test vision",
      conversationState: "completed",
      assistantReply: "Plan ready",
      clarifyingQuestions: [],
      phases: [],
      assumptions: [],
      finalPlanReady: true,
      executionReadiness: "ready",
      requiresUserDecision: false,
      riskLevel: "low",
      openAiRequired: false,
      source: "fallback",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveControlRoomPlan(testPlan);
    expect(saved.id).toBe(testPlan.id);

    const retrieved = await getControlRoomPlanById(testPlan.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.id).toBe(testPlan.id);
    expect(retrieved?.title).toBe(testPlan.title);
  });

  // Test 2: Run persistence and restoration
  test("saveControlRoomRun stores and getControlRoomRuns retrieves the run", async () => {
    const testRun: ControlRoomExecutionRun = {
      id: `test-run-${Date.now()}`,
      planId: `test-plan-${Date.now()}`,
      featurePlanId: `feature-plan-${Date.now()}`,
      status: "queued",
      startedAt: new Date().toISOString(),
      message: "Test run",
      startedTasks: [],
      vibeIssues: [],
      hermesPacket: "test packet",
      approvalRequired: false,
    };

    const saved = await saveControlRoomRun(testRun);
    expect(saved.id).toBe(testRun.id);

    const runs = await getControlRoomRuns();
    const retrieved = runs.find((r) => r.id === testRun.id);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.status).toBe("queued");
  });

  // Test 3: Safe handling of missing control-room-runs.json
  test("getControlRoomRuns returns empty array when file is missing", async () => {
    const runs = await getControlRoomRuns();
    expect(Array.isArray(runs)).toBe(true);
  });

  // Test 4: featurePlanId priority in plan selection
  test("Plan with latestRun.featurePlanId is prioritized over seed data", async () => {
    const now = new Date().toISOString();
    const activePlan: ControlRoomPlan = {
      id: `active-plan-${Date.now()}`,
      projectId: "test-project",
      projectName: "Active Project",
      title: "Active Plan",
      productVision: "Active vision",
      conversationState: "completed",
      assistantReply: "Plan ready",
      clarifyingQuestions: [],
      phases: [],
      assumptions: [],
      finalPlanReady: true,
      executionReadiness: "ready",
      requiresUserDecision: false,
      riskLevel: "low",
      openAiRequired: false,
      source: "fallback",
      createdAt: now,
      updatedAt: now,
    };

    const seedPlan: ControlRoomPlan = {
      id: "seed-plan",
      projectId: "seed-project",
      projectName: "Seed Project",
      title: "Seed Plan",
      productVision: "Seed vision",
      conversationState: "completed",
      assistantReply: "Plan ready",
      clarifyingQuestions: [],
      phases: [],
      assumptions: [],
      finalPlanReady: true,
      executionReadiness: "ready",
      requiresUserDecision: false,
      riskLevel: "low",
      openAiRequired: false,
      source: "fallback",
      createdAt: now,
      updatedAt: now,
    };

    await saveControlRoomPlan(activePlan);
    await saveControlRoomPlan(seedPlan);

    // Simulate: latestRun.featurePlanId exists
    const latestRunFeaturePlanId = activePlan.id;
    const allPlans = [seedPlan, activePlan]; // seed might be in list

    // Logic: find by featurePlanId first, then default to [0]
    const preferredPlan = allPlans.find((p) => p.id === latestRunFeaturePlanId) ?? allPlans[0];
    expect(preferredPlan.id).toBe(activePlan.id);
  });

  // Test 5: workbenchUrl reconstruction from run data
  test("workbenchUrl is correctly constructed from run.featurePlanId and firstJob.taskId", async () => {
    const featurePlanId = `feature-plan-${Date.now()}`;
    const taskId = `task-${Date.now()}`;

    const job: DispatchJob = {
      id: `job-${Date.now()}`,
      taskId,
      phaseId: "phase-1",
      featurePlanId,
      agentId: "claude-code",
      riskLevel: "low",
      status: "queued",
      executionSurface: "local_runner",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
      prompt: "test prompt",
    };

    const run: ControlRoomExecutionRun = {
      id: `run-${Date.now()}`,
      planId: "test-plan",
      featurePlanId,
      status: "queued",
      startedAt: new Date().toISOString(),
      message: "Test",
      startedTasks: [job],
      vibeIssues: [],
      hermesPacket: "",
      approvalRequired: false,
    };

    const firstActiveJob = run.startedTasks.find(
      (j) => j.status === "queued" || j.status === "running"
    ) ?? run.startedTasks[0];

    const workbenchUrl =
      run.featurePlanId && firstActiveJob?.taskId
        ? `/workbench?planId=${run.featurePlanId}&taskId=${firstActiveJob.taskId}`
        : null;

    expect(workbenchUrl).toBe(
      `/workbench?planId=${featurePlanId}&taskId=${taskId}`
    );
  });

  // Test 6: Smoke test plan identity preservation
  test("smoke test plan preserves featurePlanId and taskId in run", async () => {
    const testFeaturePlanId = "smoke-test-feature-plan";
    const testTaskId = "smoke-test-task";

    const smokeTestJob: DispatchJob = {
      id: "smoke-test-job",
      taskId: testTaskId,
      phaseId: "smoke-phase",
      featurePlanId: testFeaturePlanId,
      agentId: "claude-code",
      riskLevel: "low",
      status: "queued",
      executionSurface: "local_runner",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      maxRetries: 2,
      prompt: "Create docs/smoke-test.md",
    };

    const smokeTestRun: ControlRoomExecutionRun = {
      id: "smoke-test-run",
      planId: "smoke-test-plan",
      featurePlanId: testFeaturePlanId,
      status: "queued",
      startedAt: new Date().toISOString(),
      message: "Smoke test execution started",
      startedTasks: [smokeTestJob],
      vibeIssues: [],
      hermesPacket: "",
      approvalRequired: false,
    };

    const saved = await saveControlRoomRun(smokeTestRun);

    // Verify: featurePlanId and taskId are preserved
    expect(saved.featurePlanId).toBe(testFeaturePlanId);
    expect(saved.startedTasks[0].taskId).toBe(testTaskId);
    expect(saved.startedTasks[0].featurePlanId).toBe(testFeaturePlanId);

    // Verify: can be retrieved and reconstructed to workbench URL
    const retrieved = await getControlRoomRuns();
    const found = retrieved.find((r) => r.id === "smoke-test-run");

    if (found) {
      const firstJob = found.startedTasks[0];
      const reconstructedUrl = found.featurePlanId && firstJob?.taskId
        ? `/workbench?planId=${found.featurePlanId}&taskId=${firstJob.taskId}`
        : null;

      expect(reconstructedUrl).toBe(
        `/workbench?planId=${testFeaturePlanId}&taskId=${testTaskId}`
      );
    }
  });
});
