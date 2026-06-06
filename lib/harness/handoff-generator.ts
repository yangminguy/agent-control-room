/**
 * Harness Handoff generator — ACR Agent Execution Harness (PRD §15).
 *
 * After a harness run settles, we write a self-contained handoff folder so the
 * next agent (or a human) can pick the work up without re-reading the whole
 * session. The layout mirrors PRD §15.2 exactly:
 *
 *   .handoff/runs/{run_id}/
 *     FEATURE.md  SPEC.md  DESIGN.md  DECISIONS.md  STATE.md  SESSION.md
 *     result.json  diff.patch  log.txt
 *
 * This module is pure I/O + string templating: it does NOT run the agent,
 * verification, or git. It only serialises the already-computed run +
 * result packet into the handoff artifacts. The output root is injectable so
 * tests can isolate to os.tmpdir().
 */

import fs from "fs/promises";
import path from "path";

import type { ExecutionRun, ExecutionResultPacket } from "@/lib/execution-run/types";

// ─── inputs ──────────────────────────────────────────────────────────────────

export type HandoffPayload = {
  /** Full unified diff of the run's changes (worktree diff). */
  diff: string;
  /** Raw agent + verification log. */
  log: string;
};

export type HandoffOptions = {
  /**
   * Root directory under which `.handoff/runs/{run_id}/` is created. Defaults
   * to the repo path recorded on the run; tests inject an os.tmpdir() path.
   */
  outputRoot?: string;
};

export type HandoffResult = {
  /** Absolute path to `.handoff/runs/{run_id}/`. */
  handoffDir: string;
  /** Absolute paths of every file written, in write order. */
  files: string[];
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function bulletList(items: string[], emptyLabel: string): string {
  if (!items || items.length === 0) return `- (${emptyLabel})`;
  return items.map((i) => `- ${i}`).join("\n");
}

function checkLines(checks: ExecutionRun["checks"]): string {
  const order: Array<keyof ExecutionRun["checks"]> = [
    "typecheck",
    "lint",
    "test",
    "build",
    "playwright",
    "boundary",
  ];
  const lines = order
    .filter((k) => checks[k] !== undefined)
    .map((k) => `- ${k}: ${checks[k]}`);
  return lines.length > 0 ? lines.join("\n") : "- (no checks recorded)";
}

// ─── document templates (PRD §15.2 / §15.3 / §15.4) ──────────────────────────

function featureMd(run: ExecutionRun): string {
  return `# FEATURE

## Task
- task_id: ${run.taskId}
- run_id: ${run.id}
- agent: ${run.agent}

## Goal
${run.prompt.trim() || "(no prompt recorded)"}

## Acceptance Criteria
${bulletList(run.acceptanceCriteria, "none recorded")}
`;
}

function specMd(run: ExecutionRun): string {
  return `# SPEC

## Scope
- complexity: ${run.complexity}
- mode: ${run.mode}${run.riskLevel ? `\n- risk_level: ${run.riskLevel}` : ""}

## Allowed Files
${bulletList(run.allowedFiles, "no allow-list — full repo")}

## Blocked Files
${bulletList(run.blockedFiles, "no explicit block-list")}
`;
}

function designMd(run: ExecutionRun): string {
  return `# DESIGN

## Approach
${run.resultSummary?.trim() || "(no design summary recorded)"}

## Changed Files
${bulletList(run.changedFiles, "no files changed")}
`;
}

function decisionsMd(run: ExecutionRun, packet: ExecutionResultPacket): string {
  return `# DECISIONS

## Outcome
- status: ${packet.status}
- recommendation: ${packet.recommendation}

## Rationale
${packet.summary.trim() || run.resultSummary?.trim() || "(no rationale recorded)"}

## Next Action
${packet.nextAction.trim() || run.nextAction?.trim() || "(none)"}
`;
}

function stateMd(run: ExecutionRun, packet: ExecutionResultPacket): string {
  return `# STATE

## Run
- run_id: ${run.id}
- task_id: ${run.taskId}
- agent: ${run.agent}
- branch: ${run.runBranch ?? "(no run branch)"}
- worktree: ${run.worktreePath ?? "(no worktree)"}

## Changed Files
${bulletList(run.changedFiles, "no files changed")}

## Checks
${checkLines(run.checks)}

## Current Status
${packet.status}. ${packet.nextAction.trim() || run.nextAction?.trim() || ""}
`.trimEnd() + "\n";
}

function sessionMd(run: ExecutionRun, packet: ExecutionResultPacket): string {
  const verified = checkLines(run.checks);
  return `# SESSION

다음 세션은 아래에서 시작한다.

## Context
${packet.summary.trim() || run.resultSummary?.trim() || "(no context recorded)"}

## Verified
${verified}

## Next Action
${packet.nextAction.trim() || run.nextAction?.trim() || "(none)"}

## Do Not Touch
- .env
- lock files
- node_modules
- .git
- database migration files
`;
}

// ─── main ────────────────────────────────────────────────────────────────────

/**
 * Write the 9 handoff artifacts for a settled run into
 * `{outputRoot}/.handoff/runs/{run_id}/`. Returns the directory and the list
 * of files written. Idempotent: re-running overwrites the artifacts.
 */
export async function generateHandoff(
  run: ExecutionRun,
  resultPacket: ExecutionResultPacket,
  payload: HandoffPayload,
  options: HandoffOptions = {},
): Promise<HandoffResult> {
  const root = options.outputRoot ?? run.repoPath;
  const handoffDir = path.join(root, ".handoff", "runs", run.id);
  await fs.mkdir(handoffDir, { recursive: true });

  // Ordered so the markdown narrative reads top-to-bottom, then raw artifacts.
  const docs: Array<[string, string]> = [
    ["FEATURE.md", featureMd(run)],
    ["SPEC.md", specMd(run)],
    ["DESIGN.md", designMd(run)],
    ["DECISIONS.md", decisionsMd(run, resultPacket)],
    ["STATE.md", stateMd(run, resultPacket)],
    ["SESSION.md", sessionMd(run, resultPacket)],
    ["result.json", JSON.stringify(resultPacket, null, 2) + "\n"],
    ["diff.patch", payload.diff.endsWith("\n") || payload.diff === "" ? payload.diff : payload.diff + "\n"],
    ["log.txt", payload.log.endsWith("\n") || payload.log === "" ? payload.log : payload.log + "\n"],
  ];

  const files: string[] = [];
  for (const [name, content] of docs) {
    const filePath = path.join(handoffDir, name);
    await fs.writeFile(filePath, content, "utf8");
    files.push(filePath);
  }

  return { handoffDir, files };
}
