"use client";

import { useState } from "react";
import { useOrchestration } from "@/lib/dispatch/orchestration-context";
import { computeFeedbackDecision } from "@/lib/dispatch/client-feedback-helper";
import type { AgentResult } from "@/lib/types";

type ProgressState = {
  current: number;
  total: number;
  currentJobId: string;
};

type JobError = {
  jobId: string;
  error: string;
};

export function AutoDispatchControl() {
  const { jobs, updateJobStatus, collectResult, addFeedbackOutput } = useOrchestration();

  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<ProgressState | null>(null);
  const [errors, setErrors] = useState<JobError[]>([]);
  const [completedCount, setCompletedCount] = useState<number | null>(null);

  // Derived at render time only for display; actual dispatch uses current context snapshot at invocation
  const safeQueuedJobsCount = jobs.filter(
    (j) => j.status === "queued" && (j.riskLevel === "safe" || j.riskLevel === "low"),
  ).length;

  async function handleAutoDispatch() {
    // Snapshot safe queued jobs at invocation time (not at render time)
    const safeQueuedJobs = jobs.filter(
      (j) => j.status === "queued" && (j.riskLevel === "safe" || j.riskLevel === "low"),
    );

    if (safeQueuedJobs.length === 0) return;

    setIsRunning(true);
    setErrors([]);
    setCompletedCount(null);

    const total = safeQueuedJobs.length;
    const jobErrors: JobError[] = [];
    let dispatched = 0;

    for (let i = 0; i < safeQueuedJobs.length; i++) {
      const job = safeQueuedJobs[i];
      setProgress({ current: i + 1, total, currentJobId: job.id });
      updateJobStatus(job.id, "running");

      try {
        const response = await fetch("/api/orchestration/dispatch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(job),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
          jobErrors.push({ jobId: job.id, error: errData.error ?? `HTTP ${response.status}` });
          updateJobStatus(job.id, "failed");
          continue;
        }

        const data = await response.json();
        const result = data.result as AgentResult;

        collectResult(result);

        const feedback = computeFeedbackDecision(result, job);
        addFeedbackOutput(feedback);

        dispatched++;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        jobErrors.push({ jobId: job.id, error: message });
        updateJobStatus(job.id, "failed");
      }
    }

    setErrors(jobErrors);
    setCompletedCount(dispatched);
    setIsRunning(false);
    setProgress(null);
  }

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">Auto Dispatch Safe Jobs</h3>
      </div>

      {/* Info */}
      <p className="text-xs text-text-secondary">
        {safeQueuedJobsCount > 0
          ? `${safeQueuedJobsCount} safe/low risk job${safeQueuedJobsCount !== 1 ? "s" : ""} ready to dispatch.`
          : "No safe jobs in queue."}
      </p>

      {/* Button */}
      <button
        type="button"
        onClick={handleAutoDispatch}
        disabled={isRunning || safeQueuedJobsCount === 0}
        className="px-4 py-2 rounded border border-pink-primary text-pink-primary text-sm font-medium hover:bg-pink-primary/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isRunning ? "Dispatching..." : "Auto Dispatch Safe Jobs"}
      </button>

      {/* Progress */}
      {isRunning && progress && (
        <div className="space-y-2">
          <div className="h-1.5 rounded-full bg-surface overflow-hidden">
            <div
              className="h-full bg-pink-primary transition-all"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <p className="text-xs text-text-secondary">
            Dispatching job {progress.current} of {progress.total} ({progress.currentJobId}...)
          </p>
        </div>
      )}

      {/* Per-job errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map(({ jobId, error }) => (
            <p key={jobId} className="text-xs text-red-400">
              {jobId}: {error}
            </p>
          ))}
        </div>
      )}

      {/* Completion summary */}
      {!isRunning && completedCount !== null && (
        <p className="text-xs text-emerald-400">
          {completedCount} dispatched, {errors.length} error{errors.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
