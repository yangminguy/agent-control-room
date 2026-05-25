/**
 * Tests for lib/orchestration/subagent-team-composer.ts
 *
 * No real execution happens — invokeSubagent is always a jest mock.
 * The in-memory team store is reset before each test via globalThis.
 */

import type { SubagentSpec, AgentTeamPlan } from "@/lib/orchestration/subagent-types";
import {
  composeTeam,
  getTeamForTask,
  updateTeamStatus,
  validateTeamComposition,
  executeTeamSequentially,
  executeTeamParallel,
} from "@/lib/orchestration/subagent-team-composer";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function resetStore(): void {
  const g = globalThis as typeof globalThis & {
    __agentTeamPlanStore?: Map<string, AgentTeamPlan & { status: string }>;
  };
  if (g.__agentTeamPlanStore) {
    g.__agentTeamPlanStore.clear();
  }
}

function makeSpec(id: string, allowedFiles: string[] = ["lib/orchestration/**"]): SubagentSpec {
  return {
    id,
    name: `Spec ${id}`,
    parentAgent: "claude-code",
    runtimePreference: "claude-direct",
    role: "Test role",
    bestFor: ["testing"],
    notFor: [],
    allowedFiles,
    blockedFiles: [".env"],
    allowedCommands: ["pnpm typecheck"],
    blockedCommands: ["git push"],
    promptTemplatePath: `templates/${id}.md`,
    obsidianPath: `subagents/${id}`,
    source: "builtin",
    successCount: 0,
    failureCount: 0,
    status: "active",
    securityReport: { level: "clean", message: "pre-validated" },
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  resetStore();
});

// ---------------------------------------------------------------------------
// composeTeam
// ---------------------------------------------------------------------------

describe("composeTeam", () => {
  it("creates a team plan with a UUID id", () => {
    const result = composeTeam("task-001", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [makeSpec("spec-a")],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      );
      expect(result.data.taskId).toBe("task-001");
    }
  });

  it("sets createdAt to an ISO 8601 timestamp", () => {
    const result = composeTeam("task-002", {
      parentAgent: "codex",
      teamMode: "single_subagent",
      subagents: [makeSpec("spec-b")],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(new Date(result.data.createdAt).toISOString()).toBe(result.data.createdAt);
    }
  });

  it("returns error for empty subagents array", () => {
    const result = composeTeam("task-003", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [],
    });
    expect(result.success).toBe(false);
  });

  it("blocks team containing a retired subagent", () => {
    const retired = makeSpec("spec-retired");
    retired.status = "retired";
    const result = composeTeam("task-004", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [retired],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/retired/i);
    }
  });

  it("blocks team containing a rejected-security subagent", () => {
    const badSpec = makeSpec("spec-bad");
    badSpec.securityReport = { level: "rejected", message: "dangerous" };
    const result = composeTeam("task-005", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [badSpec],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/rejected/i);
    }
  });

  it("derives hermesWatchRules from subagent specs", () => {
    const result = composeTeam("task-006", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [makeSpec("spec-c", ["lib/runner/**"])],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hermesWatchRules.length).toBeGreaterThan(0);
    }
  });

  it("merges caller-supplied hermesWatchRules with derived ones", () => {
    const result = composeTeam("task-007", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [makeSpec("spec-d")],
      hermesWatchRules: ["custom-rule: halt on panic"],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.hermesWatchRules).toContain("custom-rule: halt on panic");
    }
  });
});

// ---------------------------------------------------------------------------
// getTeamForTask
// ---------------------------------------------------------------------------

describe("getTeamForTask", () => {
  it("retrieves a composed team by taskId", () => {
    composeTeam("task-get-001", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [makeSpec("spec-e")],
    });
    const result = getTeamForTask("task-get-001");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.taskId).toBe("task-get-001");
    }
  });

  it("returns error for unknown taskId", () => {
    const result = getTeamForTask("nonexistent-task");
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateTeamStatus
// ---------------------------------------------------------------------------

describe("updateTeamStatus", () => {
  it("updates status to completed", () => {
    const composed = composeTeam("task-status-001", {
      parentAgent: "claude-code",
      teamMode: "single_subagent",
      subagents: [makeSpec("spec-f")],
    });
    expect(composed.success).toBe(true);
    if (!composed.success) return;

    const result = updateTeamStatus(composed.data.id, "completed");
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe("completed");
    }
  });

  it("returns error for unknown team id", () => {
    const result = updateTeamStatus("bad-id", "completed");
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// validateTeamComposition
// ---------------------------------------------------------------------------

describe("validateTeamComposition", () => {
  it("passes a team with non-overlapping files", () => {
    const team: AgentTeamPlan = {
      id: "team-val-001",
      taskId: "task-val-001",
      parentAgent: "claude-code",
      teamMode: "parallel_team",
      subagents: [
        makeSpec("spec-g", ["app/components/**"]),
        makeSpec("spec-h", ["lib/runner/**"]),
      ],
      coordinationStrategy: "parallel",
      handoffRules: [],
      monitoringRequired: true,
      hermesWatchRules: [],
      createdAt: new Date().toISOString(),
    };
    const result = validateTeamComposition(team);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.conflicts).toHaveLength(0);
    }
  });

  it("detects file conflicts between two subagents editing same path", () => {
    const team: AgentTeamPlan = {
      id: "team-val-002",
      taskId: "task-val-002",
      parentAgent: "claude-code",
      teamMode: "parallel_team",
      subagents: [
        makeSpec("spec-i", ["lib/orchestration"]),
        makeSpec("spec-j", ["lib/orchestration/types.ts"]),
      ],
      coordinationStrategy: "parallel",
      handoffRules: [],
      monitoringRequired: true,
      hermesWatchRules: [],
      createdAt: new Date().toISOString(),
    };
    const result = validateTeamComposition(team);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/conflict/i);
    }
  });

  it("fails when a retired subagent is in the team", () => {
    const retired = makeSpec("spec-retired-2", ["app/components/**"]);
    retired.status = "retired";
    const team: AgentTeamPlan = {
      id: "team-val-003",
      taskId: "task-val-003",
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [retired],
      coordinationStrategy: "sequential",
      handoffRules: [],
      monitoringRequired: true,
      hermesWatchRules: [],
      createdAt: new Date().toISOString(),
    };
    const result = validateTeamComposition(team);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// executeTeamSequentially
// ---------------------------------------------------------------------------

describe("executeTeamSequentially", () => {
  it("runs subagents in order and feeds output forward", async () => {
    const callOrder: string[] = [];
    const receivedInputs: Array<string | undefined> = [];

    const invoke = jest.fn().mockImplementation(
      async (spec: SubagentSpec, input: string | undefined) => {
        callOrder.push(spec.id);
        receivedInputs.push(input);
        return { ok: true, output: `output-of-${spec.id}` };
      }
    );

    const composed = composeTeam("task-seq-001", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [makeSpec("step-1"), makeSpec("step-2", ["app/components/**"])],
    });
    expect(composed.success).toBe(true);
    if (!composed.success) return;

    const result = await executeTeamSequentially(composed.data, invoke);
    expect(result.success).toBe(true);
    expect(callOrder).toEqual(["step-1", "step-2"]);
    // step-2 receives the output of step-1
    expect(receivedInputs[1]).toBe("output-of-step-1");
  });

  it("halts on first failure and marks remaining as skipped", async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ ok: false, error: "compilation failed" })
      .mockResolvedValue({ ok: true, output: "should not run" });

    const composed = composeTeam("task-seq-002", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [
        makeSpec("step-a"),
        makeSpec("step-b", ["app/components/**"]),
        makeSpec("step-c", ["public/**"]),
      ],
    });
    expect(composed.success).toBe(true);
    if (!composed.success) return;

    const result = await executeTeamSequentially(composed.data, invoke);
    expect(result.success).toBe(false);
    // Only step-a was invoked before failure
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("marks team status as completed on full success", async () => {
    const invoke = jest.fn().mockResolvedValue({ ok: true, output: "done" });

    const composed = composeTeam("task-seq-003", {
      parentAgent: "claude-code",
      teamMode: "sequential_team",
      subagents: [makeSpec("only-step")],
    });
    expect(composed.success).toBe(true);
    if (!composed.success) return;

    await executeTeamSequentially(composed.data, invoke);

    const teamResult = getTeamForTask("task-seq-003");
    expect(teamResult.success).toBe(true);
    if (teamResult.success) {
      expect(teamResult.data.status).toBe("completed");
    }
  });
});

// ---------------------------------------------------------------------------
// executeTeamParallel
// ---------------------------------------------------------------------------

describe("executeTeamParallel", () => {
  it("invokes all subagents concurrently (no input feed-forward)", async () => {
    const receivedInputs: Array<string | undefined> = [];
    const invoke = jest.fn().mockImplementation(
      async (_spec: SubagentSpec, input: string | undefined) => {
        receivedInputs.push(input);
        return { ok: true, output: "ok" };
      }
    );

    const composed = composeTeam("task-par-001", {
      parentAgent: "claude-code",
      teamMode: "parallel_team",
      subagents: [
        makeSpec("par-a", ["app/components/**"]),
        makeSpec("par-b", ["lib/runner/**"]),
      ],
    });
    expect(composed.success).toBe(true);
    if (!composed.success) return;

    const result = await executeTeamParallel(composed.data, invoke);
    expect(result.success).toBe(true);
    expect(invoke).toHaveBeenCalledTimes(2);
    // No feed-forward in parallel mode
    expect(receivedInputs.every((i) => i === undefined)).toBe(true);
  });

  it("blocks parallel execution when file conflicts exist", async () => {
    const invoke = jest.fn().mockResolvedValue({ ok: true });

    const conflictingTeam: AgentTeamPlan = {
      id: "team-par-conflict",
      taskId: "task-par-002",
      parentAgent: "claude-code",
      teamMode: "parallel_team",
      subagents: [
        makeSpec("par-c", ["lib/orchestration"]),
        makeSpec("par-d", ["lib/orchestration/subagent-registry.ts"]),
      ],
      coordinationStrategy: "parallel",
      handoffRules: [],
      monitoringRequired: true,
      hermesWatchRules: [],
      createdAt: new Date().toISOString(),
    };

    const result = await executeTeamParallel(conflictingTeam, invoke);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toMatch(/conflict/i);
    }
    expect(invoke).not.toHaveBeenCalled();
  });

  it("returns success=false but collects all results when a subagent fails", async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ ok: true, output: "good" })
      .mockResolvedValueOnce({ ok: false, error: "crashed" });

    const composed = composeTeam("task-par-003", {
      parentAgent: "claude-code",
      teamMode: "parallel_team",
      subagents: [
        makeSpec("par-e", ["app/components/**"]),
        makeSpec("par-f", ["public/**"]),
      ],
    });
    expect(composed.success).toBe(true);
    if (!composed.success) return;

    const result = await executeTeamParallel(composed.data, invoke);
    expect(result.success).toBe(false);
    // Both were still invoked (parallel — no early halt)
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});
