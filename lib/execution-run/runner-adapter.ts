/**
 * Runner Adapter — ACR Kernel
 *
 * Thin adapter that maps an ExecutionRun onto the EXISTING ACR runner concept.
 * It does NOT replace or modify /api/runner, lib/runner/*, or lib/workspace/*.
 * Its only job is to translate the new execution-runs contract into the fields
 * the existing runner already understands, so the new API can sit on top of the
 * current runner as a thin layer (adapter-first refactor, PRD §4.2/§22).
 *
 * Execution itself (spawning the CLI, worktree, verification) remains the
 * responsibility of the existing runner/daemon. This module only prepares the
 * connection fields and preserves them on the run.
 */

import type { ExecutionAgent, ExecutionRun } from "@/lib/execution-run/types";

/** Agents the existing local CLI runner actually supports. */
export type RunnerAgent = "claude-code" | "codex" | "antigravity";

const RUNNER_AGENTS = new Set<RunnerAgent>(["claude-code", "codex", "antigravity"]);

/**
 * hermes는 코드를 수정하지 않는 감시 에이전트라 CLI runner 대상이 아니다(PRD §19.3).
 * runner로 넘길 수 있는 에이전트인지 판별한다.
 */
export function isRunnerAgent(agent: ExecutionAgent): agent is RunnerAgent {
  return RUNNER_AGENTS.has(agent as RunnerAgent);
}

/**
 * 기존 runner 호출부와 연결 가능한 필드 묶음. /api/runner와 /api/runner/prepare가
 * 받는 입력(taskId, agent, cwd, prompt, branchName)과 1:1 대응된다.
 */
export type RunnerConnection = {
  taskId: string;
  agent: RunnerAgent;
  /** 기존 runner의 `cwd` — worktree가 있으면 그쪽을, 없으면 repoPath를 쓴다. */
  cwd: string;
  prompt: string;
  /** 기존 runner의 branch 개념(= runBranch). */
  branchName: string;
};

/**
 * ExecutionRun → 기존 runner 입력 변환. runner가 다룰 수 없는 에이전트(hermes)는
 * null을 반환한다(호출부에서 needs_approval/blocked 등으로 분기).
 */
export function toRunnerConnection(run: ExecutionRun): RunnerConnection | null {
  if (!isRunnerAgent(run.agent)) return null;
  return {
    taskId: run.taskId,
    agent: run.agent,
    cwd: run.worktreePath || run.repoPath,
    prompt: run.prompt,
    branchName: run.runBranch || `agent/${run.taskId}-${run.id}`,
  };
}
