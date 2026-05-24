// Antigravity CLI Runner
import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

export type AntigravityRunOptions = {
  projectPath: string;
  prompt: string;
  targetModel?: string;
  sandbox?: boolean;
  timeout?: string;
  restorePreviousModel?: boolean;
};

export type AgyArgs = {
  sandbox?: boolean;
  addDir?: string;
  printTimeout?: string;
  prompt: string;
};

export type AgyRunResult = {
  success: boolean;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  fallbackReason?: string;
};

/**
 * Resolve the agy binary path.
 * Search order: ~/.local/bin, /opt/homebrew/bin, /usr/local/bin, then PATH fallback "agy".
 */
export const getAgyBinaryPath = (): string => {
  const candidates = [
    path.join(os.homedir(), ".local", "bin", "agy"),
    path.join("/opt", "homebrew", "bin", "agy"),
    path.join("/usr", "local", "bin", "agy"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fall back to PATH resolution — let the OS find it
  return "agy";
};

/**
 * Build agy command arguments.
 * CRITICAL: -p must be the LAST flag, with the prompt immediately after.
 *
 * Correct order:
 *   agy [--sandbox] [--add-dir <dir>] [--print-timeout <t>] -p "<prompt>"
 */
export function buildAgyArgs(options: AntigravityRunOptions): string[] {
  const args: string[] = [];

  if (options.sandbox) {
    args.push("--sandbox");
  }

  args.push("--add-dir", options.projectPath);

  if (options.timeout) {
    args.push("--print-timeout", options.timeout);
  }

  // -p MUST be last flag; prompt follows immediately
  args.push("-p", options.prompt);

  return args;
}

/**
 * Run Antigravity in print mode.
 * Never throws — always returns AgyRunResult with a specific fallbackReason on failure.
 */
export async function runAntigravityPrint(
  options: AntigravityRunOptions
): Promise<AgyRunResult> {
  const binaryPath = getAgyBinaryPath();

  // Verify the binary exists when we have a resolved path (not bare "agy")
  if (binaryPath !== "agy" && !fs.existsSync(binaryPath)) {
    return {
      success: false,
      fallbackReason: `agy binary not found at ${binaryPath}`,
    };
  }

  const args = buildAgyArgs(options);

  return new Promise<AgyRunResult>((resolve) => {
    let settled = false;
    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];

    let child;
    try {
      child = spawn(binaryPath, args, {
        cwd: options.projectPath,
        shell: false,
        env: { ...process.env },
      });
    } catch (err) {
      return resolve({
        success: false,
        fallbackReason: `agy binary not found at ${binaryPath}`,
      });
    }

    child.stdout?.on("data", (data: Buffer) => stdoutChunks.push(data.toString()));
    child.stderr?.on("data", (data: Buffer) => stderrChunks.push(data.toString()));

    child.on("error", (err: NodeJS.ErrnoException) => {
      if (settled) return;
      settled = true;

      const reason =
        err.code === "ENOENT"
          ? `agy binary not found at ${binaryPath}`
          : `agy spawn error: ${err.message}`;

      resolve({ success: false, fallbackReason: reason });
    });

    child.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;

      const stdout = stdoutChunks.join("");
      const stderr = stderrChunks.join("");
      const exitCode = code ?? -1;

      if (exitCode !== 0) {
        resolve({
          success: false,
          stdout,
          stderr,
          exitCode,
          fallbackReason: `agy exited with code ${exitCode}`,
        });
      } else {
        resolve({ success: true, stdout, stderr, exitCode });
      }
    });
  });
}
