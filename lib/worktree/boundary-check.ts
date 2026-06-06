/**
 * Boundary Check — ACR Kernel (PRD §12.3)
 *
 * Given the files an agent actually changed in its worktree, decide whether the
 * change stayed inside its allowed sandbox. Two independent gates:
 *
 *   1. Hard block: .env / *lock* / node_modules / .git are NEVER allowed,
 *      regardless of allowed/blocked globs. (PRD §12.3 금지 목록)
 *   2. Configured boundary: a file must match at least one allowedFiles glob
 *      and must not match any blockedFiles glob.
 *
 * A self-contained glob matcher is used (only `**`, `*`, `?` and literals are
 * supported) so this module has no dependency on any transitive package.
 */

// ─── glob ────────────────────────────────────────────────────────────────────

/**
 * Compile a glob to a RegExp. Supported tokens, POSIX-path semantics:
 *   **  → any number of path segments (including across `/`)
 *   *   → any run of non-`/` characters
 *   ?   → a single non-`/` character
 * Everything else is matched literally. Matching is anchored (full string).
 */
function globToRegExp(glob: string): RegExp {
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === "*") {
      if (glob[i + 1] === "*") {
        // `**` (optionally followed by `/`) → match across segments
        i++;
        if (glob[i + 1] === "/") {
          i++;
          re += "(?:.*/)?";
        } else {
          re += ".*";
        }
      } else {
        re += "[^/]*";
      }
    } else if (c === "?") {
      re += "[^/]";
    } else if ("\\^$.|+()[]{}".includes(c)) {
      re += `\\${c}`;
    } else {
      re += c;
    }
  }
  return new RegExp(`^${re}$`);
}

/** Normalize a path to forward slashes, no leading "./". */
function normalize(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\.\//, "");
}

/** True if `file` matches any of the given globs. */
export function matchesAnyGlob(file: string, globs: string[]): boolean {
  const f = normalize(file);
  return globs.some((g) => globToRegExp(normalize(g)).test(f));
}

// ─── hard block ──────────────────────────────────────────────────────────────

/**
 * Files that are blocked unconditionally (PRD §12.3 / §14.8). Matches the file
 * itself or anything under a blocked directory.
 */
const HARD_BLOCK_GLOBS = [
  "**/.env",
  "**/.env.*",
  ".env",
  ".env.*",
  "**/*lock*",
  "**/node_modules/**",
  "node_modules/**",
  "**/.git/**",
  ".git/**",
];

function isHardBlocked(file: string): boolean {
  return matchesAnyGlob(file, HARD_BLOCK_GLOBS);
}

// ─── boundary check ──────────────────────────────────────────────────────────

export type BoundaryCheckInput = {
  changedFiles: string[];
  allowedFiles: string[];
  blockedFiles: string[];
};

export type BoundaryCheckResult = {
  /** 'pass' if every changed file is inside the sandbox, else 'fail'. */
  status: "pass" | "fail";
  /** Files that violated a boundary rule. */
  violations: string[];
  /** Human-readable reason per violating file (same order as violations). */
  reasons: string[];
};

/**
 * Evaluate changed files against the run's boundary.
 *
 * A file is a violation when ANY of these is true:
 *   - it is hard-blocked (.env / lockfile / node_modules / .git)
 *   - it matches a blockedFiles glob
 *   - allowedFiles is non-empty and the file matches none of them
 *
 * When allowedFiles is empty the allowed-set gate is disabled (only hard-block
 * and blockedFiles apply) — this supports C0/safe modes that pass no allow-list.
 */
export function checkBoundary(input: BoundaryCheckInput): BoundaryCheckResult {
  const violations: string[] = [];
  const reasons: string[] = [];

  for (const raw of input.changedFiles) {
    const file = normalize(raw);

    if (isHardBlocked(file)) {
      violations.push(file);
      reasons.push("hard-blocked path (.env / lockfile / node_modules / .git)");
      continue;
    }
    if (matchesAnyGlob(file, input.blockedFiles)) {
      violations.push(file);
      reasons.push("matches blockedFiles glob");
      continue;
    }
    if (input.allowedFiles.length > 0 && !matchesAnyGlob(file, input.allowedFiles)) {
      violations.push(file);
      reasons.push("outside allowedFiles globs");
      continue;
    }
  }

  return {
    status: violations.length === 0 ? "pass" : "fail",
    violations,
    reasons,
  };
}
