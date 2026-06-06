/**
 * Tests for lib/harness/verification-runner.ts (PRD §13)
 *
 * The command runner is mocked so no real processes spawn. Uses os.tmpdir()
 * for the (nominal) cwd to keep the test filesystem-isolated.
 */

import os from "os";
import path from "path";
import {
  runVerification,
  DEFAULT_VERIFICATION_COMMANDS,
  type CommandRunner,
  type VerifiableCheck,
} from "@/lib/harness/verification-runner";
import type { VerificationProfile } from "@/lib/harness/types";

const cwd = path.join(os.tmpdir(), "acr-verify-test", "worktree");

function profile(overrides: Partial<VerificationProfile> = {}): VerificationProfile {
  return {
    typecheck: false,
    lint: false,
    test: false,
    build: false,
    playwright: false,
    boundary: false,
    ...overrides,
  };
}

/** A runner that returns exit 0 for everything and records calls. */
function passingRunner(): { runner: CommandRunner; calls: Array<[string, string]> } {
  const calls: Array<[string, string]> = [];
  const runner: CommandRunner = async (command, dir) => {
    calls.push([command, dir]);
    return { exitCode: 0, output: "" };
  };
  return { runner, calls };
}

describe("runVerification — profile gating", () => {
  it("marks unrequested checks as skipped and does not run them", async () => {
    const { runner, calls } = passingRunner();
    const { checks } = await runVerification({
      cwd,
      profile: profile({ typecheck: true }),
      runner,
    });

    expect(checks.typecheck).toBe("pass");
    expect(checks.lint).toBe("skipped");
    expect(checks.test).toBe("skipped");
    expect(checks.build).toBe("skipped");
    expect(checks.playwright).toBe("skipped");
    expect(checks.boundary).toBe("skipped");

    // only the requested check ran, in the injected cwd
    expect(calls).toEqual([[DEFAULT_VERIFICATION_COMMANDS.typecheck, cwd]]);
  });

  it("runs every requested check independently", async () => {
    const { runner, calls } = passingRunner();
    const { checks } = await runVerification({
      cwd,
      profile: profile({ typecheck: true, build: true }),
      runner,
    });

    expect(checks.typecheck).toBe("pass");
    expect(checks.build).toBe("pass");
    expect(calls.map((c) => c[0])).toEqual([
      DEFAULT_VERIFICATION_COMMANDS.typecheck,
      DEFAULT_VERIFICATION_COMMANDS.build,
    ]);
  });
});

describe("runVerification — failure handling (PRD §13.2)", () => {
  it("reports fail on non-zero exit and returns a log tail", async () => {
    const runner: CommandRunner = async (command) => {
      if (command === DEFAULT_VERIFICATION_COMMANDS.typecheck) {
        return { exitCode: 2, output: "src/x.ts(1,1): error TS2304" };
      }
      return { exitCode: 0, output: "" };
    };

    const { checks, logTail } = await runVerification({
      cwd,
      profile: profile({ typecheck: true, build: true }),
      runner,
    });

    expect(checks.typecheck).toBe("fail");
    expect(checks.build).toBe("pass");
    expect(logTail).toContain("error TS2304");
    expect(logTail).toContain("[typecheck]");
  });

  it("treats a thrown runner error as fail (실행 실패=fail)", async () => {
    const runner: CommandRunner = async () => {
      throw new Error("spawn ENOENT");
    };

    const { checks, logTail } = await runVerification({
      cwd,
      profile: profile({ test: true }),
      runner,
    });

    expect(checks.test).toBe("fail");
    expect(logTail).toContain("spawn ENOENT");
  });

  it("omits log tail when all requested checks pass", async () => {
    const { runner } = passingRunner();
    const { logTail } = await runVerification({
      cwd,
      profile: profile({ typecheck: true }),
      runner,
    });
    expect(logTail).toBeUndefined();
  });
});

describe("runVerification — command injection", () => {
  it("uses overridden command when provided", async () => {
    const { runner, calls } = passingRunner();
    const commands: Partial<Record<VerifiableCheck, string>> = {
      typecheck: "npm run tsc",
    };
    await runVerification({
      cwd,
      profile: profile({ typecheck: true }),
      commands,
      runner,
    });
    expect(calls[0][0]).toBe("npm run tsc");
  });
});

describe("runVerification — boundary handling", () => {
  it("uses a provided boundaryResult when boundary is requested", async () => {
    const { runner } = passingRunner();
    const { checks } = await runVerification({
      cwd,
      profile: profile({ boundary: true }),
      boundaryResult: "fail",
      runner,
    });
    expect(checks.boundary).toBe("fail");
  });

  it("reports boundary skipped when requested but no result supplied", async () => {
    const { runner } = passingRunner();
    const { checks } = await runVerification({
      cwd,
      profile: profile({ boundary: true }),
      runner,
    });
    expect(checks.boundary).toBe("skipped");
  });
});
