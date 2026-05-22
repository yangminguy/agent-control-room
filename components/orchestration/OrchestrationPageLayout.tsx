"use client";

import { useState } from "react";
import { useOrchestration } from "@/lib/dispatch/orchestration-context";
import {
  DispatchStatusPanel,
  DiscordApprovalPreviewCard,
  ProgressManagerStatusView,
  FeedbackLoopSummaryCard,
  ConversationToJobPanel,
  MonitorInsightPanel,
  MonitorLivePanel,
  OrchestrationLogViewer,
  AutoDispatchControl,
  OrchestrationMetricsPanel,
  OrchestrationDecisionPanel,
} from "@/components/orchestration/index";
import { ResultCollectionPanel } from "@/components/orchestration/ResultCollectionPanel";
import type { DispatchJob } from "@/lib/types";

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  "OrchestrationDecision",
  "Dispatch Queue",
  "Results",
  "Approvals",
  "Progress",
  "Feedback",
  "Hermes Insights",
  "Logs",
  "Metrics",
  "Hermes Live",
] as const;

type TabIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRemainingMs(job: DispatchJob): number {
  if (!job.timeoutAt) return 0;
  return Math.max(0, new Date(job.timeoutAt).getTime() - Date.now());
}

// ── Component ─────────────────────────────────────────────────────────────────

export function OrchestrationPageLayout() {
  const [activeTab, setActiveTab] = useState<TabIndex>(0);

  const {
    jobs,
    results,
    approvals,
    feedbackOutputs,
    statusFilter,
    setStatusFilter,
    updateJobStatus,
    collectResult,
    mockApprove,
    mockReject,
  } = useOrchestration();

  // Derived data for sub-components
  const safeJobs = jobs.filter((j) => j.riskLevel === "safe" || j.riskLevel === "low");
  const riskyJobs = jobs.filter(
    (j) => j.riskLevel === "medium" || j.riskLevel === "high" || j.riskLevel === "critical"
  );

  const approvalCountdowns = riskyJobs
    .filter((j) => j.timeoutAt)
    .map((j) => ({ jobId: j.id, remainingMs: getRemainingMs(j) }));

  // First approval + its job for the preview card
  const firstApproval = approvals[0] ?? null;
  const firstApprovalJob = firstApproval
    ? (jobs.find((j) => j.id === firstApproval.dispatchJobId) ?? jobs[0])
    : jobs[0];

  // First feedback output + original job
  const firstFeedback = feedbackOutputs[0] ?? null;
  const feedbackOriginalJob =
    firstFeedback?.nextDispatchJob
      ? (jobs.find((j) => j.id !== firstFeedback.nextDispatchJob?.id) ?? jobs[0])
      : jobs[0];

  return (
    <div className="min-h-screen bg-background text-text-primary">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-text-primary">Orchestration Control Panel</h1>
          <p className="text-sm text-text-secondary mt-1">
            Monitor dispatch jobs, collect results, manage approvals, and review feedback.
          </p>
        </div>

        {/* Tab navigation */}
        <div className="flex gap-1 border-b border-border pb-0">
          {TABS.map((tab, i) => {
            const isActive = activeTab === i;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(i as TabIndex)}
                className={`px-4 py-2 text-sm font-medium rounded-t border-b-2 transition-colors ${
                  isActive
                    ? "border-pink-primary text-pink-primary bg-surface-2"
                    : "border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-2"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="pt-2">
          {/* Tab 0: OrchestrationDecision */}
          {activeTab === 0 && <OrchestrationDecisionPanel />}

          {/* Tab 1: Dispatch Queue */}
          {activeTab === 1 && (
            <div className="space-y-4">
              <ConversationToJobPanel />
              <AutoDispatchControl />
              <DispatchStatusPanel
                jobs={jobs}
                selectedStatus={statusFilter}
                onStatusFilterChange={setStatusFilter}
              />
            </div>
          )}

          {/* Tab 2: Results */}
          {activeTab === 2 && (
            <ResultCollectionPanel
              onCollect={collectResult}
              jobs={jobs}
              results={results}
              onJobStatusChange={updateJobStatus}
            />
          )}

          {/* Tab 3: Approvals */}
          {activeTab === 3 && (
            <div className="space-y-4">
              {approvals.length === 0 || !firstApproval ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-text-secondary">No approval requests.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map((approval) => {
                    const job = jobs.find((j) => j.id === approval.dispatchJobId) ?? firstApprovalJob;
                    return (
                      <div key={approval.id} className="space-y-2">
                        <DiscordApprovalPreviewCard
                          approvalRequest={approval}
                          dispatchJob={job}
                          discordMessage={
                            approval.discordMessagePreview ??
                            `[APPROVAL REQUIRED]\nJob: ${job.id}\nRisk: ${job.riskLevel}`
                          }
                        />
                        {approval.status === "pending" && (
                          <div className="flex gap-2 px-1">
                            <button
                              type="button"
                              onClick={() => mockApprove(approval.id)}
                              className="px-3 py-1.5 rounded border border-emerald-700 bg-emerald-950 text-emerald-300 text-xs font-medium hover:bg-emerald-900 transition-colors"
                            >
                              Mock Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => mockReject(approval.id)}
                              className="px-3 py-1.5 rounded border border-red-700 bg-red-950 text-red-300 text-xs font-medium hover:bg-red-900 transition-colors"
                            >
                              Mock Reject
                            </button>
                          </div>
                        )}
                        {approval.status !== "pending" && (
                          <p className="text-xs text-text-secondary px-1">
                            Status: <span className="font-medium text-text-primary">{approval.status}</span>
                            {approval.resolvedAt && (
                              <> — resolved at {new Date(approval.resolvedAt).toLocaleString()}</>
                            )}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Progress */}
          {activeTab === 4 && (
            <ProgressManagerStatusView
              safeJobs={safeJobs}
              riskyJobs={riskyJobs}
              approvalCountdowns={approvalCountdowns}
            />
          )}

          {/* Tab 5: Feedback */}
          {activeTab === 5 && (
            <div className="space-y-4">
              {feedbackOutputs.length === 0 || !firstFeedback ? (
                <div className="rounded-lg border border-dashed border-border p-6 text-center">
                  <p className="text-sm text-text-secondary">No feedback loop outputs yet.</p>
                </div>
              ) : (
                feedbackOutputs.map((feedback, i) => (
                  <FeedbackLoopSummaryCard
                    key={i}
                    feedbackOutput={feedback}
                    originalJob={feedbackOriginalJob}
                  />
                ))
              )}
            </div>
          )}

          {/* Tab 6: Hermes Insights */}
          {activeTab === 6 && <MonitorInsightPanel />}

          {/* Tab 7: Logs */}
          {activeTab === 7 && <OrchestrationLogViewer />}

          {/* Tab 8: Metrics */}
          {activeTab === 8 && <OrchestrationMetricsPanel />}

          {/* Tab 9: Hermes Live */}
          {activeTab === 9 && <MonitorLivePanel />}
        </div>
      </div>
    </div>
  );
}
