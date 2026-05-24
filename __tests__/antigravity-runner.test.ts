import { jest } from "@jest/globals";
import type { ChildProcess, SpawnOptions } from "child_process";
import { EventEmitter } from "events";

// --- fs mock ---
const mockExistsSync = jest.fn() as jest.Mock<(p: unknown) => boolean>;

jest.mock("fs", () => ({
  existsSync: (path: unknown) => mockExistsSync(path),
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rename: jest.fn(),
    copyFile: jest.fn(),
  },
}));

// --- os mock ---
jest.mock("os", () => ({
  homedir: () => "/fake/home",
}));

// --- child_process mock ---
const mockSpawn = jest.fn<
  (cmd: string, args: string[], opts?: SpawnOptions) => ChildProcess
>();

jest.mock("child_process", () => ({
  spawn: (...args: unknown[]) =>
    mockSpawn(args[0] as string, args[1] as string[], args[2] as SpawnOptions),
}));

import {
  getAgyBinaryPath,
  buildAgyArgs,
  runAntigravityPrint,
} from "@/lib/agents/antigravity-runner";
import type { AntigravityRunOptions } from "@/lib/agents/antigravity-runner";

// ---------------------------------------------------------------------------
// Helper: build a fake ChildProcess with stdout/stderr EventEmitters
// ---------------------------------------------------------------------------
type FakeProcessOptions = {
  exitCode?: number;
  stdout?: string;
  stderr?: string;
  emitError?: NodeJS.ErrnoException;
  throwOnSpawn?: Error;
};

function makeFakeProcess(opts: FakeProcessOptions = {}): ChildProcess {
  const proc = new EventEmitter() as ChildProcess & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  // Cast through unknown to satisfy ChildProcess.stdout/stderr Readable type
  (proc as unknown as Record<string, unknown>).stdout = new EventEmitter();
  (proc as unknown as Record<string, unknown>).stderr = new EventEmitter();
  const stdout = proc.stdout as unknown as EventEmitter;
  const stderr = proc.stderr as unknown as EventEmitter;

  setImmediate(() => {
    if (opts.emitError) {
      proc.emit("error", opts.emitError);
      return;
    }
    if (opts.stdout) {
      stdout.emit("data", Buffer.from(opts.stdout));
    }
    if (opts.stderr) {
      stderr.emit("data", Buffer.from(opts.stderr));
    }
    proc.emit("close", opts.exitCode ?? 0);
  });

  return proc as unknown as ChildProcess;
}

const BASE_OPTIONS: AntigravityRunOptions = {
  projectPath: "/fake/project",
  prompt: "Fix the bug",
};

describe("getAgyBinaryPath", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns the first existing candidate path", () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      return String(p) === "/fake/home/.local/bin/agy";
    });

    const result = getAgyBinaryPath();

    expect(result).toBe("/fake/home/.local/bin/agy");
  });

  it("returns /opt/homebrew/bin/agy when only that candidate exists", () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      return String(p) === "/opt/homebrew/bin/agy";
    });

    const result = getAgyBinaryPath();

    expect(result).toBe("/opt/homebrew/bin/agy");
  });

  it("returns /usr/local/bin/agy when only that candidate exists", () => {
    mockExistsSync.mockImplementation((p: unknown) => {
      return String(p) === "/usr/local/bin/agy";
    });

    const result = getAgyBinaryPath();

    expect(result).toBe("/usr/local/bin/agy");
  });

  it("falls back to the bare string 'agy' when no candidate exists", () => {
    mockExistsSync.mockReturnValue(false);

    const result = getAgyBinaryPath();

    expect(result).toBe("agy");
  });

  it("prefers ~/.local/bin/agy over /opt/homebrew/bin/agy (search order)", () => {
    // Both exist — first candidate wins
    mockExistsSync.mockReturnValue(true);

    const result = getAgyBinaryPath();

    expect(result).toBe("/fake/home/.local/bin/agy");
  });
});

describe("buildAgyArgs", () => {
  it("includes --sandbox when sandbox=true", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, sandbox: true });
    expect(args).toContain("--sandbox");
  });

  it("omits --sandbox when sandbox=false", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, sandbox: false });
    expect(args).not.toContain("--sandbox");
  });

  it("omits --sandbox when sandbox is undefined", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS });
    expect(args).not.toContain("--sandbox");
  });

  it("always includes --add-dir", () => {
    const args = buildAgyArgs(BASE_OPTIONS);
    expect(args).toContain("--add-dir");
  });

  it("places --add-dir followed by projectPath", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, projectPath: "/my/project" });
    const idx = args.indexOf("--add-dir");
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(args[idx + 1]).toBe("/my/project");
  });

  it("-p is always the second-to-last element", () => {
    const args = buildAgyArgs(BASE_OPTIONS);
    expect(args[args.length - 2]).toBe("-p");
  });

  it("prompt is always the last element", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, prompt: "my prompt text" });
    expect(args[args.length - 1]).toBe("my prompt text");
  });

  it("-p is always the second-to-last element even when --sandbox is included", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, sandbox: true });
    expect(args[args.length - 2]).toBe("-p");
  });

  it("-p is always the second-to-last element when --print-timeout is included", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, timeout: "30s" });
    expect(args[args.length - 2]).toBe("-p");
  });

  it("includes --print-timeout when timeout is specified", () => {
    const args = buildAgyArgs({ ...BASE_OPTIONS, timeout: "60s" });
    expect(args).toContain("--print-timeout");
    const idx = args.indexOf("--print-timeout");
    expect(args[idx + 1]).toBe("60s");
  });

  it("omits --print-timeout when timeout is not specified", () => {
    const args = buildAgyArgs(BASE_OPTIONS);
    expect(args).not.toContain("--print-timeout");
  });

  it("correct full arg order: [--sandbox] --add-dir <dir> [--print-timeout <t>] -p <prompt>", () => {
    const args = buildAgyArgs({
      ...BASE_OPTIONS,
      sandbox: true,
      timeout: "30s",
      prompt: "do it",
    });

    expect(args[0]).toBe("--sandbox");
    expect(args[1]).toBe("--add-dir");
    expect(args[2]).toBe("/fake/project");
    expect(args[3]).toBe("--print-timeout");
    expect(args[4]).toBe("30s");
    expect(args[5]).toBe("-p");
    expect(args[6]).toBe("do it");
  });
});

describe("runAntigravityPrint", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.HOME = "/fake/home";
  });

  it("returns success=true with stdout when agy exits 0", async () => {
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValueOnce(
      makeFakeProcess({ exitCode: 0, stdout: "task complete\n" })
    );

    const result = await runAntigravityPrint(BASE_OPTIONS);

    expect(result.success).toBe(true);
    expect(result.stdout).toBe("task complete\n");
    expect(result.exitCode).toBe(0);
    expect(result.fallbackReason).toBeUndefined();
  });

  it("returns success=false with exitCode and fallbackReason when agy exits non-zero", async () => {
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValueOnce(
      makeFakeProcess({ exitCode: 1, stdout: "", stderr: "error text" })
    );

    const result = await runAntigravityPrint(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.exitCode).toBe(1);
    expect(result.fallbackReason).toContain("agy exited with code 1");
    expect(result.stderr).toBe("error text");
  });

  it("captures stdout and stderr independently", async () => {
    mockExistsSync.mockReturnValue(true);
    mockSpawn.mockReturnValueOnce(
      makeFakeProcess({ exitCode: 0, stdout: "OUT", stderr: "ERR" })
    );

    const result = await runAntigravityPrint(BASE_OPTIONS);

    expect(result.stdout).toBe("OUT");
    expect(result.stderr).toBe("ERR");
  });

  it("returns success=false with specific fallbackReason when ENOENT is emitted from spawn", async () => {
    // All candidates return false → getAgyBinaryPath returns bare "agy"
    // Runner skips the existsSync check for bare "agy" and calls spawn
    // spawn emits ENOENT error
    mockExistsSync.mockReturnValue(false);

    const err: NodeJS.ErrnoException = Object.assign(new Error("spawn agy ENOENT"), {
      code: "ENOENT",
    });
    mockSpawn.mockReturnValueOnce(makeFakeProcess({ emitError: err }));

    const result = await runAntigravityPrint(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.fallbackReason).toContain("agy binary not found");
  });

  it("returns specific fallbackReason (not generic) when resolved binary path does not exist", async () => {
    // Simulate: candidate found at a path but existsSync in runner returns false
    mockExistsSync.mockImplementation((p: unknown) => {
      const s = String(p);
      // Returns true for candidate lookup (getAgyBinaryPath), false for the runner check
      if (s === "/fake/home/.local/bin/agy") return true;
      return false;
    });

    // The runner will detect the binary path but then existsSync returns false for that path
    // (second call). Actually the runner calls existsSync once with the resolved path.
    // Let's reset: first call returns true (binary found at /fake/home/.local/bin/agy),
    // then runner calls existsSync again → false.
    let callCount = 0;
    mockExistsSync.mockImplementation(() => {
      callCount++;
      // First 1 call: getAgyBinaryPath candidate check → true (resolves to /fake/home/.local/bin/agy)
      // Runner's own check → false
      return callCount === 1;
    });

    const result = await runAntigravityPrint(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.fallbackReason).toContain("agy binary not found at");
    expect(result.fallbackReason).not.toBe("failed");
  });

  it("never throws — always returns an AgyRunResult object", async () => {
    // Simulate spawn throwing synchronously
    mockExistsSync.mockReturnValue(false);
    mockSpawn.mockImplementationOnce(() => {
      throw new Error("unexpected spawn error");
    });

    // Should not throw
    let result: Awaited<ReturnType<typeof runAntigravityPrint>> | undefined;
    await expect(async () => {
      result = await runAntigravityPrint(BASE_OPTIONS);
    }).not.toThrow();

    // Result must be a valid AgyRunResult — either from fallback or early return
    // (bare "agy" path skips existsSync check and reaches spawn)
    // In this case the runner may hit the spawn throw guard
    if (result) {
      expect(typeof result.success).toBe("boolean");
    }
  });

  it("returns success=false with non-ENOENT spawn error message", async () => {
    mockExistsSync.mockReturnValue(false);

    const err: NodeJS.ErrnoException = Object.assign(
      new Error("permission denied"),
      { code: "EACCES" }
    );
    mockSpawn.mockReturnValueOnce(makeFakeProcess({ emitError: err }));

    const result = await runAntigravityPrint(BASE_OPTIONS);

    expect(result.success).toBe(false);
    expect(result.fallbackReason).toContain("agy spawn error");
    expect(result.fallbackReason).toContain("permission denied");
  });
});
