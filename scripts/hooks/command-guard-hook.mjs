#!/usr/bin/env node
/**
 * Command Guard Hook — Claude Code PreToolUse (PRD §14.8 / §19.1).
 *
 * Registered as a Bash PreToolUse hook in .claude/settings.json. It reads the
 * hook payload as JSON on stdin, extracts the Bash `command`, and runs it
 * through the same deny rules as lib/harness/command-guard.ts. A blocked
 * command exits NON-ZERO (exit 2) with a reason on stderr, which tells Claude
 * Code to veto the tool call. Anything else exits 0 (allow).
 *
 * SOURCE OF TRUTH: lib/harness/command-guard.ts. The BLOCK_RULES below are kept
 * byte-identical to that file's regexes (verified by
 * __tests__/lib/harness/command-guard-hook.test.ts which asserts the hook and
 * the TS guard agree). The hook is a plain .mjs (no build step) so it can run
 * directly from settings.json; that is why the patterns are mirrored here
 * rather than imported from the .ts module.
 *
 * NON-DESTRUCTIVE: only the §19.1 destructive-deny shapes are blocked. Normal
 * dev commands (pnpm build / typecheck / test / git status / git add ...) pass.
 */

const INSTALL_MANAGERS = ["pnpm", "npm", "yarn", "bun"];

/** Collapse whitespace + lowercase, matching command-guard.ts. */
function normalizeCommand(cmd) {
  return cmd.trim().replace(/\s+/g, " ").toLowerCase();
}

function hasPackageArg(tail) {
  return tail
    .split(/[;&|]/)[0]
    .trim()
    .split(" ")
    .some((tok) => tok.length > 0 && !tok.startsWith("-"));
}

function isPackageInstallWithName(c) {
  for (const mgr of INSTALL_MANAGERS) {
    const addMatch = c.match(new RegExp(`\\b${mgr}\\s+add\\s+(.+)`));
    if (addMatch && hasPackageArg(addMatch[1])) return true;
    const installMatch = c.match(new RegExp(`\\b${mgr}\\s+(install|i)\\s+(.+)`));
    if (installMatch && hasPackageArg(installMatch[2])) return true;
  }
  return false;
}

// Mirror of lib/harness/command-guard.ts BLOCK_RULES (same order, same regexes).
const BLOCK_RULES = [
  {
    reason: "rm -rf is destructive and forbidden (PRD §14.8/§19.1)",
    test: (c) => /(^|[;&|]\s*)rm\s+(-[a-z]*r[a-z]*f|-[a-z]*f[a-z]*r|-r\s+-f|-f\s+-r)\b/.test(c),
  },
  {
    reason: "git push is forbidden — the orchestrator owns pushes (PRD §14.8)",
    test: (c) => /\bgit\s+push\b/.test(c),
  },
  {
    reason: "git reset --hard discards work and is forbidden (PRD §14.8)",
    test: (c) => /\bgit\s+reset\s+.*--hard\b/.test(c),
  },
  {
    reason: ".env modification is forbidden (PRD §14.8/§12.3)",
    test: (c) =>
      /(>>?|\btee\b)\s*[^ ]*\.env\b/.test(c) ||
      /\b(sed|cat|vi|vim|nano|printf|echo)\b[^;&|]*\.env\b[^;&|]*(>|>>)/.test(c) ||
      /\.env\b[^;&|]*(>|>>)/.test(c),
  },
  {
    reason: "node_modules modification is forbidden (PRD §14.8/§12.3)",
    test: (c) => /\b(rm|mv|cp|sed|chmod|chown)\b[^;&|]*node_modules\b/.test(c),
  },
  {
    reason: ".git directory must not be modified directly (PRD §14.8/§12.3)",
    test: (c) => /\b(rm|mv|cp|sed|chmod|echo|cat|printf)\b[^;&|]*(^|\/|\s)\.git\//.test(c),
  },
  {
    reason: "lockfile must not be modified unsanctioned (PRD §14.8/§12.3)",
    test: (c) =>
      /\b(rm|mv|cp|sed|chmod)\b[^;&|]*(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)\b/.test(c) ||
      /(>>?|\btee\b)\s*[^ ]*(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb)\b/.test(c),
  },
  {
    reason: "production deploy is forbidden (PRD §14.8/§19.1)",
    test: (c) =>
      /\b(deploy|publish)\b[^;&|]*\b(prod|production)\b/.test(c) ||
      /\b(prod|production)\b[^;&|]*\b(deploy|publish)\b/.test(c) ||
      /\bvercel\s+(deploy\s+)?--prod\b/.test(c) ||
      /\bnpm\s+publish\b/.test(c),
  },
  {
    reason: "database migration apply is forbidden (PRD §14.8/§19.1)",
    test: (c) =>
      /\bmigrat(e|ion)\b[^;&|]*\b(apply|up|deploy|run)\b/.test(c) ||
      /\b(apply|up|deploy|run)\b[^;&|]*\bmigrat(e|ion)\b/.test(c) ||
      /\b(prisma|drizzle-kit|knex|sequelize|supabase)\b[^;&|]*\bmigrat/.test(c) ||
      /\bdb\s+(push|migrate)\b/.test(c),
  },
  {
    reason: "unknown package install requires approval (PRD §14.8/§19.1)",
    test: (c) => isPackageInstallWithName(c),
  },
];

/** Returns { allowed, reason }. Exported shape mirrors checkCommand(). */
export function checkCommand(cmd) {
  const normalized = normalizeCommand(cmd);
  if (normalized.length === 0) return { allowed: true };
  for (const rule of BLOCK_RULES) {
    if (rule.test(normalized)) return { allowed: false, reason: rule.reason };
  }
  return { allowed: true };
}

/** Pull the Bash command string out of a Claude Code PreToolUse payload. */
function extractCommand(payload) {
  const input = payload?.tool_input ?? payload?.toolInput ?? {};
  return typeof input.command === "string" ? input.command : "";
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const raw = await readStdin();
  let payload;
  try {
    payload = raw.trim() ? JSON.parse(raw) : {};
  } catch {
    // Unparseable payload: fail open (allow) rather than block normal dev.
    process.exit(0);
  }
  const command = extractCommand(payload);
  const verdict = checkCommand(command);
  if (!verdict.allowed) {
    process.stderr.write(
      `[command-guard] BLOCKED: ${verdict.reason}\n  command: ${command}\n`,
    );
    process.exit(2); // non-zero → Claude Code vetoes the tool call.
  }
  process.exit(0);
}

// Only run the stdin loop when invoked as a script (not when imported by tests).
// Compare resolved file URLs so it works regardless of how argv[1] was spelled
// (relative path, spaces, non-ASCII chars in the repo path, etc.).
import { realpathSync } from "fs";
import { pathToFileURL } from "url";

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  try {
    return import.meta.url === pathToFileURL(realpathSync(entry)).href;
  } catch {
    return false;
  }
}

if (invokedDirectly()) {
  main();
}
