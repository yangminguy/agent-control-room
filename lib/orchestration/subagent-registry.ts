/**
 * Subagent Registry
 * Manages reusable subagent specs with security validation and performance tracking.
 * Pattern: mirrors workspace-store (in-memory + JSON persistence, env-configurable path).
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { SubagentSpec, SubagentSecurityReport } from "./subagent-types";

// ---------------------------------------------------------------------------
// Storage path — override via env for test isolation
// ---------------------------------------------------------------------------

const REGISTRY_DIR = process.env.SUBAGENT_REGISTRY_DIR
  ? path.resolve(process.cwd(), process.env.SUBAGENT_REGISTRY_DIR)
  : path.join(process.cwd(), "data", "subagent-registry");

const REGISTRY_FILE = path.join(REGISTRY_DIR, "registry.json");

// ---------------------------------------------------------------------------
// In-memory store (global singleton to survive hot-reload in Next.js dev)
// ---------------------------------------------------------------------------

const globalWithRegistry = globalThis as typeof globalThis & {
  __subagentRegistryStore?: Map<string, SubagentSpec>;
};

function memoryStore(): Map<string, SubagentSpec> {
  if (!globalWithRegistry.__subagentRegistryStore) {
    globalWithRegistry.__subagentRegistryStore = new Map();
  }
  return globalWithRegistry.__subagentRegistryStore;
}

// ---------------------------------------------------------------------------
// Result type used by all public functions
// ---------------------------------------------------------------------------

export type RegistryResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(REGISTRY_DIR, { recursive: true });
  } catch {
    // directory already exists or filesystem read-only — handled below
  }
}

async function persistToDisk(): Promise<void> {
  try {
    await ensureDir();
    const entries = Array.from(memoryStore().values());
    await fs.writeFile(REGISTRY_FILE, JSON.stringify(entries, null, 2), "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn("[subagent-registry] disk write unavailable; using volatile memory fallback");
      return;
    }
    console.error("[subagent-registry] persist failed:", error);
    throw error;
  }
}

/**
 * Load registry from disk into memory on first use (lazy hydration).
 */
async function hydrateFromDisk(): Promise<void> {
  if (memoryStore().size > 0) return; // already hydrated
  try {
    const content = await fs.readFile(REGISTRY_FILE, "utf-8");
    const entries = JSON.parse(content) as SubagentSpec[];
    for (const spec of entries) {
      memoryStore().set(spec.id, spec);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[subagent-registry] hydrate failed:", error);
    }
    // ENOENT = first run, no registry yet
  }
}

// ---------------------------------------------------------------------------
// Security validation
// ---------------------------------------------------------------------------

/** Dangerous shell commands that should never appear in allowedCommands. */
const BLOCKED_COMMAND_PATTERNS = [
  /git\s+(push|merge|rebase|reset\s+--hard|clean)/i,
  /rm\s+-rf/i,
  /(npm|yarn|pnpm)\s+(add|remove|install)\s+/i,
  /(prisma|supabase)\s+migrate/i,
  /vercel\s+deploy/i,
  /docker\s+(push|deploy)/i,
];

/** Files that must never appear in allowedFiles (critical system files). */
const BLOCKED_FILE_PATTERNS = [
  /\.env/,
  /package\.json$/,
  /package-lock\.json$/,
  /tsconfig/,
  /next\.config/,
  /secret/i,
  /credentials/i,
];

/**
 * Generates a SecurityReport for a SubagentSpec.
 * "rejected" = one or more hard violations found.
 * "warning"  = suspicious but not definitively dangerous.
 * "clean"    = no issues detected.
 */
export function validateSubagentSecurity(spec: SubagentSpec): SubagentSecurityReport {
  const violations: string[] = [];
  const warnings: string[] = [];

  // Check allowedCommands for dangerous patterns
  for (const cmd of spec.allowedCommands) {
    if (BLOCKED_COMMAND_PATTERNS.some((p) => p.test(cmd))) {
      violations.push(`Dangerous command in allowedCommands: "${cmd}"`);
    }
  }

  // Check allowedFiles for critical system files
  for (const file of spec.allowedFiles) {
    if (BLOCKED_FILE_PATTERNS.some((p) => p.test(file))) {
      violations.push(`Critical file in allowedFiles: "${file}"`);
    }
  }

  // Warn if source is not builtin and no sourceHash provided
  if (spec.source !== "builtin" && !spec.sourceHash) {
    warnings.push(`External subagent (source: ${spec.source}) has no sourceHash — integrity unverified`);
  }

  // Warn if allowedCommands and blockedCommands overlap
  const overlap = spec.allowedCommands.filter((c) => spec.blockedCommands.includes(c));
  if (overlap.length > 0) {
    warnings.push(`Commands appear in both allowedCommands and blockedCommands: ${overlap.join(", ")}`);
  }

  if (violations.length > 0) {
    return {
      level: "rejected",
      message: `Security validation failed: ${violations.length} violation(s) found`,
      details: violations,
    };
  }

  if (warnings.length > 0) {
    return {
      level: "warning",
      message: `Security check passed with ${warnings.length} warning(s)`,
      details: warnings,
    };
  }

  return {
    level: "clean",
    message: "Security validation passed",
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Register a subagent spec. Validates security before adding.
 * Specs with "rejected" security level are blocked.
 */
export async function registerSubagent(
  spec: SubagentSpec
): Promise<RegistryResult<SubagentSpec>> {
  await hydrateFromDisk();

  const report = validateSubagentSecurity(spec);

  if (report.level === "rejected") {
    return {
      success: false,
      error: `[registerSubagent] Rejected: ${report.message}. Details: ${report.details?.join("; ")}`,
    };
  }

  if (report.level === "warning") {
    console.warn(`[subagent-registry] Warning for "${spec.id}": ${report.message}`, report.details);
  }

  // Attach the generated report so the stored spec always reflects current state
  const stored: SubagentSpec = { ...spec, securityReport: report };
  memoryStore().set(stored.id, stored);
  await persistToDisk();

  return { success: true, data: stored };
}

/**
 * Retrieve a subagent by ID.
 */
export async function getSubagent(
  id: string
): Promise<RegistryResult<SubagentSpec>> {
  await hydrateFromDisk();
  const spec = memoryStore().get(id);
  if (!spec) {
    return { success: false, error: `Subagent "${id}" not found` };
  }
  return { success: true, data: spec };
}

/**
 * List all registered subagents, optionally filtered by parentAgent.
 */
export async function listSubagents(
  parentAgent?: SubagentSpec["parentAgent"]
): Promise<RegistryResult<SubagentSpec[]>> {
  await hydrateFromDisk();
  const all = Array.from(memoryStore().values());
  const results = parentAgent ? all.filter((s) => s.parentAgent === parentAgent) : all;
  return { success: true, data: results };
}

/**
 * Update success/failure counters and optionally the average quality score.
 */
export async function updateSubagentPerformance(
  id: string,
  success: boolean,
  score?: number
): Promise<RegistryResult<SubagentSpec>> {
  await hydrateFromDisk();
  const spec = memoryStore().get(id);
  if (!spec) {
    return { success: false, error: `Subagent "${id}" not found` };
  }

  const updated: SubagentSpec = {
    ...spec,
    successCount: success ? spec.successCount + 1 : spec.successCount,
    failureCount: success ? spec.failureCount : spec.failureCount + 1,
    lastUsedAt: new Date().toISOString(),
  };

  if (score !== undefined) {
    const totalRuns = updated.successCount + updated.failureCount;
    const prevScore = spec.averageQualityScore ?? score;
    // Running average
    updated.averageQualityScore =
      (prevScore * (totalRuns - 1) + score) / totalRuns;
  }

  memoryStore().set(id, updated);
  await persistToDisk();
  return { success: true, data: updated };
}

/**
 * Retire a subagent — moves it to "retired" status with a reason note.
 */
export async function retireSubagent(
  id: string,
  reason: string
): Promise<RegistryResult<SubagentSpec>> {
  await hydrateFromDisk();
  const spec = memoryStore().get(id);
  if (!spec) {
    return { success: false, error: `Subagent "${id}" not found` };
  }

  const retired: SubagentSpec = {
    ...spec,
    status: "retired",
    securityReport: {
      ...spec.securityReport,
      message: `Retired: ${reason}`,
    },
  };

  memoryStore().set(id, retired);
  await persistToDisk();
  return { success: true, data: retired };
}

// ---------------------------------------------------------------------------
// Builtin templates
// ---------------------------------------------------------------------------

/**
 * Returns the default builtin subagent templates for all three parent agents.
 * These are created with "builtin" source so they pass security cleanly.
 */
export function getBuiltinTemplates(): SubagentSpec[] {
  const base = (
    id: string,
    name: string,
    parentAgent: SubagentSpec["parentAgent"],
    runtimePreference: SubagentSpec["runtimePreference"],
    role: string,
    bestFor: string[],
    notFor: string[],
    allowedFiles: string[],
    allowedCommands: string[]
  ): SubagentSpec => ({
    id,
    name,
    parentAgent,
    runtimePreference,
    role,
    bestFor,
    notFor,
    allowedFiles,
    blockedFiles: [".env", "package.json", "package-lock.json"],
    allowedCommands,
    blockedCommands: [
      "git push",
      "git merge",
      "git rebase",
      "git reset --hard",
      "npm add",
      "pnpm add",
    ],
    promptTemplatePath: `templates/subagents/${id}.md`,
    obsidianPath: `subagents/${id}`,
    source: "builtin",
    successCount: 0,
    failureCount: 0,
    status: "active",
    securityReport: { level: "clean", message: "Builtin template — pre-validated" },
  });

  return [
    // ---- Claude Code subagents ----
    base(
      "claude/architecture-reviewer",
      "Architecture Reviewer",
      "claude-code",
      "claude-direct",
      "Reviews proposed architectural changes against existing patterns and flags regressions",
      ["architecture review", "pattern consistency check", "refactor validation"],
      ["UI-only changes", "quick bug fixes"],
      ["lib/**", "app/api/**", "docs/**"],
      ["pnpm typecheck", "pnpm lint"]
    ),
    base(
      "claude/security-auditor",
      "Security Auditor",
      "claude-code",
      "claude-direct",
      "Scans code for OWASP top-10 vulnerabilities and secret leaks",
      ["security audit", "credential check", "injection risk detection"],
      ["UI layout", "copy changes"],
      ["lib/**", "app/api/**"],
      ["pnpm lint"]
    ),

    // ---- Codex subagents ----
    base(
      "codex/regression-qa",
      "Regression QA",
      "codex",
      "codex-direct",
      "Runs existing test suite and reports failures introduced by recent changes",
      ["test regression", "CI pre-check", "unit test validation"],
      ["visual QA", "architecture decisions"],
      ["**/*.test.ts", "**/*.spec.ts"],
      ["pnpm test", "pnpm typecheck"]
    ),
    base(
      "codex/type-error-fixer",
      "Type Error Fixer",
      "codex",
      "codex-direct",
      "Fixes TypeScript type errors reported by the compiler without changing logic",
      ["typecheck fix", "TS migration", "strict mode adoption"],
      ["business logic changes", "new feature implementation"],
      ["lib/**/*.ts", "app/**/*.ts"],
      ["pnpm typecheck"]
    ),

    // ---- Antigravity subagents ----
    base(
      "antigravity/visual-qa",
      "Visual QA",
      "antigravity",
      "antigravity-direct",
      "Validates UI rendering matches design specs via screenshot comparison",
      ["visual regression", "design QA", "layout verification"],
      ["backend logic", "data layer"],
      ["app/components/**", "app/**/page.tsx", "public/**"],
      []
    ),
    base(
      "antigravity/ui-consistency-checker",
      "UI Consistency Checker",
      "antigravity",
      "vibe-kanban-workbench",
      "Checks component library usage and design token consistency across pages",
      ["design system audit", "component audit", "style consistency"],
      ["API design", "orchestration logic"],
      ["app/components/**", "app/**/page.tsx"],
      []
    ),
  ];
}
