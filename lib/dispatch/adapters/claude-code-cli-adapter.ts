import fs from "fs";
import path from "path";
import type { AgentResult, DispatchJob } from "../../types";
import { spawnAgent } from "../../runner/spawn-runner";
import { logOrchestrationEvent } from "../orchestration-logger";
import type { AgentAdapter } from "./index";

const TIMEOUT_MS = 30 * 60 * 1000;

function generateJobResultId(): string {
  return `result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function makeResult(
  job: DispatchJob,
  rawOutput: string,
  resultStatus: AgentResult["resultStatus"],
): AgentResult {
  return {
    id: generateJobResultId(),
    dispatchJobId: job.id,
    taskId: job.taskId,
    agentId: "claude-code",
    rawOutput,
    resultStatus,
    timestamp: new Date().toISOString(),
  };
}

function commandExists(command: string): boolean {
  const pathValue = process.env.PATH ?? "";
  return pathValue.split(path.delimiter).some((dir) => {
    if (!dir) return false;
    try {
      fs.accessSync(path.join(dir, command), fs.constants.X_OK);
      return true;
    } catch {
      return false;
    }
  });
}

export class ClaudeCodeCliAdapter implements AgentAdapter {
  private mockMode: boolean;

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode;
  }

  async dispatch(job: DispatchJob): Promise<AgentResult> {
    if (this.mockMode) {
      console.log(`[MOCK] Claude Code prompt:\n${job.prompt ?? "(no prompt)"}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return {
        id: generateJobResultId(),
        dispatchJobId: job.id,
        taskId: job.taskId,
        agentId: "claude-code",
        rawOutput: `[MOCK] Claude Code job ${job.id} — 모의 실행 완료. 실제 파일 변경은 없습니다. Workbench에서 실제 실행하세요.`,
        resultStatus: "blocked",
        timestamp: new Date().toISOString(),
      };
    }

    logOrchestrationEvent({
      event: "job_started",
      jobId: job.id,
      agentId: "claude-code",
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: (job.prompt ?? "").slice(0, 200),
    });

    const stdout: string[] = [];
    const stderr: string[] = [];

    if (!commandExists("claude")) {
      return makeResult(
        job,
        "Claude Code CLI not found. Ensure the local claude CLI is installed and available on PATH.",
        "blocked",
      );
    }

    return new Promise<AgentResult>((resolve) => {
      let settled = false;
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          logOrchestrationEvent({
            event: "job_completed",
            jobId: job.id,
            agentId: "claude-code",
            riskLevel: job.riskLevel,
            timestamp: new Date().toISOString(),
            detail: "timeout",
          });
          resolve(makeResult(job, `Claude Code job ${job.id} timed out after 30 minutes`, "blocked"));
        }
      }, TIMEOUT_MS);

      spawnAgent({
        agent: "claude-code",
        prompt: job.prompt ?? "",
        cwd: process.cwd(),
        onLog: (line) => {
          if (line.startsWith("[stderr]")) {
            stderr.push(line);
          } else {
            stdout.push(line);
          }
        },
        onComplete: (exitCode) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);

          const rawOutput = [...stdout, ...stderr].join("\n");
          const resultStatus: AgentResult["resultStatus"] =
            exitCode === 0 ? "pass" : "blocked";

          const result = makeResult(job, rawOutput, resultStatus);

          logOrchestrationEvent({
            event: "job_completed",
            jobId: job.id,
            agentId: "claude-code",
            riskLevel: job.riskLevel,
            timestamp: new Date().toISOString(),
            detail: `exitCode=${exitCode} status=${resultStatus}`,
          });

          resolve(result);
        },
      }).catch((error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const message = error instanceof Error ? error.message : String(error);
        resolve(makeResult(job, `Claude Code spawn error: ${message}`, "blocked"));
      });
    });
  }
}
