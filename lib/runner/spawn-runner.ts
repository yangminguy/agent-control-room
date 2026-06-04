import { spawn } from "child_process";
import { runAntigravityPrint } from "@/lib/agents/antigravity-runner";
import { parseClaudeStreamEvent, type TokenUsage } from "@/lib/runner/claude-token-parser";

/** Phase 6 — capture measured claude tokens (opt-in; default keeps plain `-p`). */
const CAPTURE_TOKENS = process.env.ACR_CAPTURE_TOKENS === "1";

export interface SpawnAgentOptions {
  agent: "claude-code" | "codex" | "antigravity";
  prompt: string;
  cwd: string;
  targetModel?: string;
  /**
   * Hard wall-clock limit for the spawned CLI. On expiry the child is killed
   * (SIGTERM, then SIGKILL after a grace period) and onComplete is called with
   * exit code 124 (conventional timeout code). Defaults to ACR_AGENT_TIMEOUT_MS
   * env or 15 min. Phase 1 — prevents a hung agent from blocking the runner.
   */
  timeoutMs?: number;
  onLog: (line: string) => void;
  onComplete: (exitCode: number) => void;
  /** Fires once with measured token usage when the claude result event is seen
   * (only in capture mode). Other agents / plain mode never call it. */
  onTokens?: (tokens: TokenUsage) => void;
}

/** Default agent wall-clock limit (15 min) unless overridden per call or by env. */
export const DEFAULT_AGENT_TIMEOUT_MS = (() => {
  const n = Number(process.env.ACR_AGENT_TIMEOUT_MS);
  return Number.isFinite(n) && n > 0 ? n : 15 * 60 * 1000;
})();

/**
 * 지정된 에이전트 CLI를 spawning으로 실행한다.
 * - claude-code: `claude -p "prompt"`
 * - codex: `codex exec --cd cwd "prompt"`
 * - antigravity: `agy --sandbox --add-dir <cwd> -p "prompt"` (실제 agy CLI)
 */
export async function spawnAgent(options: SpawnAgentOptions): Promise<void> {
  const { agent, prompt, cwd, targetModel, onLog, onComplete, onTokens } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_AGENT_TIMEOUT_MS;
  // Capture tokens only for claude (the only CLI with a parseable usage event)
  // and only when explicitly enabled — keeps the default plain-`-p` live stream.
  const captureTokens = CAPTURE_TOKENS && agent === "claude-code";

  // Antigravity는 runAntigravityPrint()를 통해 agy CLI를 사용
  if (agent === "antigravity") {
    const run = async () =>
      runAntigravityPrint({
        projectPath: cwd,
        prompt,
        sandbox: true,
        // Honor the caller's wall-clock budget (ACR_AGENT_TIMEOUT_MS) instead of a
        // hardcoded 15m, so Phase-1 timeout config applies to antigravity too.
        timeout: `${Math.max(1, Math.ceil(timeoutMs / 60000))}m`,
      });

    let result: Awaited<ReturnType<typeof runAntigravityPrint>>;
    try {
      if (targetModel) {
        // targetModel이 있으면 withAntigravityModel로 감싸서 실행 후 복현
        const { withAntigravityModel } = await import("@/lib/agents/antigravity-model-detection");
        result = await withAntigravityModel(targetModel, run);
      } else {
        result = await run();
      }
    } catch (err) {
      result = {
        success: false,
        fallbackReason: `execution failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    if (result.stdout) {
      result.stdout.split("\n").forEach((line: string) => { if (line.trim()) onLog(line); });
    }
    if (result.stderr) {
      result.stderr.split("\n").forEach((line: string) => { if (line.trim()) onLog(`[stderr] ${line}`); });
    }
    if (!result.success && result.fallbackReason) {
      onLog(`[ERROR] agy: ${result.fallbackReason}`);
    }
    onComplete(result.exitCode ?? (result.success ? 0 : 1));
    return;
  }

  let cmd: string;
  let args: string[];
  try {
    [cmd, ...args] = buildCommand(agent, prompt, cwd, captureTokens);
  } catch (error) {
    onLog(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
    onComplete(1);
    return;
  }

  const child = spawn(cmd, args, {
    cwd,
    shell: false,
    // stdin을 무시(=즉시 EOF)해야 한다. 파이프로 열어두면 codex 등 non-tty 입력을
    // 기다리는 CLI가 EOF를 못 받아 무한 블록한다(claude는 자체 3s stdin 타임아웃으로 진행).
    stdio: ["ignore", "pipe", "pipe"],
  });

  // Guard so onComplete fires exactly once across close/error/timeout races.
  let settled = false;
  const finish = (exitCode: number) => {
    if (settled) return;
    settled = true;
    if (timer) clearTimeout(timer);
    if (killTimer) clearTimeout(killTimer);
    onComplete(exitCode);
  };

  // Phase 1: wall-clock timeout. Kill the hung child and report exit 124.
  let killTimer: NodeJS.Timeout | undefined;
  const timer: NodeJS.Timeout = setTimeout(() => {
    onLog(`[TIMEOUT] Agent exceeded ${timeoutMs}ms — terminating.`);
    try {
      child.kill("SIGTERM");
    } catch {
      // ignore
    }
    // Escalate to SIGKILL if it does not exit within 5s.
    killTimer = setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // ignore
      }
    }, 5000);
    finish(124);
  }, timeoutMs);

  // In capture mode claude emits stream-json (one JSON object per line, possibly
  // split across data chunks) — buffer and parse complete lines, forwarding the
  // human-readable text to the live log and the result event's usage to onTokens.
  let stdoutBuf = "";
  const handleStreamLine = (line: string) => {
    if (!line.trim()) return;
    const parsed = parseClaudeStreamEvent(line);
    if (parsed.logText) {
      parsed.logText.split("\n").forEach((l) => { if (l.trim()) onLog(l); });
    }
    if (parsed.tokens && onTokens) onTokens(parsed.tokens);
  };

  child.stdout?.on("data", (data) => {
    if (!captureTokens) {
      data.toString().split("\n").forEach((line: string) => {
        if (line.trim()) onLog(line);
      });
      return;
    }
    stdoutBuf += data.toString();
    let idx: number;
    while ((idx = stdoutBuf.indexOf("\n")) !== -1) {
      const line = stdoutBuf.slice(0, idx);
      stdoutBuf = stdoutBuf.slice(idx + 1);
      handleStreamLine(line);
    }
  });

  child.stderr?.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line: string) => {
      if (line.trim()) onLog(`[stderr] ${line}`);
    });
  });

  child.on("close", (code) => {
    // Flush any trailing partial line (last JSON object without a newline).
    if (captureTokens && stdoutBuf.trim()) {
      handleStreamLine(stdoutBuf);
      stdoutBuf = "";
    }
    const exitCode = code ?? 1;
    if (!settled) onLog(`[DONE] Exit code: ${exitCode}`);
    finish(exitCode);
  });

  child.on("error", (error) => {
    if (!settled) onLog(`[ERROR] Failed to spawn process: ${error.message}`);
    finish(1);
  });
}

/**
 * 에이전트 타입에 따라 실행 커맨드를 생성한다 (claude-code, codex 전용).
 */
function buildCommand(
  agent: "claude-code" | "codex",
  prompt: string,
  cwd: string,
  captureTokens = false,
): string[] {
  if (agent === "claude-code") {
    // stream-json keeps live output (one event per line) while exposing a final
    // result event with token usage. Plain `-p` otherwise (unchanged default).
    return captureTokens
      ? ["claude", "-p", prompt, "--output-format", "stream-json", "--verbose"]
      : ["claude", "-p", prompt];
  }

  if (agent === "codex") {
    return ["codex", "exec", "--cd", cwd, prompt];
  }

  throw new Error(`Unsupported agent for CLI: ${agent}`);
}
