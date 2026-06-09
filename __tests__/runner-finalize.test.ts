/**
 * Characterization test for /api/runner's POST-SPAWN FINALIZE behavior.
 *
 * The finalize half (status derivation → PlanTask update → commit → merge →
 * L5 taskCallback → empty/boundary handling) had ZERO test coverage. This locks
 * its OBSERVABLE behavior (final PlanTask status + L5 callback `status`) so the
 * upcoming extraction into a shared `finalizePhaseExecution` can be proven
 * behavior-preserving. Assertions are at the behavior level (not implementation),
 * so they survive the refactor.
 *
 * Every I/O dependency is mocked; `runAgentWithVerification` is the control knob
 * for the spawn outcome (exit code / emptyOutput), and collectChangedFiles +
 * checkFileBoundaries drive the boundary path.
 */

const root = "/tmp/runner-finalize-cwd";

interface VerifyResult {
  exitCode: number;
  attempts: number;
  emptyOutput: boolean;
  changedCount: number;
}

interface LoadOpts {
  verify: VerifyResult;
  changedFiles: string[];
  boundaryViolation?: boolean;
}

interface CapturedCallback {
  status: string;
  exit_code: number;
  phase: string;
  merged?: boolean;
}

async function loadRoute(opts: LoadOpts) {
  jest.resetModules();

  const updatePlanTaskStatus = jest.fn(async () => {});
  const commitAll = jest.fn(async () => true);
  const updateExecutionLog = jest.fn(async () => {});

  jest.doMock("@/lib/runner/spawn-with-verification", () => ({
    runAgentWithVerification: jest.fn(async () => opts.verify),
    promptExpectsFileChanges: jest.fn(() => true),
  }));
  jest.doMock("@/lib/runner/git-utils", () => ({
    checkUncommittedChanges: jest.fn(async () => false),
    createBranch: jest.fn(async () => {}),
    generateBranchName: jest.fn(() => "acr/test-branch"),
    validateCwdSafety: jest.fn(() => true),
    getDiffSummary: jest.fn(() => "diff stat"),
    getLogTail: jest.fn(() => "log tail"),
    commitAll,
  }));
  jest.doMock("@/lib/runner/warm-session-store", () => ({
    WARM_SESSIONS_ENABLED: false,
    getWarmSession: jest.fn(async () => undefined),
    setWarmSession: jest.fn(async () => {}),
    newSessionId: jest.fn(() => "sess-1"),
  }));
  jest.doMock("@/lib/runner/merge-coordinator", () => ({
    coordinateMerge: jest.fn(() => ({ action: "merged", base: "main", detail: "merged to main" })),
  }));
  jest.doMock("@/lib/storage/execution-log-store", () => ({
    addExecutionLog: jest.fn(async () => ({ id: "log-1", startedAt: new Date().toISOString() })),
    updateExecutionLog,
  }));
  jest.doMock("@/lib/storage/feature-plan-store", () => ({
    getFeaturePlanById: jest.fn(async () => ({
      id: "runner-plan",
      projectId: "l5-task-xyz",
      title: "[L5] Test feature",
      tasks: [{ id: "runner-task", title: "Implement", status: "planned", generatedPrompt: "do it" }],
    })),
    updatePlanTaskStatus,
  }));
  jest.doMock("@/lib/storage/cto-task-metadata-store", () => ({
    listCTOTaskMetadataByPlan: jest.fn(async () => []),
  }));
  jest.doMock("@/lib/storage/json-store", () => ({
    getProjects: jest.fn(async () => [{ id: "l5-task-xyz", path: root }]),
  }));
  jest.doMock("@/lib/orchestration/approval-token-store", () => ({
    validateAndConsumeApprovalToken: jest.fn(() => ({
      planId: "runner-plan",
      taskId: "runner-task",
      agent: "claude-code",
      cwd: root,
    })),
  }));
  jest.doMock("@/lib/runner/file-boundary", () => ({
    collectChangedFiles: jest.fn(() => opts.changedFiles),
    countModifiedExistingFiles: jest.fn(
      () => (opts as { modifiedExisting?: number }).modifiedExisting ?? 0,
    ),
    checkFileBoundaries: jest.fn(() =>
      opts.boundaryViolation
        ? {
            hasViolation: true,
            forbiddenFiles: ["secret.env"],
            reason: "touched forbidden file",
            nextAction: "revert",
          }
        : { hasViolation: false, forbiddenFiles: [], reason: "", nextAction: "" },
    ),
    extractFileBoundariesFromPrompt: jest.fn(() => ({ allowedFiles: [], doNotTouchFiles: [] })),
  }));
  jest.doMock("@/lib/agents/runtime-registry", () => ({
    getAgentRuntime: jest.fn(() => ({ id: "claude-code", status: "available_verified" })),
  }));
  jest.doMock("@/lib/agents/quota-parser", () => ({
    parseQuotaError: jest.fn(() => null),
    applyQuotaParseResult: jest.fn(),
  }));
  jest.doMock("@/lib/storage/runtime-decision-store", () => ({
    updateRuntimeDecisionStatus: jest.fn(async () => {}),
  }));
  jest.doMock("@/lib/monitor/hermes-packet-notifier", () => ({
    notifyExecutionResult: jest.fn(async () => {}),
  }));
  jest.doMock("@/lib/workspace/workspace-store", () => ({
    updateWorkspaceStatus: jest.fn(async () => {}),
    addChangedFile: jest.fn(async () => {}),
  }));
  jest.doMock("@/lib/workspace/workspace-resolver", () => ({
    resolveWorkspace: jest.fn(async () => ({ id: "ws-1" })),
  }));
  jest.doMock("@/lib/agents/dangerous-command-detector", () => ({
    detectDangerousCommand: jest.fn(() => ({ isDangerous: false })),
  }));
  jest.doMock("@/lib/agents/action-envelope", () => ({
    createActionEnvelope: jest.fn(() => ({ id: "env-1" })),
    verifyActionEnvelopeExecution: jest.fn(),
  }));
  jest.doMock("@/lib/agents/action-envelope-store", () => ({
    saveActionEnvelope: jest.fn(async () => {}),
    getActionEnvelope: jest.fn(async () => undefined),
  }));
  jest.doMock("@/lib/storage/subagent-memory-store", () => ({
    writeSubagentPerformanceRecord: jest.fn(async () => {}),
  }));

  // Capture the L5 callback fired at finalize.
  const callbacks: CapturedCallback[] = [];
  const realFetch = global.fetch;
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const u = typeof url === "string" ? url : url.toString();
    if (u.endsWith("/api/agent:taskCallback")) {
      callbacks.push(JSON.parse(init!.body as string));
      return new Response("{}", { status: 200 });
    }
    return new Response("{}", { status: 200 });
  }) as unknown as typeof fetch;

  const route = await import("@/app/api/runner/route");
  const restore = () => { global.fetch = realFetch; };
  return { POST: route.POST, updatePlanTaskStatus, commitAll, callbacks, restore };
}

function runnerRequest() {
  return new Request("http://localhost/api/runner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId: "runner-plan",
      taskId: "runner-task",
      prompt: "approved prompt",
      cwd: root,
      agent: "claude-code",
      approvalToken: "appr-test-token",
    }),
  });
}

/** Drain the SSE stream so the async finalize work completes before assertions. */
async function drain(res: Response): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done } = await reader.read();
    if (done) break;
  }
}

function lastStatus(mock: jest.Mock): string {
  const calls = mock.mock.calls;
  return calls[calls.length - 1][2] as string;
}

test("clean success (exit 0 + file changes) → PlanTask done, L5 callback all_done, commit fired", async () => {
  const { POST, updatePlanTaskStatus, commitAll, callbacks, restore } = await loadRoute({
    verify: { exitCode: 0, attempts: 1, emptyOutput: false, changedCount: 1 },
    changedFiles: ["src/a.ts"],
  });
  try {
    await drain(await POST(runnerRequest()));
    expect(lastStatus(updatePlanTaskStatus)).toBe("done");
    expect(commitAll).toHaveBeenCalledTimes(1);
    expect(callbacks).toHaveLength(1);
    expect(callbacks[0].status).toBe("all_done"); // single task → whole plan done
    expect(callbacks[0].exit_code).toBe(0);
  } finally {
    restore();
  }
});

test("hard failure (exit ≠ 0) → PlanTask blocked, L5 callback failed, no commit", async () => {
  const { POST, updatePlanTaskStatus, commitAll, callbacks, restore } = await loadRoute({
    verify: { exitCode: 1, attempts: 1, emptyOutput: false, changedCount: 0 },
    changedFiles: [],
  });
  try {
    await drain(await POST(runnerRequest()));
    expect(lastStatus(updatePlanTaskStatus)).toBe("blocked");
    expect(commitAll).not.toHaveBeenCalled();
    expect(callbacks[0].status).toBe("failed");
  } finally {
    restore();
  }
});

test("empty output (exit 0, no changes) → PlanTask needs_review, L5 callback empty_output", async () => {
  const { POST, updatePlanTaskStatus, commitAll, callbacks, restore } = await loadRoute({
    verify: { exitCode: 0, attempts: 1, emptyOutput: true, changedCount: 0 },
    changedFiles: [],
  });
  try {
    await drain(await POST(runnerRequest()));
    expect(lastStatus(updatePlanTaskStatus)).toBe("needs_review");
    expect(commitAll).not.toHaveBeenCalled();
    expect(callbacks[0].status).toBe("empty_output");
  } finally {
    restore();
  }
});

test("boundary violation → PlanTask needs_review, L5 callback blocked, no commit", async () => {
  const { POST, updatePlanTaskStatus, commitAll, callbacks, restore } = await loadRoute({
    verify: { exitCode: 0, attempts: 1, emptyOutput: false, changedCount: 1 },
    changedFiles: ["secret.env"],
    boundaryViolation: true,
  });
  try {
    await drain(await POST(runnerRequest()));
    expect(lastStatus(updatePlanTaskStatus)).toBe("needs_review");
    expect(commitAll).not.toHaveBeenCalled();
    expect(callbacks[0].status).toBe("blocked");
  } finally {
    restore();
  }
});
