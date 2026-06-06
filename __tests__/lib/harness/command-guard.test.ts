/**
 * Tests for lib/harness/command-guard.ts (PRD §14.8)
 *
 * Verifies the default-block list and that ordinary build/verify commands stay
 * allowed. Pure string inspection — no filesystem or process needed.
 */

import {
  checkCommand,
  checkCommands,
  allCommandsAllowed,
} from "@/lib/harness/command-guard";

describe("checkCommand — allowed commands", () => {
  const allowed = [
    "pnpm typecheck",
    "pnpm lint",
    "pnpm test",
    "pnpm build",
    "pnpm test:e2e",
    "pnpm install", // bare restore of existing lockfile
    "npm ci",
    "git status",
    "git diff --stat",
    "ls -la",
    "node scripts/agent-worker.mjs",
  ];

  it.each(allowed)("allows: %s", (cmd) => {
    const r = checkCommand(cmd);
    expect(r.allowed).toBe(true);
    expect(r.riskLevel).toBe("safe");
  });

  it("treats empty/whitespace command as safe", () => {
    expect(checkCommand("   ").allowed).toBe(true);
    expect(checkCommand("").riskLevel).toBe("safe");
  });
});

describe("checkCommand — blocked commands (PRD §14.8 default list)", () => {
  const blocked: Array<[string, string]> = [
    ["rm -rf .", "rm -rf"],
    ["rm -fr /tmp/x", "rm -rf (flag order)"],
    ["sudo rm -rf node_modules", "rm -rf node_modules"],
    ["git push origin main", "git push"],
    ["git push --force", "git push force"],
    ["git reset --hard main", "git reset --hard"],
    ["git reset --hard HEAD~1", "git reset --hard"],
    ["echo SECRET=1 > .env", "env redirect"],
    ["echo X >> apps/web/.env", "env append"],
    ["rm node_modules/.bin/foo", "node_modules rm"],
    ["sed -i s/a/b/ .git/config", "git dir edit"],
    ["rm pnpm-lock.yaml", "lockfile rm"],
    ["echo {} > package-lock.json", "lockfile redirect"],
    ["vercel deploy --prod", "production deploy"],
    ["npm publish", "npm publish"],
    ["pnpm deploy production", "deploy production"],
    ["prisma migrate deploy", "migration apply"],
    ["supabase db push", "db push"],
    ["pnpm add left-pad", "unknown package install"],
    ["npm install some-pkg@1.2.3", "named install"],
    ["yarn add react-icons", "yarn add"],
  ];

  it.each(blocked)("blocks: %s (%s)", (cmd) => {
    const r = checkCommand(cmd);
    expect(r.allowed).toBe(false);
    expect(r.riskLevel).toBe("blocked");
    expect(r.reason).toBeTruthy();
  });
});

describe("checkCommands / allCommandsAllowed", () => {
  it("returns a verdict per command, preserving order", () => {
    const results = checkCommands(["pnpm build", "git push origin main"]);
    expect(results).toHaveLength(2);
    expect(results[0].command).toBe("pnpm build");
    expect(results[0].result.allowed).toBe(true);
    expect(results[1].result.allowed).toBe(false);
  });

  it("allCommandsAllowed is false when any command is blocked", () => {
    expect(allCommandsAllowed(["pnpm typecheck", "pnpm build"])).toBe(true);
    expect(allCommandsAllowed(["pnpm typecheck", "rm -rf ."])).toBe(false);
  });
});
