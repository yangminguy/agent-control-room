/**
 * Command Guard — ACR Harness (PRD §14.8)
 *
 * The harness actually blocks forbidden and risky shell commands before any
 * agent command reaches the runner. This is a static, dependency-free string
 * inspector: given a command string it returns whether the command is allowed
 * and at what risk level.
 *
 * Default blocked (PRD §14.8 / §19.1):
 *   - rm -rf
 *   - git push
 *   - git reset --hard
 *   - .env modification
 *   - node_modules modification
 *   - .git direct modification
 *   - lockfile unsanctioned modification
 *   - production deploy
 *   - database migration apply
 *   - unknown package install
 *
 * Conservative by design: when in doubt about a destructive shape, block.
 */

export type CommandRiskLevel = "safe" | "warning" | "blocked";

export type CommandGuardResult = {
  allowed: boolean;
  reason?: string;
  riskLevel: CommandRiskLevel;
};

/** Collapse runs of whitespace and lowercase for stable matching. */
function normalizeCommand(cmd: string): string {
  return cmd.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Known-safe package managers whose `add`/`install` of a *named* package is
 * still treated as an unknown package install (requires approval). A bare
 * `install` / `ci` (restoring the existing lockfile) is allowed.
 */
const INSTALL_MANAGERS = ["pnpm", "npm", "yarn", "bun"];

type Rule = {
  reason: string;
  riskLevel: CommandRiskLevel;
  /** Returns true when the (normalized) command matches this rule. */
  test: (cmd: string) => boolean;
};

/**
 * Block rules. Evaluated in order; the FIRST matching rule decides the result.
 * Each `test` receives the normalized command.
 */
const BLOCK_RULES: Rule[] = [
  {
    reason: "rm -rf is destructive and forbidden (PRD §14.8/§19.1)",
    riskLevel: "blocked",
    test: (c) => /(^|[;&|]\s*)rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r\s+-f|-f\s+-r)\b/.test(c),
  },
  {
    reason: "git push is forbidden — the orchestrator owns pushes (PRD §14.8)",
    riskLevel: "blocked",
    test: (c) => /\bgit\s+push\b/.test(c),
  },
  {
    reason: "git reset --hard discards work and is forbidden (PRD §14.8)",
    riskLevel: "blocked",
    test: (c) => /\bgit\s+reset\s+.*--hard\b/.test(c),
  },
  {
    reason: ".env modification is forbidden (PRD §14.8/§12.3)",
    riskLevel: "blocked",
    // redirect into, or edit of, an .env file
    test: (c) =>
      /(>>?|\btee\b)\s*[^ ]*\.env\b/.test(c) ||
      /\b(sed|cat|vi|vim|nano|printf|echo)\b[^;&|]*\.env\b[^;&|]*(>|>>)/.test(c) ||
      /\.env\b[^;&|]*(>|>>)/.test(c),
  },
  {
    reason: "node_modules modification is forbidden (PRD §14.8/§12.3)",
    riskLevel: "blocked",
    test: (c) => /\b(rm|mv|cp|sed|chmod|chown)\b[^;&|]*node_modules\b/.test(c),
  },
  {
    reason: ".git directory must not be modified directly (PRD §14.8/§12.3)",
    riskLevel: "blocked",
    test: (c) => /\b(rm|mv|cp|sed|chmod|echo|cat|printf)\b[^;&|]*(^|\/|\s)\.git\//.test(c),
  },
  {
    reason: "lockfile must not be modified unsanctioned (PRD §14.8/§12.3)",
    riskLevel: "blocked",
    test: (c) =>
      /\b(rm|mv|cp|sed|chmod)\b[^;&|]*(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)\b/.test(c) ||
      /(>>?|\btee\b)\s*[^ ]*(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)\b/.test(c),
  },
  {
    reason: "production deploy is forbidden (PRD §14.8/§19.1)",
    riskLevel: "blocked",
    test: (c) =>
      /\b(deploy|publish)\b[^;&|]*\b(prod|production)\b/.test(c) ||
      /\b(prod|production)\b[^;&|]*\b(deploy|publish)\b/.test(c) ||
      /\bvercel\s+(deploy\s+)?--prod\b/.test(c) ||
      /\bnpm\s+publish\b/.test(c),
  },
  {
    reason: "database migration apply is forbidden (PRD §14.8/§19.1)",
    riskLevel: "blocked",
    test: (c) =>
      /\bmigrat(e|ion)\b[^;&|]*\b(apply|up|deploy|run)\b/.test(c) ||
      /\b(apply|up|deploy|run)\b[^;&|]*\bmigrat(e|ion)\b/.test(c) ||
      /\b(prisma|drizzle-kit|knex|sequelize|supabase)\b[^;&|]*\bmigrat/.test(c) ||
      /\bdb\s+(push|migrate)\b/.test(c),
  },
  {
    reason: "unknown package install requires approval (PRD §14.8/§19.1)",
    riskLevel: "blocked",
    test: (c) => isPackageInstallWithName(c),
  },
];

/**
 * True when the command installs/adds at least one *named* package
 * (e.g. `pnpm add foo`, `npm install bar@1`). A bare restore install
 * (`pnpm install`, `npm ci`) carries no package name and is NOT blocked here.
 */
function isPackageInstallWithName(c: string): boolean {
  for (const mgr of INSTALL_MANAGERS) {
    // `<mgr> add <pkg>` always names a package
    const addRe = new RegExp(`\\b${mgr}\\s+add\\s+(.+)`);
    const addMatch = c.match(addRe);
    if (addMatch && hasPackageArg(addMatch[1])) return true;

    // `<mgr> install <pkg>` / `<mgr> i <pkg>` — install with an explicit package
    const installRe = new RegExp(`\\b${mgr}\\s+(install|i)\\s+(.+)`);
    const installMatch = c.match(installRe);
    if (installMatch && hasPackageArg(installMatch[2])) return true;
  }
  return false;
}

/** True if the argument tail contains a real package name (not just flags). */
function hasPackageArg(tail: string): boolean {
  return tail
    .split(/[;&|]/)[0]
    .trim()
    .split(" ")
    .some((tok) => tok.length > 0 && !tok.startsWith("-"));
}

/**
 * Inspect a single command. Returns the first matching block rule, or an
 * allowed/safe result when nothing matches.
 */
export function checkCommand(cmd: string): CommandGuardResult {
  const normalized = normalizeCommand(cmd);
  if (normalized.length === 0) {
    return { allowed: true, riskLevel: "safe" };
  }
  for (const rule of BLOCK_RULES) {
    if (rule.test(normalized)) {
      return { allowed: false, reason: rule.reason, riskLevel: rule.riskLevel };
    }
  }
  return { allowed: true, riskLevel: "safe" };
}

export type CommandCheck = {
  command: string;
  result: CommandGuardResult;
};

/** Check a list of commands at once. Each entry keeps its own verdict. */
export function checkCommands(commands: string[]): CommandCheck[] {
  return commands.map((command) => ({ command, result: checkCommand(command) }));
}

/** True when every command in the list is allowed. */
export function allCommandsAllowed(commands: string[]): boolean {
  return checkCommands(commands).every((c) => c.result.allowed);
}
