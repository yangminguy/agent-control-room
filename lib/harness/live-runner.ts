/**
 * Live Runner — wires the harness pipeline's injectable seams (AgentRunner /
 * CommandRunner) to the REAL local CLI + shell, and maps an ExecutionRun onto a
 * HarnessInput (PRD §14.5).
 *
 * This is the one missing wire between the execution-runs API (which only stored
 * a `queued` run) and actual execution: `triggerHarnessRun(run)` runs the full
 * 14-step `runHarness` pipeline with production deps. It is ADDITIVE — it does
 * not modify /api/runner, lib/runner/* or harness-pipeline.ts; it only reuses
 * their building blocks:
 *
 *   - AgentRunner  → lib/runner/spawn-runner.spawnAgent (the same CLI spawn the
 *                    legacy /api/runner uses), scoped to the run's worktree.
 *   - CommandRunner→ child_process spawn in the worktree (verification step).
 *
 * The agent CLI does its own edits inside the worktree; the harness then runs
 * diff + boundary + verification and settles the run. Guarded behind
 * `ACR_EXECUTION_TRIGGER=on` at the call site so the default stays inert.
 */

import { spawn } from "child_process";
import type {
  ExecutionComplexity,
  ExecutionMode,
  ExecutionRun,
} from "@/lib/execution-run/types";
import type {
  HarnessInput,
  HarnessMode,
  HarnessOutput,
  VerificationProfile,
} from "@/lib/harness/types";
import {
  runHarness,
  type AgentRunResult,
  type AgentRunner,
  type HarnessDeps,
} from "@/lib/harness/harness-pipeline";
import type {
  CommandRunner,
  CommandRunResult,
} from "@/lib/harness/verification-runner";
import { spawnAgent, DEFAULT_AGENT_TIMEOUT_MS } from "@/lib/runner/spawn-runner";
import { toRunnerConnection, isRunnerAgent } from "@/lib/execution-run/runner-adapter";

// ─── ExecutionMode → HarnessMode ─────────────────────────────────────────────

/** PRD §6/§14.4 — execution mode rail → harness mode rail. */
export function executionModeToHarnessMode(mode: ExecutionMode): HarnessMode {
  switch (mode) {
    case "safe_solo":
      return "safe_solo";
    case "implement_verify":
      return "standard";
    case "strict_sandbox":
      return "strict";
    case "parallel_patch_queue":
      return "parallel_patch";
  }
}

// ─── complexity → verification profile ───────────────────────────────────────

/**
 * Minimal verification profile per complexity (PRD §13). Boundary always on.
 * Heavier complexity asks for more gates; playwright stays opt-in (UI work
 * supplies its own profile via the API in a later pass).
 */
export function verificationProfileForComplexity(
  c: ExecutionComplexity,
): VerificationProfile {
  const base: VerificationProfile = {
    typecheck: false,
    lint: false,
    test: false,
    build: false,
    playwright: false,
    boundary: true,
  };
  switch (c) {
    case "C0":
      return base; // doc/research — boundary only
    case "C1":
      return { ...base, typecheck: true };
    case "C2":
      return { ...base, typecheck: true, test: true };
    case "C3":
      return { ...base, typecheck: true, test: true, build: true };
    case "C4":
    case "C5":
      return { ...base, typecheck: true, lint: true, test: true, build: true };
  }
}

// ─── ExecutionRun → HarnessInput ─────────────────────────────────────────────

/**
 * Map a stored ExecutionRun onto the HarnessInput contract. contextPack is left
 * empty; the pipeline fills it from `contextSelection` (§14.7) when provided.
 */
export function executionRunToHarnessInput(run: ExecutionRun): HarnessInput {
  return {
    runId: run.id,
    taskId: run.taskId,
    repoPath: run.repoPath,
    baseBranch: run.baseBranch,
    agent: run.agent,
    prompt: run.prompt,
    acceptanceCriteria: run.acceptanceCriteria,
    allowedFiles: run.allowedFiles,
    blockedFiles: run.blockedFiles,
    complexity: run.complexity,
    mode: executionModeToHarnessMode(run.mode),
    verificationProfile: verificationProfileForComplexity(run.complexity),
    contextPack: { globalRules: [], pathRules: [], docsIndex: [] },
  };
}

// ─── live AgentRunner (real CLI via lib/runner/spawn-runner) ──────────────────

export type LiveAgentRunnerOptions = {
  /** Hard wall-clock per agent run; defaults to the runner's env-configured limit. */
  timeoutMs?: number;
};

/**
 * Production AgentRunner: spawns the real local CLI (claude/codex/antigravity)
 * inside the run's worktree via the SAME `spawnAgent` the legacy runner uses,
 * and returns its combined log. Non-runner agents (hermes) never reach here —
 * the trigger filters them out — but we guard defensively.
 */
export function createLiveAgentRunner(
  opts: LiveAgentRunnerOptions = {},
): AgentRunner {
  return (run: ExecutionRun): Promise<AgentRunResult> => {
    const conn = toRunnerConnection(run);
    if (!conn) {
      return Promise.resolve({
        log: `[live-runner] agent '${run.agent}' is not a CLI runner agent; nothing spawned`,
      });
    }
    return new Promise<AgentRunResult>((resolve) => {
      const lines: string[] = [];
      let settled = false;
      const done = (result: AgentRunResult) => {
        if (settled) return;
        settled = true;
        resolve(result);
      };
      void spawnAgent({
        agent: conn.agent,
        prompt: conn.prompt,
        cwd: conn.cwd,
        timeoutMs: opts.timeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS,
        onLog: (line) => lines.push(line),
        onComplete: (exitCode) =>
          done({ log: `${lines.join("\n")}\n[exit ${exitCode}]` }),
      }).catch((err) => {
        const reason = err instanceof Error ? err.message : String(err);
        done({ log: `${lines.join("\n")}\n[live-runner spawn error] ${reason}` });
      });
    });
  };
}

// ─── live CommandRunner (verification shell in the worktree) ──────────────────

const DEFAULT_VERIFY_TIMEOUT_MS = (() => {
  const n = Number(process.env.ACR_VERIFY_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 10 * 60 * 1000;
})();

/**
 * Production CommandRunner for the verification step: runs the check command in
 * a shell scoped to `cwd` (the worktree) and returns exitCode + combined output.
 * A timeout kills the child and reports exit 124 (conventional timeout code).
 */
export function createLiveCommandRunner(
  timeoutMs = DEFAULT_VERIFY_TIMEOUT_MS,
): CommandRunner {
  return (command: string, cwd: string): Promise<CommandRunResult> =>
    new Promise<CommandRunResult>((resolve) => {
      let output = "";
      let settled = false;
      const child = spawn(command, {
        cwd,
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      });
      const finish = (exitCode: number) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve({ exitCode, output });
      };
      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        setTimeout(() => child.kill("SIGKILL"), 3000).unref?.();
        output += `\n[verify timeout after ${timeoutMs}ms]`;
        finish(124);
      }, timeoutMs);
      timer.unref?.();
      child.stdout?.on("data", (d) => (output += d.toString()));
      child.stderr?.on("data", (d) => (output += d.toString()));
      child.on("error", (err) => {
        output += `\n[spawn error] ${err.message}`;
        finish(1);
      });
      child.on("close", (code) => finish(code ?? 1));
    });
}

// ─── trigger ─────────────────────────────────────────────────────────────────

export type TriggerHarnessRunOptions = {
  agentRunner?: AgentRunner;
  commandRunner?: CommandRunner;
  agentTimeoutMs?: number;
  verifyTimeoutMs?: number;
  /** Override worktree/store/handoff seams (tests inject mocks). */
  deps?: Partial<HarnessDeps>;
};

/**
 * Run the full harness pipeline for one stored ExecutionRun with production
 * deps. Resolves with the settled HarnessOutput. The caller decides whether to
 * await (tests) or fire-and-forget (API). Non-runner agents are rejected so the
 * caller can branch to needs_approval/blocked.
 */
export async function triggerHarnessRun(
  run: ExecutionRun,
  opts: TriggerHarnessRunOptions = {},
): Promise<HarnessOutput> {
  if (!isRunnerAgent(run.agent)) {
    throw new Error(
      `triggerHarnessRun: agent '${run.agent}' is not a CLI runner agent`,
    );
  }
  const input = executionRunToHarnessInput(run);
  return runHarness(input, {
    agentRunner:
      opts.agentRunner ??
      createLiveAgentRunner(
        opts.agentTimeoutMs ? { timeoutMs: opts.agentTimeoutMs } : {},
      ),
    commandRunner: opts.commandRunner ?? createLiveCommandRunner(opts.verifyTimeoutMs),
    ...(opts.deps ? { deps: opts.deps } : {}),
  });
}
