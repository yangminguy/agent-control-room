/**
 * Harness Pipeline — ACR Agent Execution Harness (PRD §14.3).
 *
 * runHarness(input) executes the 14-step pipeline that wraps a single agent run
 * with workspace isolation, command guard, verification and boundary checks,
 * then standardises the outcome into a Result Packet (§16) and Handoff (§15):
 *
 *    1. Validate Work Order
 *    2. Select Context Pack
 *    3. Check Approval Requirement
 *    4. Select Harness Mode (rail)
 *    5. Create Workspace (worktree)
 *    6. Apply Command Guard
 *    7. Run Agent Adapter
 *    8. Collect Logs
 *    9. Collect Diff
 *   10. Run Verification
 *   11. Check Boundary
 *   12. Generate Result Packet
 *   13. Generate Handoff
 *   14. Return Result to pulk CTO
 *
 * This module is pure ORCHESTRATION. It reuses the already-committed building
 * blocks (worktree-manager / run-worktree, command-guard, verification-runner,
 * boundary-check via run-worktree, execution-run-store, handoff-generator) and
 * adds no new policy. It does NOT modify /api/runner, lib/runner/*,
 * lib/workspace/* or lib/qa/*.
 *
 * The real agent CLI is abstracted behind an injectable `AgentRunner` so tests
 * drive the whole pipeline with a mock; the verification command runner is the
 * existing injectable `CommandRunner`. Every step that touches the run store /
 * worktree is reached through the committed run-worktree helpers, so status
 * transitions stay in one place.
 */

import type {
  ExecutionRun,
  ExecutionResultPacket,
  ExecutionRecommendation,
} from "@/lib/execution-run/types";
import {
  getExecutionRun,
  updateExecutionRun,
} from "@/lib/storage/execution-run-store";
import {
  provisionWorktreeForRun,
  finalizeRunDiff,
} from "@/lib/worktree/run-worktree";
import { collectDiff } from "@/lib/worktree/worktree-manager";
import {
  checkCommands,
  type CommandCheck,
} from "@/lib/harness/command-guard";
import {
  runVerification,
  type CommandRunner,
  type VerifiableCheck,
} from "@/lib/harness/verification-runner";
import {
  generateHandoff,
  type HandoffOptions,
} from "@/lib/harness/handoff-generator";
import type {
  HarnessInput,
  HarnessMode,
  HarnessOutput,
  HarnessStatus,
  VerificationProfile,
} from "@/lib/harness/types";
import {
  selectContextPack,
  type SelectContextPackInput,
} from "@/lib/harness/context-harness";

// ─── injectable agent runner ─────────────────────────────────────────────────

/**
 * Output of the agent CLI run inside the worktree. The harness never inspects
 * *how* the agent ran — only its log and any commands it intends to execute
 * (so the command guard can veto them before they touch the runner).
 */
export type AgentRunResult = {
  /** Combined stdout+stderr of the agent run (collected into log.txt). */
  log: string;
  /**
   * Shell commands the agent proposed to run. The harness passes these through
   * the command guard (step 6). Empty when the agent ran no guardable command.
   */
  proposedCommands?: string[];
};

/**
 * Injectable agent adapter. Production wiring delegates to the existing runner
 * (lib/runner/* via runner-adapter) inside `run.worktreePath`; tests inject a
 * mock. Kept intentionally thin — the harness owns orchestration, not the CLI.
 */
export type AgentRunner = (run: ExecutionRun) => Promise<AgentRunResult>;

// ─── injectable dependencies (for test isolation) ────────────────────────────

/**
 * Pipeline dependencies. All are injectable so the integration test can run on
 * a real temp repo with a mock agent + mock command runner, never spawning a
 * real CLI. Defaults wire the committed production modules.
 */
export type HarnessDeps = {
  /** Provision an isolated worktree for the run. */
  provisionWorktree: typeof provisionWorktreeForRun;
  /** Collect diff + boundary check and persist the outcome. */
  finalizeDiff: typeof finalizeRunDiff;
  /** Load the run record. */
  loadRun: typeof getExecutionRun;
  /** Patch the run record. */
  patchRun: typeof updateExecutionRun;
  /** Agent CLI adapter (mocked in tests). */
  agentRunner: AgentRunner;
  /** Verification command runner (mocked in tests). */
  commandRunner: CommandRunner;
  /** Handoff writer. */
  writeHandoff: typeof generateHandoff;
};

const DEFAULT_DEPS: Omit<HarnessDeps, "agentRunner" | "commandRunner"> = {
  provisionWorktree: provisionWorktreeForRun,
  finalizeDiff: finalizeRunDiff,
  loadRun: getExecutionRun,
  patchRun: updateExecutionRun,
  writeHandoff: generateHandoff,
};

// ─── pipeline options ────────────────────────────────────────────────────────

export type RunHarnessOptions = {
  /** Required: the agent adapter to execute the work order. */
  agentRunner: AgentRunner;
  /** Required: command runner used by the verification step. */
  commandRunner: CommandRunner;
  /** Optional dependency overrides (worktree / store / handoff). */
  deps?: Partial<HarnessDeps>;
  /** Per-check command overrides for verification (defaults to pnpm scripts). */
  verificationCommands?: Partial<Record<VerifiableCheck, string>>;
  /** Where to write the handoff folder (defaults to the run's repoPath). */
  handoff?: HandoffOptions;
  /**
   * Approval gate. When the resolved mode requires approval and this returns
   * false, the run settles as `needs_approval` before any agent runs (§14.3
   * step 3). Defaults to "approved" so direct/safe/standard rails are
   * non-interactive.
   */
  isApproved?: (input: HarnessInput) => boolean;
  /**
   * §14.7 Context Harness. When set, step 2 resolves the minimal context pack
   * for this work type/domain via selectContextPack and uses it to fill an
   * EMPTY input.contextPack (a pack already provided by pulk CTO is respected).
   */
  contextSelection?: SelectContextPackInput;
};

/** True when a context pack carries no rule/doc paths yet. */
function isEmptyContextPack(p: HarnessInput["contextPack"]): boolean {
  return (
    p.globalRules.length === 0 &&
    p.pathRules.length === 0 &&
    p.docsIndex.length === 0
  );
}

// ─── §14.4 — harness mode rails ──────────────────────────────────────────────

/**
 * Rail config per harness mode (PRD §14.4). `requiresApproval` gates the strict
 * rail; `lightweight` distinguishes the cheap rails (direct/safe_solo) from the
 * full rails (standard/strict/parallel_patch) for documentation/branching.
 */
type ModeRail = {
  requiresApproval: boolean;
  lightweight: boolean;
};

const MODE_RAILS: Record<HarnessMode, ModeRail> = {
  direct: { requiresApproval: false, lightweight: true },
  safe_solo: { requiresApproval: false, lightweight: true },
  standard: { requiresApproval: false, lightweight: false },
  strict: { requiresApproval: true, lightweight: false },
  parallel_patch: { requiresApproval: false, lightweight: false },
};

// ─── step 1 — validate work order ────────────────────────────────────────────

/** Throwable validation error so the caller can distinguish bad input. */
export class WorkOrderValidationError extends Error {}

function validateWorkOrder(input: HarnessInput): void {
  const missing: string[] = [];
  if (!input.runId) missing.push("runId");
  if (!input.taskId) missing.push("taskId");
  if (!input.repoPath) missing.push("repoPath");
  if (!input.baseBranch) missing.push("baseBranch");
  if (!input.agent) missing.push("agent");
  if (!input.prompt) missing.push("prompt");
  if (!input.mode) missing.push("mode");
  if (missing.length > 0) {
    throw new WorkOrderValidationError(
      `Invalid Work Order: missing ${missing.join(", ")}`,
    );
  }
  if (!(input.mode in MODE_RAILS)) {
    throw new WorkOrderValidationError(`Unknown harness mode: ${input.mode}`);
  }
}

// ─── recommendation mapping (§16) ────────────────────────────────────────────

function recommendationFor(
  status: HarnessStatus,
  checks: ExecutionRun["checks"],
): ExecutionRecommendation {
  switch (status) {
    case "passed":
      return "merge_ready";
    case "boundary_violation":
      return "discard_patch";
    case "blocked":
      return "blocked";
    case "needs_approval":
      return "human_review";
    case "failed":
    default: {
      // A pure verification failure is retryable with a verifier; anything
      // else (guard block etc.) routes to a human.
      const anyVerifyFail = (["typecheck", "lint", "test", "build", "playwright"] as const).some(
        (k) => checks[k] === "fail",
      );
      return anyVerifyFail ? "retry_with_verifier" : "human_review";
    }
  }
}

// ─── result packet + handoff (§12 / §13 / §16) ───────────────────────────────

function summarize(
  status: HarnessStatus,
  run: ExecutionRun,
  mode: HarnessMode,
  detail: string,
): string {
  const base = `[${status}] task ${run.taskId} / run ${run.id} (${run.agent}, mode ${mode})`;
  return detail ? `${base}\n${detail}` : base;
}

/**
 * Build the standard Result Packet (§16) + HarnessOutput (§14.6) and write the
 * handoff folder (§15). Returns the HarnessOutput. Persists the terminal status
 * + summary on the run so the store reflects the settled outcome.
 */
async function settle(
  deps: HarnessDeps,
  input: HarnessInput,
  run: ExecutionRun,
  status: HarnessStatus,
  detail: string,
  logText: string,
  handoffOpts: HandoffOptions | undefined,
): Promise<HarnessOutput> {
  const summary = summarize(status, run, input.mode, detail);
  const nextAction = nextActionFor(status, detail);
  const recommendation = recommendationFor(status, run.checks);

  // Persist the terminal status + narrative onto the run.
  const persisted =
    (await deps.patchRun(run.id, {
      status,
      resultSummary: summary,
      nextAction,
    })) ?? { ...run, status, resultSummary: summary, nextAction };

  const packet: ExecutionResultPacket = {
    runId: persisted.id,
    taskId: persisted.taskId,
    status,
    agent: persisted.agent,
    summary,
    changedFiles: persisted.changedFiles ?? [],
    diffStat: persisted.diffStat ?? "",
    checks: persisted.checks ?? {},
    artifacts: {},
    recommendation,
    nextAction,
  };

  // §15 — handoff folder. Diff text is best-effort: prefer a re-collected diff
  // from the worktree, fall back to diffStat already on the run.
  let diffText = persisted.diffStat ?? "";
  if (persisted.worktreePath) {
    try {
      const d = await collectDiff(persisted.worktreePath);
      diffText = d.diffStat || diffText;
    } catch {
      /* worktree may be gone — keep diffStat fallback */
    }
  }

  let handoffPath: string | undefined;
  try {
    const handoff = await deps.writeHandoff(
      persisted,
      packet,
      { diff: diffText, log: logText },
      handoffOpts,
    );
    handoffPath = handoff.handoffDir;
  } catch {
    /* handoff is best-effort; never let it flip a settled run */
  }
  packet.artifacts.handoffPath = handoffPath;

  return {
    runId: persisted.id,
    taskId: persisted.taskId,
    status,
    changedFiles: persisted.changedFiles ?? [],
    diffStat: persisted.diffStat ?? "",
    checks: persisted.checks ?? {},
    artifacts: { handoffPath },
    summary,
    nextAction,
    recommendation,
  };
}

function nextActionFor(status: HarnessStatus, detail: string): string {
  switch (status) {
    case "passed":
      return "Merge-ready. Hand back to pulk CTO for merge.";
    case "boundary_violation":
      return "Discard or rescope the patch — changes left the sandbox.";
    case "blocked":
      return detail || "Resolve the blocking condition, then retry.";
    case "needs_approval":
      return "Human approval required before this rail can execute.";
    case "failed":
    default:
      return "Inspect verification logs and retry.";
  }
}

// ─── main ────────────────────────────────────────────────────────────────────

/**
 * Execute the 14-step harness pipeline for one work order. Always resolves with
 * a HarnessOutput carrying a terminal status; never throws for *expected*
 * settlement paths (blocked / boundary_violation / needs_approval / failed).
 * Only an invalid Work Order (step 1) throws.
 */
export async function runHarness(
  input: HarnessInput,
  options: RunHarnessOptions,
): Promise<HarnessOutput> {
  // Step 1 — Validate Work Order.
  validateWorkOrder(input);

  const deps: HarnessDeps = {
    ...DEFAULT_DEPS,
    ...options.deps,
    agentRunner: options.agentRunner,
    commandRunner: options.commandRunner,
  };

  // The run must already exist in the store (created by the API layer). The
  // harness records execution; it does not plan or create the run.
  const existing = await deps.loadRun(input.runId);
  if (!existing) {
    throw new WorkOrderValidationError(
      `Work Order references unknown run ${input.runId}`,
    );
  }
  let run = existing;

  const logParts: string[] = [];
  const log = (s: string) => logParts.push(s);

  // Step 2 — Select Context Pack (§14.7). pulk CTO may pre-resolve it; when it
  // is empty and a contextSelection is given, we resolve the minimal pack here.
  if (options.contextSelection && isEmptyContextPack(input.contextPack)) {
    const selected = selectContextPack(options.contextSelection);
    input = {
      ...input,
      contextPack: { ...input.contextPack, ...selected },
    };
  }
  log(
    `# context\nglobalRules: ${input.contextPack.globalRules.length}` +
      ` pathRules: ${input.contextPack.pathRules.length}` +
      ` docsIndex: ${input.contextPack.docsIndex.length}`,
  );

  // Step 3 — Check Approval Requirement.
  // Step 4 — Select Harness Mode (rail).
  const rail = MODE_RAILS[input.mode];
  const approved = options.isApproved ? options.isApproved(input) : true;
  if (rail.requiresApproval && !approved) {
    return settle(
      deps,
      input,
      run,
      "needs_approval",
      `mode '${input.mode}' requires approval (PRD §14.3 step 3, §14.4 strict rail)`,
      logParts.join("\n"),
      options.handoff,
    );
  }

  // Step 5 — Create Workspace (worktree). Lightweight rails (direct/safe_solo)
  // MAY skip a worktree per §14.4, but we always provision one when boundary
  // verification is requested so the boundary check has a diff to inspect.
  try {
    run = await deps.provisionWorktree(run);
  } catch (err) {
    // provisionWorktreeForRun already set status='blocked' in the store.
    const reason = err instanceof Error ? err.message : String(err);
    log(`# workspace\nworktree provisioning failed: ${reason}`);
    const reloaded = (await deps.loadRun(run.id)) ?? run;
    return settle(
      deps,
      input,
      reloaded,
      "blocked",
      `Workspace creation failed: ${reason}`,
      logParts.join("\n"),
      options.handoff,
    );
  }
  log(`# workspace\nworktree: ${run.worktreePath}\nbranch: ${run.runBranch}`);

  await deps.patchRun(run.id, { status: "running" });

  // Step 7 — Run Agent Adapter (mockable). Captured first so step 6 can guard
  // any commands the agent proposed.
  let agentResult: AgentRunResult;
  try {
    agentResult = await deps.agentRunner(run);
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    log(`# agent\nagent adapter error: ${reason}`);
    return settle(
      deps,
      input,
      run,
      "failed",
      `Agent adapter failed: ${reason}`,
      logParts.join("\n"),
      options.handoff,
    );
  }

  // Step 6 — Apply Command Guard (PRD §14.8). Any blocked command stops the run
  // BEFORE we trust its diff.
  const proposed = agentResult.proposedCommands ?? [];
  const guarded: CommandCheck[] = checkCommands(proposed);
  const blocked = guarded.filter((g) => !g.result.allowed);
  if (blocked.length > 0) {
    const lines = blocked.map(
      (b) => `- ${b.command} → ${b.result.reason ?? "blocked"}`,
    );
    log(`# command-guard\nBLOCKED:\n${lines.join("\n")}`);
    return settle(
      deps,
      input,
      run,
      "blocked",
      `Command guard blocked ${blocked.length} command(s):\n${lines.join("\n")}`,
      logParts.join("\n"),
      options.handoff,
    );
  }

  // Step 8 — Collect Logs.
  log(`# agent\n${agentResult.log}`);

  // Step 9 — Collect Diff + Step 11 — Check Boundary (one committed call).
  const fin = await deps.finalizeDiff(run);
  run = fin.run;
  log(
    `# diff\nchangedFiles: ${run.changedFiles.length}\n${run.diffStat ?? ""}`,
  );

  if (fin.boundaryViolation) {
    // finalizeRunDiff already set status='boundary_violation' + summary.
    const detail =
      run.resultSummary ??
      `Boundary violation: ${fin.violations.join(", ")}`;
    log(`# boundary\nVIOLATION: ${fin.violations.join(", ")}`);
    return settle(
      deps,
      input,
      run,
      "boundary_violation",
      detail,
      logParts.join("\n"),
      options.handoff,
    );
  }

  // Step 10 — Run Verification (PRD §13). Boundary result is already computed by
  // finalizeDiff; feed it in so the profile's boundary flag reports correctly.
  await deps.patchRun(run.id, { status: "verifying" });
  const verification = await runVerification({
    cwd: run.worktreePath!,
    profile: input.verificationProfile,
    commands: options.verificationCommands,
    runner: deps.commandRunner,
    boundaryResult: run.checks.boundary ?? "pass",
  });

  // Merge verification checks onto the run (boundary already persisted).
  const mergedChecks = { ...run.checks, ...verification.checks };
  run =
    (await deps.patchRun(run.id, {
      checks: mergedChecks,
      logTail: verification.logTail,
    })) ?? { ...run, checks: mergedChecks, logTail: verification.logTail };

  if (verification.logTail) log(`# verification\n${verification.logTail}`);

  // Step 12 — Decide terminal status from the merged checks.
  const verifyFailed = (
    ["typecheck", "lint", "test", "build", "playwright"] as const
  ).some((k) => isRequested(input.verificationProfile, k) && run.checks[k] === "fail");

  const status: HarnessStatus = verifyFailed ? "failed" : "passed";
  const detail = verifyFailed
    ? `Verification failed.\n${verification.logTail ?? ""}`
    : "All requested checks passed.";

  // Steps 12-14 — Result Packet + Handoff + Return.
  return settle(
    deps,
    input,
    run,
    status,
    detail,
    logParts.join("\n"),
    options.handoff,
  );
}

function isRequested(
  profile: VerificationProfile,
  key: VerifiableCheck,
): boolean {
  return profile[key] === true;
}
