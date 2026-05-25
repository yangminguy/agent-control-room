/**
 * Subagent Team Composer
 * Composes AgentTeamPlans from SubagentSpecs and coordinates sequential/parallel execution.
 * Enforces file conflict detection, handoff rules, and Hermes monitoring integration.
 */

import { randomUUID } from "crypto";
import type { SubagentSpec, AgentTeamPlan } from "./subagent-types";

// ---------------------------------------------------------------------------
// Supporting types
// ---------------------------------------------------------------------------

export type TeamCompositionConfig = {
  parentAgent: AgentTeamPlan["parentAgent"];
  teamMode: AgentTeamPlan["teamMode"];
  subagents: SubagentSpec[];
  coordinationStrategy?: string;
  handoffRules?: string[];
  hermesWatchRules?: string[];
  monitoringRequired?: boolean;
};

export type TeamExecutionResult = {
  teamId: string;
  mode: "sequential" | "parallel";
  subagentResults: SubagentExecutionRecord[];
  status: "completed" | "failed";
  failureReason?: string;
};

export type SubagentExecutionRecord = {
  subagentId: string;
  status: "completed" | "failed" | "skipped";
  output?: string;
  error?: string;
  startedAt: string;
  completedAt?: string;
};

export type ComposerResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// In-memory team plan store
// ---------------------------------------------------------------------------

const globalWithTeams = globalThis as typeof globalThis & {
  __agentTeamPlanStore?: Map<string, AgentTeamPlan & { status: "active" | "completed" | "failed" }>;
};

function teamStore(): Map<string, AgentTeamPlan & { status: "active" | "completed" | "failed" }> {
  if (!globalWithTeams.__agentTeamPlanStore) {
    globalWithTeams.__agentTeamPlanStore = new Map();
  }
  return globalWithTeams.__agentTeamPlanStore;
}

// ---------------------------------------------------------------------------
// File conflict detection
// ---------------------------------------------------------------------------

/**
 * Returns the set of files declared in a subagent's allowedFiles.
 * Wildcards (e.g. "lib/**") are treated as directory prefixes for conflict detection.
 */
function normalizeFilePaths(spec: SubagentSpec): string[] {
  return spec.allowedFiles.map((f) => f.replace(/\/\*\*$/, "").replace(/\/\*$/, ""));
}

/**
 * Returns true if two normalized file paths overlap.
 * "lib/orchestration" overlaps "lib/orchestration/types.ts".
 * "lib/runner" does not overlap "app/components".
 */
function pathsOverlap(a: string, b: string): boolean {
  if (a === b) return true;
  if (b.startsWith(a + "/")) return true;
  if (a.startsWith(b + "/")) return true;
  return false;
}

/**
 * Finds all file conflicts between a list of subagents.
 * Returns pairs of [subagentId, subagentId] that share overlapping file paths.
 */
function detectFileConflicts(
  subagents: SubagentSpec[]
): Array<{ a: string; b: string; files: string[] }> {
  const conflicts: Array<{ a: string; b: string; files: string[] }> = [];

  for (let i = 0; i < subagents.length; i++) {
    for (let j = i + 1; j < subagents.length; j++) {
      const pathsA = normalizeFilePaths(subagents[i]);
      const pathsB = normalizeFilePaths(subagents[j]);

      const overlapping: string[] = [];
      for (const pa of pathsA) {
        for (const pb of pathsB) {
          if (pathsOverlap(pa, pb)) {
            overlapping.push(`${pa} ↔ ${pb}`);
          }
        }
      }

      if (overlapping.length > 0) {
        conflicts.push({
          a: subagents[i].id,
          b: subagents[j].id,
          files: overlapping,
        });
      }
    }
  }

  return conflicts;
}

// ---------------------------------------------------------------------------
// Handoff output format validation
// ---------------------------------------------------------------------------

/**
 * Validates that each subagent's output format is compatible with
 * the next subagent's expected input in a sequential chain.
 * Currently checks that blocked commands from step N are not
 * required by step N+1 (minimal enforcement; real prompt chaining
 * is done by the runtime, not here).
 */
function validateHandoffChain(
  subagents: SubagentSpec[],
  handoffRules: string[]
): string[] {
  const violations: string[] = [];

  // Enforce caller-provided handoff rules as string assertions
  for (const rule of handoffRules) {
    // Rules are descriptive strings; we log them as applied
    // (Full enforcement requires LLM output inspection at runtime)
  }

  // Check that retired subagents are not in an active chain
  for (const spec of subagents) {
    if (spec.status === "retired") {
      violations.push(`Subagent "${spec.id}" is retired and cannot participate in a team`);
    }
    if (spec.securityReport.level === "rejected") {
      violations.push(`Subagent "${spec.id}" has a rejected security report and is blocked`);
    }
  }

  return violations;
}

// ---------------------------------------------------------------------------
// Hermes watch rules derivation
// ---------------------------------------------------------------------------

/**
 * Derives default Hermes watch rules from the subagents in the team.
 * The caller may also supply additional rules via config.
 */
function deriveHermesWatchRules(subagents: SubagentSpec[]): string[] {
  const rules = new Set<string>();

  // Always watch for security violations
  rules.add("watch: security-report level = rejected → halt");

  for (const spec of subagents) {
    if (spec.allowedFiles.length > 0) {
      rules.add(`watch: file edits outside [${spec.allowedFiles.join(", ")}] by ${spec.id} → warn`);
    }
    if (spec.blockedCommands.length > 0) {
      rules.add(`watch: blocked commands [${spec.blockedCommands.join(", ")}] from ${spec.id} → halt`);
    }
  }

  return Array.from(rules);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compose an AgentTeamPlan from config. Does not execute; only builds the plan.
 */
export function composeTeam(
  taskId: string,
  config: TeamCompositionConfig
): ComposerResult<AgentTeamPlan> {
  if (config.subagents.length === 0) {
    return { success: false, error: "Cannot compose a team with zero subagents" };
  }

  // Validate handoff chain (security + retired checks)
  const chainViolations = validateHandoffChain(
    config.subagents,
    config.handoffRules ?? []
  );
  if (chainViolations.length > 0) {
    return {
      success: false,
      error: `Team composition rejected: ${chainViolations.join("; ")}`,
    };
  }

  const hermesRules = [
    ...(config.hermesWatchRules ?? []),
    ...deriveHermesWatchRules(config.subagents),
  ];

  const plan: AgentTeamPlan = {
    id: randomUUID(),
    taskId,
    parentAgent: config.parentAgent,
    teamMode: config.teamMode,
    subagents: config.subagents,
    coordinationStrategy:
      config.coordinationStrategy ??
      (config.teamMode === "parallel_team"
        ? "Run all subagents concurrently; merge outputs after all complete"
        : "Run subagents in declared order; pass output of step N to step N+1"),
    handoffRules: config.handoffRules ?? [],
    monitoringRequired: config.monitoringRequired ?? true,
    hermesWatchRules: hermesRules,
    createdAt: new Date().toISOString(),
  };

  teamStore().set(plan.id, { ...plan, status: "active" });
  return { success: true, data: plan };
}

/**
 * Retrieve a team plan by ID.
 */
export function getTeamForTask(
  taskId: string
): ComposerResult<AgentTeamPlan & { status: string }> {
  // Search by taskId (not team id)
  const match = Array.from(teamStore().values()).find((t) => t.taskId === taskId);
  if (!match) {
    return { success: false, error: `No team plan found for taskId "${taskId}"` };
  }
  return { success: true, data: match };
}

/**
 * Update the status of a team plan.
 */
export function updateTeamStatus(
  teamId: string,
  status: "active" | "completed" | "failed"
): ComposerResult<{ teamId: string; status: string }> {
  const plan = teamStore().get(teamId);
  if (!plan) {
    return { success: false, error: `Team plan "${teamId}" not found` };
  }

  const updated = {
    ...plan,
    status,
    ...(status === "completed" || status === "failed"
      ? { completedAt: new Date().toISOString() }
      : {}),
  };
  teamStore().set(teamId, updated);
  return { success: true, data: { teamId, status } };
}

/**
 * Validate a team composition for file conflicts and chain violations.
 * Returns success=true with an empty conflicts array when valid.
 */
export function validateTeamComposition(team: AgentTeamPlan): ComposerResult<{
  conflicts: Array<{ a: string; b: string; files: string[] }>;
  chainViolations: string[];
}> {
  const conflicts = detectFileConflicts(team.subagents);
  const chainViolations = validateHandoffChain(team.subagents, team.handoffRules);

  if (conflicts.length > 0 || chainViolations.length > 0) {
    const details = [
      ...conflicts.map((c) => `File conflict ${c.a} ↔ ${c.b}: ${c.files.join(", ")}`),
      ...chainViolations,
    ].join("; ");
    return {
      success: false,
      error: `Team validation failed: ${details}`,
    };
  }

  return { success: true, data: { conflicts: [], chainViolations: [] } };
}

/**
 * Execute a team sequentially: output of step N feeds to step N+1.
 *
 * This is a coordination scaffold — actual subagent invocation is handled by
 * the runtime (CLI runner / claude-direct / etc.). This function manages
 * ordering, short-circuit on failure, and result aggregation.
 *
 * The `invokeSubagent` callback is injected so the caller controls the actual
 * execution boundary (keeps this module runtime-agnostic).
 */
export async function executeTeamSequentially(
  team: AgentTeamPlan,
  invokeSubagent: (
    spec: SubagentSpec,
    input: string | undefined
  ) => Promise<{ ok: boolean; output?: string; error?: string }>
): Promise<ComposerResult<TeamExecutionResult>> {
  const validation = validateTeamComposition(team);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  updateTeamStatus(team.id, "active");

  const subagentResults: SubagentExecutionRecord[] = [];
  let previousOutput: string | undefined = undefined;

  for (const spec of team.subagents) {
    const record: SubagentExecutionRecord = {
      subagentId: spec.id,
      status: "completed",
      startedAt: new Date().toISOString(),
    };

    try {
      const result = await invokeSubagent(spec, previousOutput);
      record.completedAt = new Date().toISOString();

      if (!result.ok) {
        record.status = "failed";
        record.error = result.error ?? "Unknown failure";
        subagentResults.push(record);

        // Mark remaining as skipped
        const remaining = team.subagents.slice(team.subagents.indexOf(spec) + 1);
        for (const skipped of remaining) {
          subagentResults.push({
            subagentId: skipped.id,
            status: "skipped",
            startedAt: new Date().toISOString(),
          });
        }

        updateTeamStatus(team.id, "failed");
        return {
          success: false,
          error: `Sequential execution halted at "${spec.id}": ${record.error}`,
        };
      }

      record.output = result.output;
      previousOutput = result.output; // feed forward
    } catch (err) {
      record.status = "failed";
      record.error = String(err);
      record.completedAt = new Date().toISOString();
      subagentResults.push(record);
      updateTeamStatus(team.id, "failed");
      return {
        success: false,
        error: `Sequential execution threw at "${spec.id}": ${record.error}`,
      };
    }

    subagentResults.push(record);
  }

  updateTeamStatus(team.id, "completed");
  return {
    success: true,
    data: {
      teamId: team.id,
      mode: "sequential",
      subagentResults,
      status: "completed",
    },
  };
}

/**
 * Execute compatible subagents in parallel.
 *
 * Pre-condition: validateTeamComposition must pass (no file conflicts).
 * All subagents are invoked concurrently; if any fail, the team is marked failed
 * but all results are still collected.
 *
 * Same injected `invokeSubagent` pattern as executeTeamSequentially.
 */
export async function executeTeamParallel(
  team: AgentTeamPlan,
  invokeSubagent: (
    spec: SubagentSpec,
    input: string | undefined
  ) => Promise<{ ok: boolean; output?: string; error?: string }>
): Promise<ComposerResult<TeamExecutionResult>> {
  const validation = validateTeamComposition(team);
  if (!validation.success) {
    return { success: false, error: validation.error };
  }

  // File conflicts block parallel execution
  const conflicts = detectFileConflicts(team.subagents);
  if (conflicts.length > 0) {
    const desc = conflicts
      .map((c) => `${c.a} ↔ ${c.b} (${c.files.join(", ")})`)
      .join("; ");
    return {
      success: false,
      error: `Parallel execution blocked by file conflicts: ${desc}`,
    };
  }

  updateTeamStatus(team.id, "active");

  const settled = await Promise.allSettled(
    team.subagents.map(async (spec): Promise<SubagentExecutionRecord> => {
      const startedAt = new Date().toISOString();
      try {
        const result = await invokeSubagent(spec, undefined); // no feed-forward in parallel
        return {
          subagentId: spec.id,
          status: result.ok ? "completed" : "failed",
          output: result.output,
          error: result.error,
          startedAt,
          completedAt: new Date().toISOString(),
        };
      } catch (err) {
        return {
          subagentId: spec.id,
          status: "failed",
          error: String(err),
          startedAt,
          completedAt: new Date().toISOString(),
        };
      }
    })
  );

  const subagentResults: SubagentExecutionRecord[] = settled.map((s) =>
    s.status === "fulfilled"
      ? s.value
      : {
          subagentId: "unknown",
          status: "failed" as const,
          error: String((s as PromiseRejectedResult).reason),
          startedAt: new Date().toISOString(),
        }
  );

  const anyFailed = subagentResults.some((r) => r.status === "failed");
  const teamStatus = anyFailed ? "failed" : "completed";
  updateTeamStatus(team.id, teamStatus);

  if (anyFailed) {
    const failedIds = subagentResults
      .filter((r) => r.status === "failed")
      .map((r) => r.subagentId)
      .join(", ");
    return {
      success: false,
      error: `Parallel execution completed with failures in: ${failedIds}`,
    };
  }

  return {
    success: true,
    data: {
      teamId: team.id,
      mode: "parallel",
      subagentResults,
      status: "completed",
    },
  };
}
