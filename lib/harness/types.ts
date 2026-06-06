/**
 * Harness types — ACR Agent Execution Harness (PRD §14.5 / §14.6)
 *
 * HarnessInput / HarnessOutput are the standard contract between pulk CTO's
 * Work Order and the ACR Kernel execution layer. Types mirror PRD §14.5 and
 * §14.6 exactly. The harness wraps an agent run with workspace isolation,
 * command guard, verification and boundary checks — it does NOT decide *what*
 * to do (that is pulk CTO's job).
 *
 * Shared sub-types (checks / agent / complexity / recommendation) are reused
 * from the already-committed execution-run types so the harness and the run
 * model never drift.
 */

import type {
  ExecutionAgent,
  ExecutionChecks,
  ExecutionComplexity,
  ExecutionRecommendation,
} from "@/lib/execution-run/types";

// ─── §14.4 / §14.5 — harness mode ────────────────────────────────────────────

/**
 * Harness execution rail (PRD §14.4 Harness Types). Distinct from
 * ExecutionMode in execution-run/types.ts: that enum is the run-level mode
 * (safe_solo | implement_verify | …); this is the harness-level rail.
 */
export type HarnessMode =
  | "direct"
  | "safe_solo"
  | "standard"
  | "strict"
  | "parallel_patch";

// ─── §14.5 — verification profile ────────────────────────────────────────────

/**
 * Boolean map of which verification checks to run. Each requested check runs;
 * an unrequested check is reported as "skipped".
 */
export type VerificationProfile = {
  typecheck: boolean;
  lint: boolean;
  test: boolean;
  build: boolean;
  playwright: boolean;
  boundary: boolean;
};

// ─── §14.5 — context pack ────────────────────────────────────────────────────

export type HarnessContextPack = {
  globalRules: string[];
  pathRules: string[];
  docsIndex: string[];
  handoff?: string;
};

// ─── §14.5 — HarnessInput ────────────────────────────────────────────────────

export type HarnessInput = {
  runId: string;
  taskId: string;

  repoPath: string;
  baseBranch: string;

  agent: ExecutionAgent;

  prompt: string;
  acceptanceCriteria: string[];

  allowedFiles: string[];
  blockedFiles: string[];

  complexity: ExecutionComplexity;

  mode: HarnessMode;

  verificationProfile: VerificationProfile;

  contextPack: HarnessContextPack;
};

// ─── §14.6 — HarnessOutput ───────────────────────────────────────────────────

/**
 * Terminal statuses a harness run can settle on (PRD §14.6). A narrower set
 * than ExecutionRunStatus — the harness only returns settled outcomes.
 */
export type HarnessStatus =
  | "passed"
  | "failed"
  | "blocked"
  | "needs_approval"
  | "boundary_violation";

export type HarnessArtifacts = {
  logPath?: string;
  diffPath?: string;
  screenshotPath?: string;
  handoffPath?: string;
};

export type HarnessOutput = {
  runId: string;
  taskId: string;

  status: HarnessStatus;

  changedFiles: string[];
  diffStat: string;

  checks: ExecutionChecks;

  artifacts: HarnessArtifacts;

  summary: string;
  nextAction: string;

  recommendation: ExecutionRecommendation;
};
