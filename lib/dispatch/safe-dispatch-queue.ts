import { DispatchJob, DispatchJobStatus } from "../types";

/**
 * T042: Safe Dispatch Queue
 * In-memory queue for dispatch jobs (no spawning, pure state machine).
 * Supports job transitions and split by risk level for Phase 15.
 */

export class SafeDispatchQueue {
  private jobs: Map<string, DispatchJob> = new Map();

  /**
   * Add a job to the queue.
   */
  addJob(job: DispatchJob): void {
    if (!job.id) {
      throw new Error("Job must have an id");
    }
    this.jobs.set(job.id, { ...job });
  }

  /**
   * Add multiple jobs.
   */
  addJobs(jobs: DispatchJob[]): void {
    jobs.forEach((job) => this.addJob(job));
  }

  /**
   * Get a job by id.
   */
  getJob(jobId: string): DispatchJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Update job status.
   * Returns true if successful, false if job not found.
   */
  updateJobStatus(
    jobId: string,
    status: DispatchJobStatus,
    metadata?: Partial<DispatchJob>
  ): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const updated: DispatchJob = {
      ...job,
      status,
      ...metadata,
    };

    // Validate state transition
    this.validateTransition(job.status, status);
    this.jobs.set(jobId, updated);
    return true;
  }

  /**
   * Get all jobs with a specific status.
   */
  getJobsByStatus(status: DispatchJobStatus): DispatchJob[] {
    return Array.from(this.jobs.values()).filter((j) => j.status === status);
  }

  /**
   * Get all jobs.
   */
  getAllJobs(): DispatchJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Split queue into safe and risky tasks.
   * Safe: risk level safe | low
   * Risky: risk level medium | high | critical
   * Returns { safe, risky, total }
   */
  splitByRisk(): {
    safe: DispatchJob[];
    risky: DispatchJob[];
    total: number;
  } {
    const allJobs = this.getAllJobs();
    const safe = allJobs.filter((j) =>
      ["safe", "low"].includes(j.riskLevel)
    );
    const risky = allJobs.filter((j) =>
      ["medium", "high", "critical"].includes(j.riskLevel)
    );

    return {
      safe,
      risky,
      total: allJobs.length,
    };
  }

  /**
   * Get next job to run (FIFO by createdAt).
   * Optionally filter by status.
   */
  getNextJob(status?: DispatchJobStatus): DispatchJob | undefined {
    const candidates = status
      ? this.getJobsByStatus(status)
      : Array.from(this.jobs.values());

    if (candidates.length === 0) return undefined;

    // Sort by createdAt (earliest first)
    candidates.sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    return candidates[0];
  }

  /**
   * Remove a job from the queue.
   */
  removeJob(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Clear all jobs.
   */
  clear(): void {
    this.jobs.clear();
  }

  /**
   * Get queue statistics.
   */
  getStats(): {
    total: number;
    byStatus: Record<DispatchJobStatus, number>;
    byRiskLevel: Record<string, number>;
  } {
    const allJobs = this.getAllJobs();

    const byStatus: Record<DispatchJobStatus, number> = {
      queued: 0,
      running: 0,
      approved: 0,
      skipped_due_to_risk: 0,
      completed: 0,
      failed: 0,
    };

    const byRiskLevel: Record<string, number> = {
      safe: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    allJobs.forEach((job) => {
      byStatus[job.status]++;
      byRiskLevel[job.riskLevel]++;
    });

    return {
      total: allJobs.length,
      byStatus,
      byRiskLevel,
    };
  }

  /**
   * Increment retry count for a job.
   * Returns new retry count, or -1 if job not found.
   */
  incrementRetry(jobId: string): number {
    const job = this.jobs.get(jobId);
    if (!job) return -1;

    const newCount = (job.retryCount || 0) + 1;
    job.retryCount = newCount;
    this.jobs.set(jobId, job);
    return newCount;
  }

  /**
   * Check if job has exceeded max retries.
   * Max retries default to 3.
   */
  hasExceededMaxRetries(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    const maxRetries = job.maxRetries || 3;
    return job.retryCount >= maxRetries;
  }

  /**
   * Validate state transition.
   * Throws if transition is invalid.
   */
  private validateTransition(from: DispatchJobStatus, to: DispatchJobStatus): void {
    const validTransitions: Record<DispatchJobStatus, DispatchJobStatus[]> = {
      queued: ["running", "approved", "skipped_due_to_risk", "failed"],
      running: ["completed", "failed", "approved"],
      approved: ["running", "completed", "failed"],
      skipped_due_to_risk: ["completed", "failed"],
      completed: [],
      failed: [],
    };

    if (!validTransitions[from]?.includes(to)) {
      throw new Error(
        `Invalid state transition: ${from} → ${to}`
      );
    }
  }
}

/**
 * Global queue instance (singleton pattern).
 * In production, this would be injected or use a proper service container.
 */
let globalQueue: SafeDispatchQueue | null = null;

export function getGlobalQueue(): SafeDispatchQueue {
  if (!globalQueue) {
    globalQueue = new SafeDispatchQueue();
  }
  return globalQueue;
}

export function resetGlobalQueue(): void {
  globalQueue = null;
}
