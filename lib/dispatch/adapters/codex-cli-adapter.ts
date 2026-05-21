import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import type { AgentResult, DispatchJob, ResultStatus } from "../../types";
import { logOrchestrationEvent } from "../orchestration-logger";
import type { AgentAdapter } from "./index";

const TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

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
    agentId: "codex",
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

export function classifyCodexOutput(rawOutput: string, exitCode: number | null): ResultStatus {
  const normalized = rawOutput.toLowerCase();

  if (
    normalized.includes("safety violation") ||
    normalized.includes("security violation") ||
    normalized.includes("forbidden file") ||
    normalized.includes("destructive operation")
  ) {
    return "safety_violation";
  }

  if (
    normalized.includes("qa needed") ||
    normalized.includes("needs qa") ||
    normalized.includes("requires qa") ||
    normalized.includes("needs review") ||
    normalized.includes("requires review")
  ) {
    return "qa_needed";
  }

  if (
    normalized.includes("minor fix") ||
    normalized.includes("minor_fix") ||
    normalized.includes("small fix") ||
    normalized.includes("follow-up fix")
  ) {
    return "minor_fix";
  }

  if (
    normalized.includes("blocked") ||
    normalized.includes("error") ||
    normalized.includes("failed") ||
    normalized.includes("cannot proceed") ||
    normalized.includes("needs user decision")
  ) {
    return "blocked";
  }

  return exitCode === 0 ? "pass" : "blocked";
}

export class CodexCliAdapter implements AgentAdapter {
  private mockMode: boolean;

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode;
  }

  async dispatch(job: DispatchJob): Promise<AgentResult> {
    if (this.mockMode) {
      console.log(`Dispatching to Codex (MOCK): ${job.prompt ?? "(no prompt)"}`);
      await new Promise((resolve) => setTimeout(resolve, 500));
      return makeResult(job, `[MOCK] Codex job ${job.id} completed`, "pass");
    }

    logOrchestrationEvent({
      event: "job_started",
      jobId: job.id,
      agentId: "codex",
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: (job.prompt ?? "").slice(0, 200),
    });

    if (!commandExists("codex")) {
      return makeResult(
        job,
        "Codex CLI not found. Ensure the local codex CLI is installed and available on PATH.",
        "blocked",
      );
    }

    return new Promise<AgentResult>((resolve) => {
      let settled = false;
      const stdout: string[] = [];
      const stderr: string[] = [];

      let child: ReturnType<typeof spawn>;
      try {
        child = spawn("codex", ["-p", job.prompt ?? ""], {
          cwd: process.cwd(),
          shell: false,
        });
      } catch (spawnErr) {
        const msg = spawnErr instanceof Error ? spawnErr.message : String(spawnErr);
        resolve(makeResult(job, `Codex CLI not found. Ensure the local codex CLI is installed and available on PATH. Error: ${msg}`, "blocked"));
        return;
      }

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill("SIGTERM");
          const result = makeResult(job, `Codex job ${job.id} timed out after 30 minutes`, "blocked");
          logOrchestrationEvent({
            event: "job_completed",
            jobId: job.id,
            agentId: "codex",
            riskLevel: job.riskLevel,
            timestamp: new Date().toISOString(),
            detail: "timeout",
          });
          resolve(result);
        }
      }, TIMEOUT_MS);

      child.stdout?.on("data", (data: Buffer) => {
        stdout.push(data.toString());
      });

      child.stderr?.on("data", (data: Buffer) => {
        stderr.push(data.toString());
      });

      child.on("error", (err) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          const isNotFound =
            (err as NodeJS.ErrnoException).code === "ENOENT" ||
            err.message.includes("not found") ||
            err.message.includes("ENOENT");
          const msg = isNotFound
            ? "Codex CLI not found. Ensure the local codex CLI is installed and available on PATH."
            : `Codex spawn error: ${err.message}`;
          resolve(makeResult(job, msg, "blocked"));
        }
      });

      child.on("close", (code) => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          const rawOutput = [...stdout, ...stderr].join("\n");
          const resultStatus = classifyCodexOutput(rawOutput, code);
          const result = makeResult(job, rawOutput, resultStatus);
          logOrchestrationEvent({
            event: "job_completed",
            jobId: job.id,
            agentId: "codex",
            riskLevel: job.riskLevel,
            timestamp: new Date().toISOString(),
            detail: `exitCode=${code} status=${resultStatus}`,
          });
          resolve(result);
        }
      });
    });
  }
}
