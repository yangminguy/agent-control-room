import { spawn } from "child_process";
import { runAntigravityPrint } from "@/lib/agents/antigravity-runner";

export interface SpawnAgentOptions {
  agent: "claude-code" | "codex" | "antigravity";
  prompt: string;
  cwd: string;
  targetModel?: string;
  onLog: (line: string) => void;
  onComplete: (exitCode: number) => void;
}

/**
 * 지정된 에이전트 CLI를 spawning으로 실행한다.
 * - claude-code: `claude -p "prompt"`
 * - codex: `codex exec --cd cwd "prompt"`
 * - antigravity: `agy --sandbox --add-dir <cwd> -p "prompt"` (실제 agy CLI)
 */
export async function spawnAgent(options: SpawnAgentOptions): Promise<void> {
  const { agent, prompt, cwd, targetModel, onLog, onComplete } = options;

  // Antigravity는 runAntigravityPrint()를 통해 agy CLI를 사용
  if (agent === "antigravity") {
    const run = async () =>
      runAntigravityPrint({
        projectPath: cwd,
        prompt,
        sandbox: true,
        timeout: "15m",
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
    [cmd, ...args] = buildCommand(agent, prompt, cwd);
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
 * 에이전트 타입에 따라 실행 커맨드를 생성한다 (claude-code, codex 전용).
 */
function buildCommand(
  agent: "claude-code" | "codex",
  prompt: string,
  cwd: string,
): string[] {
  if (agent === "claude-code") {
    return ["claude", "-p", prompt];
  }

  if (agent === "codex") {
    return ["codex", "exec", "--cd", cwd, prompt];
  }

  throw new Error(`Unsupported agent for CLI: ${agent}`);
}
