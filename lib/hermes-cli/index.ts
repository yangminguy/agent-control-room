/**
 * Hermes CLI runner.
 *
 * Thin wrapper around the local `hermes` binary in non-interactive quiet mode
 * (`hermes chat -q "<prompt>" -m <model> -Q`). It spawns the process, streams
 * stdout/stderr as events, enforces a 30-minute timeout, and resolves with the
 * captured output.
 *
 * Hermes runs as an approval-based background worker. This runner does NOT grant
 * Hermes any code-execution tools — it disables toolsets so the call is a plain
 * LLM completion used for analysis/summary/validation prompts only.
 */

import { spawn } from "node:child_process";

// ── Public types ────────────────────────────────────────────────────────────

export type HermesCliEventType = "stdout" | "stderr" | "start" | "exit" | "error";

export interface HermesCliEvent {
  type: HermesCliEventType;
  /** Raw text line for stdout/stderr, status text for lifecycle events. */
  data: string;
  timestamp: string;
}

export interface HermesCliResult {
  /** Full captured stdout. */
  stdout: string;
  /** Full captured stderr. */
  stderr: string;
  /** Process exit code, or null if killed before exit. */
  exitCode: number | null;
  /** True when the process exited 0 within the timeout window. */
  ok: boolean;
  /** True when the run was aborted by the timeout. */
  timedOut: boolean;
  /** All emitted events in order. */
  events: HermesCliEvent[];
  /** Total wall-clock duration in milliseconds. */
  durationMs: number;
}

export interface RunHermesCliOptions {
  /** Model to pass via `-m`. Defaults to gpt-4o (configured in ~/.hermes). */
  model?: string;
  /** Override the hermes binary path / command name. */
  binary?: string;
  /** Working directory for the spawned process. */
  cwd?: string;
  /** Timeout in milliseconds. Defaults to 30 minutes. */
  timeoutMs?: number;
  /** Per-event callback for live streaming. */
  onEvent?: (event: HermesCliEvent) => void;
}

// ── Config ──────────────────────────────────────────────────────────────────

const DEFAULT_BINARY = process.env.HERMES_CLI_BIN ?? "hermes";
const DEFAULT_MODEL = process.env.HERMES_MODEL ?? "gpt-4o";
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ── Runner ──────────────────────────────────────────────────────────────────

/**
 * Run a single non-interactive Hermes prompt and capture its output.
 *
 * Never rejects on a non-zero exit — inspect `result.ok` / `result.exitCode`.
 * Only rejects if the process cannot be spawned at all.
 */
export function runHermesCli(
  prompt: string,
  options: RunHermesCliOptions = {},
): Promise<HermesCliResult> {
  const {
    model = DEFAULT_MODEL,
    binary = DEFAULT_BINARY,
    cwd,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    onEvent,
  } = options;

  return new Promise<HermesCliResult>((resolve, reject) => {
    const events: HermesCliEvent[] = [];
    const startedAt = Date.now();

    const emit = (type: HermesCliEventType, data: string) => {
      const event: HermesCliEvent = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };
      events.push(event);
      onEvent?.(event);
    };

    // `-Q` quiet mode: only the final response is printed to stdout.
    // `-t ""` disables toolsets so Hermes performs no code execution.
    const args = ["chat", "-q", prompt, "-m", model, "-Q", "-t", ""];

    let child;
    try {
      child = spawn(binary, args, {
        cwd,
        env: process.env,
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      reject(err instanceof Error ? err : new Error(String(err)));
      return;
    }

    emit("start", `${binary} chat -m ${model}`);

    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;

    const timer = setTimeout(() => {
      timedOut = true;
      emit("error", `Hermes CLI timed out after ${timeoutMs}ms`);
      child.kill("SIGTERM");
    }, timeoutMs);

    child.stdout?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stdout += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.length > 0) emit("stdout", line);
      }
    });

    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.length > 0) emit("stderr", line);
      }
    });

    child.on("error", (err: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      emit("error", err.message);
      reject(err);
    });

    child.on("close", (code: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      emit("exit", `exit code ${code ?? "null"}`);
      resolve({
        stdout,
        stderr,
        exitCode: code,
        ok: code === 0 && !timedOut,
        timedOut,
        events,
        durationMs: Date.now() - startedAt,
      });
    });
  });
}
