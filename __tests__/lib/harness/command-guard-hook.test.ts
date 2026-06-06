/**
 * Tests for scripts/hooks/command-guard-hook.mjs (PRD §14.8 / §19.1).
 *
 * Drives the hook as a real subprocess with a Claude Code PreToolUse JSON
 * payload on stdin, and asserts:
 *   - forbidden commands exit non-zero (vetoed) with a reason on stderr
 *   - normal dev commands exit 0 (allowed)
 *   - the hook's verdict agrees with lib/harness/command-guard.ts (no drift)
 */

import path from "path";
import { execFileSync } from "child_process";
import { checkCommand } from "@/lib/harness/command-guard";

const HOOK = path.join(
  process.cwd(),
  "scripts",
  "hooks",
  "command-guard-hook.mjs",
);

type HookResult = { code: number; stderr: string };

function runHook(command: string): HookResult {
  const payload = JSON.stringify({
    tool_name: "Bash",
    tool_input: { command },
  });
  try {
    execFileSync("node", [HOOK], { input: payload, encoding: "utf8" });
    return { code: 0, stderr: "" };
  } catch (err: unknown) {
    const e = err as { status?: number; stderr?: string };
    return { code: e.status ?? 1, stderr: e.stderr ?? "" };
  }
}

const BLOCKED = [
  "rm -rf .",
  "git push origin main",
  "git reset --hard main",
  "echo SECRET=1 >> .env",
  "pnpm add some-unknown-package",
  "npm publish",
  "supabase migration up",
];

const ALLOWED = [
  "pnpm typecheck",
  "pnpm build",
  "pnpm test",
  "git status",
  "git add -A",
  "git commit -m 'wip'",
  "pnpm install",
  "ls -la",
];

describe("command-guard-hook.mjs", () => {
  it.each(BLOCKED)("blocks: %s", (cmd) => {
    const { code, stderr } = runHook(cmd);
    expect(code).not.toBe(0);
    expect(stderr).toContain("[command-guard] BLOCKED");
  });

  it.each(ALLOWED)("allows: %s", (cmd) => {
    const { code } = runHook(cmd);
    expect(code).toBe(0);
  });

  it("allows when payload has no command", () => {
    try {
      execFileSync("node", [HOOK], {
        input: JSON.stringify({ tool_name: "Read", tool_input: {} }),
        encoding: "utf8",
      });
    } catch {
      throw new Error("hook should allow a payload with no Bash command");
    }
  });

  it("agrees with the TS command-guard (no drift)", () => {
    for (const cmd of [...BLOCKED, ...ALLOWED]) {
      const hookAllowed = runHook(cmd).code === 0;
      expect(hookAllowed).toBe(checkCommand(cmd).allowed);
    }
  });
});
