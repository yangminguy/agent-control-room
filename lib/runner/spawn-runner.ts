import { spawn } from "child_process";

export interface SpawnAgentOptions {
  agent: "claude-code" | "codex" | "antigravity";
  prompt: string;
  cwd: string;
  onLog: (line: string) => void;
  onComplete: (exitCode: number) => void;
}

/**
 * 지정된 에이전트 CLI를 spawning으로 실행한다.
 * - claude-code: `claude -p "prompt"`
 * - codex: 미지원 (설치되지 않음)
 * - antigravity: 미지원 (CLI 없음)
 */
export async function spawnAgent(options: SpawnAgentOptions): Promise<void> {
  const { agent, prompt, cwd, onLog, onComplete } = options;

  if (agent === "antigravity") {
    throw new Error("Antigravity CLI not found. Generate a copy-ready prompt instead.");
  }

  let cmd: string;
  let args: string[];
  try {
    [cmd, ...args] = buildCommand(agent, prompt);
  } catch (error) {
    onLog(`[ERROR] ${error instanceof Error ? error.message : String(error)}`);
    onComplete(1);
    return;
  }

  const child = spawn(cmd, args, {
    cwd,
    shell: false,
  });

  child.stdout?.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line: string) => {
      if (line.trim()) onLog(line);
    });
  });

  child.stderr?.on("data", (data) => {
    const lines = data.toString().split("\n");
    lines.forEach((line: string) => {
      if (line.trim()) onLog(`[stderr] ${line}`);
    });
  });

  child.on("close", (code) => {
    const exitCode = code ?? 1;
    onLog(`[DONE] Exit code: ${exitCode}`);
    onComplete(exitCode);
  });

  child.on("error", (error) => {
    onLog(`[ERROR] Failed to spawn process: ${error.message}`);
    onComplete(1);
  });
}

/**
 * 에이전트 타입에 따라 실행 커맨드를 생성한다.
 */
function buildCommand(
  agent: "claude-code" | "codex" | "antigravity",
  prompt: string,
): string[] {
  if (agent === "claude-code") {
    return ["claude", "-p", prompt];
  }

  if (agent === "codex") {
    throw new Error("Codex CLI not found. Install via 'npm install -g @anthropic/codex' or similar.");
  }

  throw new Error(`Unsupported agent for CLI: ${agent}`);
}
