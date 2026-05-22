import { spawn } from "child_process";
import fs from "fs";
import type { AgentResult, DispatchJob } from "../../types";
import { logOrchestrationEvent } from "../orchestration-logger";
import type { AgentAdapter } from "./index";

const TIMEOUT_MS = 30 * 60 * 1000;
const ANTIGRAVITY_CLI =
  "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide";

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
    agentId: "antigravity",
    rawOutput,
    resultStatus,
    timestamp: new Date().toISOString(),
  };
}

export class AntigravityCliAdapter implements AgentAdapter {
  private mockMode: boolean;

  constructor(mockMode: boolean = true) {
    this.mockMode = mockMode;
  }

  async dispatch(job: DispatchJob): Promise<AgentResult> {
    const prompt = job.prompt ?? "(no prompt)";
    if (this.mockMode) {
      console.log(`Dispatching to Antigravity (MOCK): ${prompt}`);
      return makeResult(job, `[MOCK] Antigravity job ${job.id} queued`, "pass");
    }

    logOrchestrationEvent({
      event: "job_started",
      jobId: job.id,
      agentId: "antigravity",
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: prompt.slice(0, 200),
    });

    if (!fs.existsSync(ANTIGRAVITY_CLI)) {
      return makeResult(
        job,
        `Antigravity IDE CLI not found at ${ANTIGRAVITY_CLI}.`,
        "blocked",
      );
    }

    return new Promise<AgentResult>((resolve) => {
      let settled = false;
      const stdout: string[] = [];
      const stderr: string[] = [];
      const child = spawn(ANTIGRAVITY_CLI, ["chat", "--mode", "agent", prompt], {
        cwd: process.cwd(),
        shell: false,
      });

      const timer = setTimeout(() => {
        if (!settled) {
          settled = true;
          child.kill("SIGTERM");
          resolve(makeResult(job, `Antigravity job ${job.id} timed out after 30 minutes`, "blocked"));
        }
      }, TIMEOUT_MS);

      child.stdout?.on("data", (data: Buffer) => stdout.push(data.toString()));
      child.stderr?.on("data", (data: Buffer) => stderr.push(data.toString()));

      child.on("error", (error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(makeResult(job, `Antigravity spawn error: ${error.message}`, "blocked"));
      });

      child.on("close", (code) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        const rawOutput = [...stdout, ...stderr].join("\n");
        const resultStatus: AgentResult["resultStatus"] = code === 0 ? "pass" : "blocked";

        logOrchestrationEvent({
          event: "job_completed",
          jobId: job.id,
          agentId: "antigravity",
          riskLevel: job.riskLevel,
          timestamp: new Date().toISOString(),
          detail: `exitCode=${code} status=${resultStatus}`,
        });

        resolve(makeResult(job, rawOutput, resultStatus));
      });
    });
  }
}
