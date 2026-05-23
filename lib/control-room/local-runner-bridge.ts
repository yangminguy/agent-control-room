import type { AgentResult, AgentType, DispatchJob } from "@/lib/types";
import {
  claimLocalRunnerJobs,
  saveControlRoomResult,
  updateControlRoomRunJob,
} from "@/lib/control-room/store";
import { addSessionReport } from "@/lib/storage/json-store";
import { updateKanbanCardResult } from "@/lib/storage/feature-plan-store";

const AGENTS = new Set<AgentType>(["claude-code", "codex", "antigravity"]);

export function parseAgentList(value?: string | null): AgentType[] | undefined {
  if (!value) return undefined;
  const agents = value
    .split(",")
    .map((agent) => agent.trim())
    .filter((agent): agent is AgentType => AGENTS.has(agent as AgentType));
  return agents.length ? agents : undefined;
}

export async function claimJobsForLocalRunner(input: {
  runnerId: string;
  agents?: AgentType[];
  limit?: number;
}): Promise<DispatchJob[]> {
  return claimLocalRunnerJobs(input);
}

export async function acceptLocalRunnerResult(input: {
  runnerId: string;
  result: AgentResult;
}): Promise<{ runUpdated: boolean; result: AgentResult }> {
  const saved = await saveControlRoomResult(input.result);
  const run = await updateControlRoomRunJob({
    dispatchJobId: input.result.dispatchJobId,
    result: saved,
  });

  if (run) {
    const job = run.startedTasks.find((candidate) => candidate.id === saved.dispatchJobId);
    if (job?.featurePlanId) {
      await updateKanbanCardResult(job.featurePlanId, saved.taskId, {
        changedFiles: saved.changedFiles,
        diffSummary: saved.extractedSummary ?? saved.rawOutput.slice(0, 400),
        completionJudgment: saved.resultStatus === "pass" ? "completed" : "partial",
        status: saved.resultStatus === "pass" ? "done" : "blocked",
      });
    }
  }

  await addSessionReport({
    projectId: "agent-control-room",
    taskId: saved.taskId,
    agent: saved.agentId,
    summary: saved.extractedSummary ?? saved.rawOutput.slice(0, 240),
    executionTimeMinutes: 0,
    tokensUsed: 0,
    errors: saved.resultStatus === "pass" ? [] : [saved.resultStatus],
    changedFiles: saved.changedFiles ?? [],
    testsRun: [],
    codeReviewScore: 0,
    accessibilityScore: 0,
    manualNotes: `Submitted by local runner ${input.runnerId} for dispatch job ${saved.dispatchJobId}`,
    remainingIssues: saved.resultStatus === "pass" ? [] : ["Review local runner output before continuing."],
    completionJudgment: saved.resultStatus === "pass" ? "completed" : "partial",
    completionReason: `Local runner returned ${saved.resultStatus}`,
    nextTask: saved.resultStatus === "pass" ? "Continue to the next queued roadmap task" : "Review blocker and decide retry or handoff",
    nextPrompt: "",
    recommendedAgent: saved.resultStatus === "pass" ? "manual" : saved.agentId,
    prdAlignmentScore: 0,
    risks: [],
  });

  return { runUpdated: Boolean(run), result: saved };
}
