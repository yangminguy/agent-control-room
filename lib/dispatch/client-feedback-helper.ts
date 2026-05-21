import type { AgentResult, DispatchJob, FeedbackLoopOutput } from "@/lib/types";

/**
 * Pure client-safe function that computes a FeedbackLoopOutput from an AgentResult and DispatchJob.
 * No server dependencies (no fs, no OpenAI, no DB).
 */
export function computeFeedbackDecision(
  result: AgentResult,
  job: DispatchJob,
): FeedbackLoopOutput {
  if (result.resultStatus === "safety_violation") {
    return {
      decision: "halt_safety_violation",
      reason: `Safety violation detected in job ${job.id}. Halting execution.`,
    };
  }

  if (job.retryCount >= 3) {
    return {
      decision: "create_blocked_decision",
      reason: `Max retries (3) exceeded for job ${job.id}.`,
      blockedDecision: {
        question: "This job has failed 3 times. How would you like to proceed?",
        options: ["Skip this task", "Manually review and retry", "Escalate to a different agent"],
      },
    };
  }

  if (
    result.resultStatus === "minor_fix" &&
    (job.riskLevel === "safe" || job.riskLevel === "low")
  ) {
    return {
      decision: "redispatch",
      reason: `Minor fix detected for job ${job.id}, retrying.`,
      nextDispatchJob: { ...job, retryCount: job.retryCount + 1 },
    };
  }

  if (result.resultStatus === "qa_needed") {
    return {
      decision: "create_qa_task",
      reason: `Job ${job.id} result requires QA review before proceeding.`,
    };
  }

  if (result.resultStatus === "blocked") {
    return {
      decision: "create_blocked_decision",
      reason: `Job ${job.id} is blocked and requires user decision.`,
      blockedDecision: {
        question: "This task is blocked. How would you like to proceed?",
        options: ["Provide more context", "Skip this task", "Escalate to a different agent"],
      },
    };
  }

  // Default: pass
  return {
    decision: "redispatch",
    reason: `Task ${job.id} completed successfully.`,
    nextDispatchJob: undefined,
  };
}
