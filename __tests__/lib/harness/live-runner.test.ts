/**
 * live-runner — maps ExecutionRun → HarnessInput and drives the real harness
 * pipeline with injected mocks (no real CLI spawn). Verifies the missing wire
 * between the execution-runs API and runHarness.
 */

import {
  executionModeToHarnessMode,
  verificationProfileForComplexity,
  executionRunToHarnessInput,
  triggerHarnessRun,
} from "@/lib/harness/live-runner";
import type { ExecutionRun } from "@/lib/execution-run/types";
import { createExecutionRun, getExecutionRun } from "@/lib/storage/execution-run-store";
import type { AgentRunResult } from "@/lib/harness/harness-pipeline";
import type { CommandRunResult } from "@/lib/harness/verification-runner";

describe("executionModeToHarnessMode", () => {
  it("maps each execution mode to its harness rail", () => {
    expect(executionModeToHarnessMode("safe_solo")).toBe("safe_solo");
    expect(executionModeToHarnessMode("implement_verify")).toBe("standard");
    expect(executionModeToHarnessMode("strict_sandbox")).toBe("strict");
    expect(executionModeToHarnessMode("parallel_patch_queue")).toBe("parallel_patch");
  });
});

describe("verificationProfileForComplexity", () => {
  it("boundary is always on", () => {
    (["C0", "C1", "C2", "C3", "C4", "C5"] as const).forEach((c) => {
      expect(verificationProfileForComplexity(c).boundary).toBe(true);
    });
  });
  it("C0 runs boundary only; heavier complexity adds gates", () => {
    expect(verificationProfileForComplexity("C0")).toMatchObject({
      typecheck: false,
      test: false,
      build: false,
    });
    expect(verificationProfileForComplexity("C2")).toMatchObject({
      typecheck: true,
      test: true,
    });
    expect(verificationProfileForComplexity("C5")).toMatchObject({
      typecheck: true,
      lint: true,
      test: true,
      build: true,
    });
  });
});

describe("executionRunToHarnessInput", () => {
  it("copies run fields and resolves mode + profile + empty context pack", () => {
    const run = {
      id: "run-1",
      taskId: "task-1",
      repoPath: "/repo",
      baseBranch: "main",
      agent: "claude-code",
      prompt: "do the thing",
      acceptanceCriteria: ["builds"],
      allowedFiles: ["src/a.ts"],
      blockedFiles: [".env"],
      complexity: "C2",
      mode: "implement_verify",
    } as unknown as ExecutionRun;

    const input = executionRunToHarnessInput(run);
    expect(input.runId).toBe("run-1");
    expect(input.mode).toBe("standard");
    expect(input.verificationProfile.test).toBe(true);
    expect(input.allowedFiles).toEqual(["src/a.ts"]);
    expect(input.contextPack).toEqual({ globalRules: [], pathRules: [], docsIndex: [] });
  });
});

describe("triggerHarnessRun (injected mocks, no CLI)", () => {
  it("rejects non-runner agents (hermes)", async () => {
    const run = { id: "r", taskId: "t", agent: "hermes" } as unknown as ExecutionRun;
    await expect(triggerHarnessRun(run)).rejects.toThrow(/not a CLI runner agent/);
  });

  it("drives the full pipeline to a settled status with injected agent+command runners", async () => {
    // A real stored run so the pipeline can load/patch it.
    const created = await createExecutionRun({
      taskId: "live-task",
      repoPath: "/tmp/does-not-matter",
      baseBranch: "main",
      agent: "claude-code",
      prompt: "implement X",
      complexity: "C1",
      mode: "safe_solo",
    });

    const agentRunner = jest.fn(
      async (): Promise<AgentRunResult> => ({ log: "agent ran", proposedCommands: [] }),
    );
    const commandRunner = jest.fn(
      async (): Promise<CommandRunResult> => ({ exitCode: 0, output: "ok" }),
    );

    // Inject worktree seams via deps so no real git/worktree is touched.
    const out = await triggerHarnessRun(created, {
      agentRunner,
      commandRunner,
      deps: {
        provisionWorktree: async (r) => ({ ...r, worktreePath: "/tmp/wt", runBranch: "agent/x" }),
        finalizeDiff: async (r) => ({
          run: {
            ...r,
            worktreePath: "/tmp/wt",
            changedFiles: ["src/x.ts"],
            diffStat: "1 file",
            checks: { ...r.checks, boundary: "pass" },
          },
          boundaryViolation: false,
          violations: [],
        }),
        writeHandoff: async () => ({ handoffDir: "/tmp/handoff" }) as never,
      },
    });

    expect(agentRunner).toHaveBeenCalledTimes(1);
    expect(out.runId).toBe(created.id);
    expect(out.status).toBe("passed");

    const settled = await getExecutionRun(created.id);
    expect(settled?.status).toBe("passed");
  });
});
