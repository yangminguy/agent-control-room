import {
  DispatchJob,
  ApprovalRequest,
  ProgressSplitResult,
  RiskLevel,
} from "../types";
import { SafeDispatchQueue } from "./safe-dispatch-queue";
import { hasApprovalTimedOut } from "../approval/timeout-policy";

/**
 * T049: Non-Blocking Progress Manager (Wave 2, Phase 15 preparation)
 *
 * Split safe/risky tasks, pause risky, continue safe independent tasks.
 * On timeout: marks job as skipped_due_to_risk, does not retry.
 *
 * This allows safe work to proceed even if risky tasks are waiting for approval.
 */

export class NonBlockingProgressManager {
  private queue: SafeDispatchQueue;
  private approvals: Map<string, ApprovalRequest> = new Map();

  constructor(queue: SafeDispatchQueue) {
    this.queue = queue;
  }

  /**
   * Register an approval request.
   * Used to track which jobs are waiting for approval.
   */
  registerApproval(approval: ApprovalRequest): void {
    this.approvals.set(approval.dispatchJobId, approval);
  }

  /**
   * Unregister an approval (after resolved).
   */
  unregisterApproval(dispatchJobId: string): void {
    this.approvals.delete(dispatchJobId);
  }

  /**
   * Split queue into safe (can run immediately) and risky (need approval).
   * Also checks timeout on pending approvals.
   */
  splitWorkload(): ProgressSplitResult {
    const allJobs = this.queue.getAllJobs();

    const safe: DispatchJob[] = [];
    const risky: DispatchJob[] = [];
    const pendingApprovals: ApprovalRequest[] = [];

    allJobs.forEach((job) => {
      // Check if job has a pending approval
      const approval = this.approvals.get(job.id);

      if (approval && approval.status === "pending") {
        // Check if approval has timed out
        if (hasApprovalTimedOut(approval.createdAt)) {
          // Timeout: mark job as skipped due to risk
          this.queue.updateJobStatus(job.id, "skipped_due_to_risk", {
            timeoutAt: new Date().toISOString(),
          });
          // Continue to next job (don't add to either safe or risky)
          return;
        }

        // Still waiting for approval
        risky.push(job);
        pendingApprovals.push(approval);
      } else if (["safe", "low"].includes(job.riskLevel)) {
        // Safe risk level can proceed
        safe.push(job);
      } else {
        // Medium/high/critical risk without approval → risky
        risky.push(job);
        if (approval) {
          pendingApprovals.push(approval);
        }
      }
    });

    return {
      safeTasks: safe,
      riskyTasks: risky,
      pendingApprovals,
    };
  }

  /**
   * Get jobs that can run immediately (safe tasks with no blocker).
   */
  getSafeRunnable(): DispatchJob[] {
    const split = this.splitWorkload();
    return split.safeTasks.filter((j) => j.status === "queued");
  }

  /**
   * Get jobs waiting for approval.
   */
  getPendingApprovalJobs(): DispatchJob[] {
    const split = this.splitWorkload();
    return split.riskyTasks.filter((j) => j.status === "queued");
  }

  /**
   * Get approval requests that have timed out.
   */
  getTimedOutApprovals(): ApprovalRequest[] {
    return Array.from(this.approvals.values()).filter(
      (approval) =>
        approval.status === "pending" && hasApprovalTimedOut(approval.createdAt)
    );
  }

  /**
   * Process timeouts: mark timed-out jobs as skipped_due_to_risk.
   * Returns the number of jobs skipped.
   */
  processTimeouts(): number {
    const timedOut = this.getTimedOutApprovals();
    let count = 0;

    timedOut.forEach((approval) => {
      const job = this.queue.getJob(approval.dispatchJobId);
      if (job && job.status === "queued") {
        this.queue.updateJobStatus(job.id, "skipped_due_to_risk", {
          timeoutAt: new Date().toISOString(),
        });
        this.unregisterApproval(job.id);
        count++;
      }
    });

    return count;
  }

  /**
   * Approve a risky job.
   * Moves it from risky to approved state.
   */
  approveJob(jobId: string, approver: string): boolean {
    const job = this.queue.getJob(jobId);
    if (!job) return false;

    const approval = this.approvals.get(jobId);
    if (!approval) return false;

    // Update approval status
    approval.status = "approved";
    approval.resolvedAt = new Date().toISOString();
    this.approvals.set(jobId, approval);

    // Update job status
    return this.queue.updateJobStatus(jobId, "approved", {
      approvedAt: approval.resolvedAt,
    });
  }

  /**
   * Reject a risky job.
   * Marks it as failed and removes from queue.
   */
  rejectJob(jobId: string, rejecter: string, reason: string): boolean {
    const job = this.queue.getJob(jobId);
    if (!job) return false;

    const approval = this.approvals.get(jobId);
    if (!approval) return false;

    // Update approval status
    approval.status = "rejected";
    approval.resolvedAt = new Date().toISOString();
    this.approvals.set(jobId, approval);

    // Update job status
    return this.queue.updateJobStatus(jobId, "failed", {
      // Could add rejection reason to metadata
    });
  }

  /**
   * Get progress statistics.
   */
  getProgress(): {
    total: number;
    safe: { ready: number; running: number; completed: number };
    risky: { pending: number; approved: number; timedOut: number };
    timeoutCountdown: { jobId: string; remainingMs: number }[];
  } {
    const split = this.splitWorkload();
    const allJobs = this.queue.getAllJobs();

    const safe = {
      ready: split.safeTasks.filter((j) => j.status === "queued").length,
      running: split.safeTasks.filter((j) => j.status === "running").length,
      completed: split.safeTasks.filter((j) => j.status === "completed")
        .length,
    };

    const risky = {
      pending: split.pendingApprovals.filter((a) => a.status === "pending")
        .length,
      approved: split.pendingApprovals.filter((a) => a.status === "approved")
        .length,
      timedOut: split.pendingApprovals.filter((a) => a.status === "timed_out")
        .length,
    };

    // Calculate timeout countdowns for pending approvals
    const timeoutCountdown = split.pendingApprovals
      .filter((a) => a.status === "pending")
      .map((approval) => {
        const createdMs = new Date(approval.createdAt).getTime();
        const nowMs = Date.now();
        const timeoutMs = 5 * 60 * 1000; // 5 minutes
        const remainingMs = Math.max(0, timeoutMs - (nowMs - createdMs));

        return {
          jobId: approval.dispatchJobId,
          remainingMs,
        };
      });

    return {
      total: allJobs.length,
      safe,
      risky,
      timeoutCountdown,
    };
  }
}

/**
 * Global progress manager instance.
 */
let globalManager: NonBlockingProgressManager | null = null;

export function getGlobalProgressManager(
  queue: SafeDispatchQueue
): NonBlockingProgressManager {
  if (!globalManager) {
    globalManager = new NonBlockingProgressManager(queue);
  }
  return globalManager;
}

export function resetGlobalProgressManager(): void {
  globalManager = null;
}
