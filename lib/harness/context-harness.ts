/**
 * Context Harness — ACR Agent Execution Harness (PRD §11 / §14.7).
 *
 * selectContextPack() is a pure function that picks ONLY the rules + docs/index
 * files a given work type (or explicit domain set) needs, instead of loading the
 * whole repo. This is the "Context Tax" defense (§11.1): the global context stays
 * small and per-task rules are injected only when needed (§14.7).
 *
 * It returns relative paths (under the repo root) into the Context Harness pack:
 *   .claude/rules/{00-global,10-pulk-cto,20-acr-runner,30-worktree-policy,
 *                  40-verification-policy,50-ui-playwright,60-nocobase}.md
 *   docs/index/{architecture,api,db,agents,acr-kernel,verification}.md
 *
 * The result shape matches HarnessContextPack.{globalRules,pathRules,docsIndex}
 * (lib/harness/types.ts) so it drops straight into HarnessInput.contextPack.
 * No filesystem or network access — paths only, deterministic, fully unit-testable.
 */

// ─── pack vocabulary ─────────────────────────────────────────────────────────

/** A work type pulk CTO can tag a Work Order with (PRD §14.7 examples). */
export type WorkType =
  | "doc"
  | "ui"
  | "api"
  | "db"
  | "acr-runner"
  | "worktree"
  | "verification"
  | "nocobase"
  | "agent";

/** A context domain — the unit selectContextPack resolves to concrete files. */
export type ContextDomain =
  | "global"
  | "pulk-cto"
  | "acr-runner"
  | "worktree"
  | "verification"
  | "ui"
  | "nocobase"
  | "agents"
  | "architecture"
  | "api"
  | "db"
  | "acr-kernel";

export type SelectContextPackInput =
  | { workType: WorkType; domains?: ContextDomain[] }
  | { domains: ContextDomain[]; workType?: never };

/** Mirrors HarnessContextPack (minus handoff, which the pipeline injects). */
export type ContextPackSelection = {
  globalRules: string[];
  pathRules: string[];
  docsIndex: string[];
};

// ─── path tables ─────────────────────────────────────────────────────────────

const RULES_DIR = ".claude/rules";
const DOCS_DIR = "docs/index";

/** 00-global is ALWAYS loaded (PRD §11.2 / §14.7). */
const GLOBAL_RULE = `${RULES_DIR}/00-global.md`;

/** Domain → path-scoped rule file. (global handled separately.) */
const DOMAIN_RULE: Partial<Record<ContextDomain, string>> = {
  "pulk-cto": `${RULES_DIR}/10-pulk-cto.md`,
  "acr-runner": `${RULES_DIR}/20-acr-runner.md`,
  worktree: `${RULES_DIR}/30-worktree-policy.md`,
  verification: `${RULES_DIR}/40-verification-policy.md`,
  ui: `${RULES_DIR}/50-ui-playwright.md`,
  nocobase: `${RULES_DIR}/60-nocobase.md`,
};

/** Domain → docs/index file. */
const DOMAIN_DOC: Partial<Record<ContextDomain, string>> = {
  architecture: `${DOCS_DIR}/architecture.md`,
  api: `${DOCS_DIR}/api.md`,
  db: `${DOCS_DIR}/db.md`,
  agents: `${DOCS_DIR}/agents.md`,
  "acr-kernel": `${DOCS_DIR}/acr-kernel.md`,
  verification: `${DOCS_DIR}/verification.md`,
};

/**
 * Work type → the minimal domain set it needs (PRD §14.7).
 * "global" is implicit and always added.
 */
const WORK_TYPE_DOMAINS: Record<WorkType, ContextDomain[]> = {
  doc: ["architecture"],
  ui: ["ui", "architecture"],
  api: ["acr-runner", "verification", "api", "architecture"],
  db: ["db", "verification"],
  "acr-runner": ["acr-runner", "worktree", "verification", "acr-kernel"],
  worktree: ["worktree", "acr-runner", "acr-kernel"],
  verification: ["verification", "acr-kernel"],
  nocobase: ["nocobase", "db", "architecture"],
  agent: ["acr-runner", "agents", "acr-kernel"],
};

// ─── core ────────────────────────────────────────────────────────────────────

/** Stable de-dup preserving first-seen order. */
function uniq(paths: string[]): string[] {
  return [...new Set(paths)];
}

/**
 * Resolve the minimal Context Pack for a work order. Pass a `workType` for the
 * curated preset, and/or explicit `domains` to add. `00-global.md` is always
 * included. Returns deterministic, de-duplicated relative paths.
 */
export function selectContextPack(
  input: SelectContextPackInput,
): ContextPackSelection {
  const domains = new Set<ContextDomain>(["global"]);

  if ("workType" in input && input.workType) {
    for (const d of WORK_TYPE_DOMAINS[input.workType]) domains.add(d);
  }
  if (input.domains) {
    for (const d of input.domains) domains.add(d);
  }

  const pathRules: string[] = [];
  const docsIndex: string[] = [];

  for (const d of domains) {
    const rule = DOMAIN_RULE[d];
    if (rule) pathRules.push(rule);
    const doc = DOMAIN_DOC[d];
    if (doc) docsIndex.push(doc);
  }

  return {
    globalRules: [GLOBAL_RULE],
    pathRules: uniq(pathRules),
    docsIndex: uniq(docsIndex),
  };
}
