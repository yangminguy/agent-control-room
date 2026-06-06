/**
 * Verification Runner — ACR Harness (PRD §13)
 *
 * Runs the verification checks requested by a HarnessInput.verificationProfile
 * against a worktree (cwd) and reports each check as pass | fail | skipped.
 *
 *   - A requested check (profile flag true) runs its command in `cwd`.
 *     exit 0 → "pass", non-zero or thrown → "fail".
 *   - An unrequested check is "skipped".
 *   - On any failure, a trimmed log tail is returned for triage (PRD §13.2).
 *
 * Commands are INJECTED (defaults: pnpm typecheck/lint/test/build), and the
 * actual command runner is injectable so tests can mock execution instead of
 * spawning real processes (PRD: command runner 주입 가능 설계).
 *
 * `boundary` is a check key in the profile but is NOT a shell command — it is
 * evaluated elsewhere (lib/worktree/boundary-check). This runner reports it as
 * "skipped" so callers can fill it in after they run the boundary check. If a
 * caller already has a boundary result, it can pass it via `boundaryResult`.
 */

import type {
  ExecutionCheckResult,
  ExecutionChecks,
} from "@/lib/execution-run/types";
import type { VerificationProfile } from "@/lib/harness/types";

/** Verification checks that map to a shell command. */
export type VerifiableCheck = "typecheck" | "lint" | "test" | "build" | "playwright";

/** Default check commands (PRD §13.3). Callers may override any of these. */
export const DEFAULT_VERIFICATION_COMMANDS: Record<VerifiableCheck, string> = {
  typecheck: "pnpm typecheck",
  lint: "pnpm lint",
  test: "pnpm test",
  build: "pnpm build",
  playwright: "pnpm test:e2e",
};

/** Result of running a single command. */
export type CommandRunResult = {
  /** Process exit code. 0 means success. */
  exitCode: number;
  /** Combined stdout+stderr (used for the failure log tail). */
  output: string;
};

/**
 * Injectable command runner. Production wiring spawns a child process in `cwd`;
 * tests inject a mock. Kept minimal on purpose.
 */
export type CommandRunner = (
  command: string,
  cwd: string,
) => Promise<CommandRunResult>;

export type RunVerificationInput = {
  /** Worktree path to run checks in. */
  cwd: string;
  /** Which checks to run (boolean map, PRD §14.5). */
  profile: VerificationProfile;
  /**
   * Command overrides. Any check not present here uses
   * DEFAULT_VERIFICATION_COMMANDS.
   */
  commands?: Partial<Record<VerifiableCheck, string>>;
  /**
   * Pre-computed boundary result (the boundary check is not a shell command).
   * If profile.boundary is true and this is provided, it is used directly;
   * otherwise boundary is reported as "skipped".
   */
  boundaryResult?: ExecutionCheckResult;
  /** Injected command runner. Tests pass a mock. */
  runner: CommandRunner;
};

export type RunVerificationOutput = {
  checks: ExecutionChecks;
  /** Trimmed combined output of failing checks (PRD §13.2). undefined if none. */
  logTail?: string;
};

/** Max characters of failure output retained in the log tail. */
const LOG_TAIL_MAX = 4000;

const VERIFIABLE_ORDER: VerifiableCheck[] = [
  "typecheck",
  "lint",
  "test",
  "build",
  "playwright",
];

/**
 * Run the requested verification checks. Checks run sequentially in profile
 * order; each is independent (one failing check does not skip the others).
 */
export async function runVerification(
  input: RunVerificationInput,
): Promise<RunVerificationOutput> {
  const { cwd, profile, commands, runner, boundaryResult } = input;
  const checks: ExecutionChecks = {};
  const failureLogs: string[] = [];

  for (const check of VERIFIABLE_ORDER) {
    if (!profile[check]) {
      checks[check] = "skipped";
      continue;
    }
    const command = commands?.[check] ?? DEFAULT_VERIFICATION_COMMANDS[check];
    const result = await runSingle(check, command, cwd, runner, failureLogs);
    checks[check] = result;
  }

  // boundary is not a shell command — it's evaluated by the boundary checker.
  checks.boundary = profile.boundary ? boundaryResult ?? "skipped" : "skipped";

  const logTail =
    failureLogs.length > 0
      ? failureLogs.join("\n").slice(-LOG_TAIL_MAX)
      : undefined;

  return { checks, logTail };
}

/**
 * Run one check command. A thrown error (e.g. runner could not spawn) is
 * treated as a failure per PRD ("실행 실패=fail").
 */
async function runSingle(
  check: VerifiableCheck,
  command: string,
  cwd: string,
  runner: CommandRunner,
  failureLogs: string[],
): Promise<ExecutionCheckResult> {
  try {
    const { exitCode, output } = await runner(command, cwd);
    if (exitCode === 0) return "pass";
    failureLogs.push(`[${check}] $ ${command}\n${output}`);
    return "fail";
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    failureLogs.push(`[${check}] $ ${command}\n<runner error> ${message}`);
    return "fail";
  }
}
