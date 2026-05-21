import type { AgentResult, DispatchJob } from "../../types";
import { logOrchestrationEvent } from "../orchestration-logger";
import type { AgentAdapter } from "./index";

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
      console.log(`Antigravity Prompt Ready (MOCK): ${prompt}`);
      return makeResult(
        job,
        `[MOCK ANTIGRAVITY PROMPT]\n\n${prompt}\n\nCopy above and paste into Antigravity UI, then bring result back to orchestration.`,
        "blocked",
      );
    }

    logOrchestrationEvent({
      event: "job_started",
      jobId: job.id,
      agentId: "antigravity",
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: (job.prompt ?? "").slice(0, 200),
    });

    logOrchestrationEvent({
      event: "job_completed",
      jobId: job.id,
      agentId: "antigravity",
      riskLevel: job.riskLevel,
      timestamp: new Date().toISOString(),
      detail: "manual_prompt_copy_required",
    });

    return makeResult(
      job,
      [
        "Antigravity is a manual prompt-copy target in this MVP.",
        "No Antigravity CLI process was spawned.",
        "",
        "Copy this prompt into Antigravity and import the result manually:",
        "",
        prompt,
      ].join("\n"),
      "blocked",
    );
  }
}
