import {
  AgentResult,
  DispatchJob,
  FeedbackDecision,
  FeedbackLoopOutput,
  PlanTask,
} from "../types";
import { SafeDispatchQueue } from "../dispatch/safe-dispatch-queue";

/**
 * T050: Feedback Loop Engine (Wave 3, Phase 16)
 *
 * Accept agent results and generate next action:
 * - minor_fix + low risk: safe redispatch (max 3 retries)
 * - qa_needed: create QA task
 * - blocked: create blocked decision
 * - safety_violation: halt loop
 *
 * Retry guard: retryCount >= 3 forces blocked regardless of resultStatus.
 */

export class FeedbackLoopEngine {
  private queue: SafeDispatchQueue;
  private maxRetries = 3;

  constructor(queue: SafeDispatchQueue) {
    this.queue = queue;
  }

  /**
   * Main entry: process an agent result and generate next action.
   */
  async processFeedback(result: AgentResult): Promise<FeedbackLoopOutput> {
    const dispatchJob = this.queue.getJob(result.dispatchJobId);

    if (!dispatchJob) {
      return {
        decision: "create_blocked_decision",
        reason: "Cannot find original dispatch job",
        blockedDecision: {
          question: "How to proceed after job not found?",
          options: ["Skip", "Retry", "Manual review"],
        },
      };
    }

    // === SAFETY VIOLATION: Halt immediately ===
    if (result.resultStatus === "safety_violation") {
      return {
        decision: "halt_safety_violation",
        reason: "Safety violation detected. Human approval required before continuation.",
      };
    }

    // === RETRY GUARD: Check if max retries exceeded ===
    if (dispatchJob.retryCount >= this.maxRetries) {
      return {
        decision: "create_blocked_decision",
        reason: `Max retries (${this.maxRetries}) exceeded. Job marked as blocked.`,
        blockedDecision: {
          question: "How to proceed after max retries?",
          options: [
            "Review and fix manually",
            "Skip this task",
            "Adjust risk level and retry",
          ],
        },
      };
    }

    // === MINOR FIX + LOW RISK: Safe redispatch ===
    if (
      result.resultStatus === "minor_fix" &&
      dispatchJob.riskLevel === "low"
    ) {
      const redispatchJob: DispatchJob = {
        ...dispatchJob,
        id: this.generateJobId(),
        status: "queued",
        retryCount: dispatchJob.retryCount + 1,
        createdAt: new Date().toISOString(),
      };

      return {
        decision: "redispatch",
        reason: `Minor fix needed (retry ${redispatchJob.retryCount} of ${this.maxRetries}). Redispatching with same agent.`,
        nextDispatchJob: redispatchJob,
      };
    }

    // === QA NEEDED: Create QA task ===
    if (result.resultStatus === "qa_needed") {
      return {
        decision: "create_qa_task",
        reason: "Agent completed work but manual QA is required.",
        qaTask: {
          id: this.generateJobId(),
          planId: dispatchJob.taskId, // Link back
          title: `QA Review: ${dispatchJob.prompt?.substring(0, 50) || "Original Task"}`,
          description: `Manual QA required for job ${dispatchJob.id}. Result status: ${result.resultStatus}`,
          status: "planned",
          assignedAgent: "claude-code", // Default to Claude Code for review
          priority: "P1",
          acceptanceCriteria: [
            "Verify changed files match expected output",
            "Run tests and check for regressions",
            "Approve or mark for revision",
          ],
          subAgentTracks: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      };
    }

    // === BLOCKED: Create blocked decision ===
    if (result.resultStatus === "blocked") {
      return {
        decision: "create_blocked_decision",
        reason: "Agent encountered blocking issue and cannot proceed.",
        blockedDecision: {
          question: `What to do about blocked task: "${dispatchJob.prompt?.substring(0, 50)}"?`,
          options: [
            "Provide more context and retry",
            "Change approach (different agent/risk level)",
            "Mark as won't-do",
            "Manual intervention",
          ],
        },
      };
    }

    // === PASS: Completed successfully ===
    // (This is actually a good case, but we still return a feedback output for consistency)
    return {
      decision: "redispatch", // Use as a no-op: mark as completed in caller
      reason: `Task completed successfully. Status: ${result.resultStatus}`,
    };
  }

  /**
   * Validate whether a feedback decision is safe to execute.
   * Returns true if safe, false if requires additional approval.
   */
  isSafeToExecute(decision: FeedbackDecision): boolean {
    // Only "redispatch" with low-risk tasks is safe to auto-execute
    // All other decisions require human review
    return decision === "redispatch";
  }

  /**
   * Get human-readable explanation for a feedback decision.
   */
  getDecisionExplanation(output: FeedbackLoopOutput): string {
    switch (output.decision) {
      case "redispatch":
        return `Redispatch: ${output.reason}. Next job ID: ${output.nextDispatchJob?.id}`;
      case "create_qa_task":
        return `QA Task: ${output.reason}. New QA task: ${output.qaTask?.id}`;
      case "create_blocked_decision":
        return `Blocked: ${output.reason}. Awaiting user decision.`;
      case "halt_safety_violation":
        return `HALT: ${output.reason}. System halted for security.`;
      default:
        return `Unknown decision: ${output.reason}`;
    }
  }

  /**
   * Simple ID generator for new jobs.
   */
  private generateJobId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}

/**
 * Global feedback loop instance.
 */
let globalFeedbackLoop: FeedbackLoopEngine | null = null;

export function getGlobalFeedbackLoop(
  queue: SafeDispatchQueue
): FeedbackLoopEngine {
  if (!globalFeedbackLoop) {
    globalFeedbackLoop = new FeedbackLoopEngine(queue);
  }
  return globalFeedbackLoop;
}

export function resetGlobalFeedbackLoop(): void {
  globalFeedbackLoop = null;
}
