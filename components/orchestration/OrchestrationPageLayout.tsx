"use client";

import { useState } from "react";
import { useOrchestration } from "@/lib/dispatch/orchestration-context";
import {
  DispatchStatusPanel,
  ProgressManagerStatusView,
  FeedbackLoopSummaryCard,
  ConversationToJobPanel,
  MonitorInsightPanel,
  MonitorLivePanel,
  OrchestrationLogViewer,
  AutoDispatchControl,
  OrchestrationMetricsPanel,
  OrchestrationDecisionPanel as LegacyOrchestrationDecisionPanel,
} from "@/components/orchestration/index";
import { OrchestrationDecisionPanel as Phase2OrchestrationDecisionPanel } from "@/app/components/orchestration/orchestration-decision-panel";
import { ApprovalGatePanel } from "@/components/orchestration/ApprovalGatePanel";
import { AutoDecisionPanel } from "@/components/orchestration/AutoDecisionPanel";
import { ResultCollectionPanel } from "@/components/orchestration/ResultCollectionPanel";
import type { DispatchJob } from "@/lib/types";
import type { NextTaskRecommendation } from "@/lib/orchestration/next-task-generator";
import type { AgentRoutingDetail } from "@/lib/orchestration/next-task-router";
import type { HermesInsight } from "@/lib/hermes/insight-recorder";
import type { ParallelSafetyDecision } from "@/lib/orchestration/parallel-safety-decider";

// ── Tab config ────────────────────────────────────────────────────────────────

const TABS = [
  "실행 판단",
  "실행 작업 대기열",
  "실행 결과",
  "승인 요청",
  "진행 상황",
  "피드백",
  "Hermes 인사이트",
  "실행 로그",
  "실행 지표",
  "Hermes 실시간 감시",
] as const;

type TabIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

// ── Helpers ───────────────────────────────────────────────────────────────────

function getRemainingMs(job: DispatchJob): number {
  if (!job.timeoutAt) return 0;
  return Math.max(0, new Date(job.timeoutAt).getTime() - Date.now());
}

// ── Demo Data ─────────────────────────────────────────────────────────────────

const demoRecommendation = {
  title: "Phase 2 UI Live Wiring",
  goal: "Make the Phase 2 orchestration UI visible in the live product",
  description: "Wire up NextTaskRecommendationCard, HermesInsightPanel, and OrchestrationDecisionPanel.",
  acceptanceCriteria: [
    "Phase 2 UI is visible in OrchestrationDecision tab",
    "Old manual form is moved to an advanced section",
    "Labels are translated to PM-friendly Korean",
  ],
  allowedFiles: ["components/orchestration/OrchestrationPageLayout.tsx"],
  doNotTouchFiles: ["lib/orchestration/agent-router.ts"],
  riskLevel: "safe",
  conflictRisk: "none",
  conflictRiskReason: "Only touching UI layout, no backend logic changes.",
  executionMode: "single",
} as unknown as NextTaskRecommendation;

const demoRouting = {
  agent: "antigravity",
  reason: "Task involves UI wiring and visual polish, which is the exact role of Antigravity.",
  capabilities: ["UI/UX", "Visual Iteration", "Screen Work"],
  restrictions: ["Backend logic", "Data models"],
  canAutoRun: false,
} as unknown as AgentRoutingDetail;

const demoParallelDecision = {
  mode: "single",
  conflictRisk: "low",
  conflictingFiles: [],
  reason: "Single UI file change, safe to run independently but no need for parallelization.",
  recommendation: "Run as a single task to ensure UI consistency.",
} as unknown as ParallelSafetyDecision;

const demoInsights = [
  {
    id: "insight-1",
    source: "execution_result",
    severity: "info",
    summary: "UI components loaded successfully",
    details: "Detected the presence of Phase 2 UI components in the app directory.",
    evidence: ["app/components/orchestration/next-task-card.tsx exists"],
    recommendation: "Proceed with wiring them into the main layout.",
  },
] as unknown as HermesInsight[];

// ── Component ─────────────────────────────────────────────────────────────────

export function OrchestrationPageLayout() {
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

  // Auto-open Approvals tab if there are pending approvals
  const [activeTab, setActiveTab] = useState<TabIndex>(approvals.length > 0 ? 3 : 0);
  const [showDemo, setShowDemo] = useState(false);

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
          <h1 className="text-xl font-bold text-text-primary">실행 제어판</h1>
          <p className="text-sm text-text-secondary mt-1">
            실행 작업을 모니터링하고, 결과를 수집하며, 승인 및 피드백을 관리합니다.
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
          {activeTab === 0 && (
            <div className="space-y-8">
              {/* Demo Toggle for PM */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDemo(!showDemo)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-surface-2 hover:bg-surface-3 transition-colors text-text-secondary"
                >
                  {showDemo ? "데모 데이터 끄기" : "데모 데이터 켜기"}
                </button>
              </div>

              {!showDemo ? (
                <div className="border border-dashed border-border rounded-lg p-12 text-center bg-surface-1">
                  <p className="text-lg font-medium text-text-primary mb-2">아직 실행 결과가 없습니다.</p>
                  <p className="text-sm text-text-secondary">
                    작업을 실행하면 다음 추천 작업, 추천 에이전트, 병렬 가능 여부, Hermes 인사이트가 여기에 표시됩니다.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-bold rounded">
                    샘플 오케스트레이션 판단
                  </div>
                  <Phase2OrchestrationDecisionPanel
                    recommendation={demoRecommendation}
                    routing={demoRouting}
                    parallelDecision={demoParallelDecision}
                    insights={demoInsights}
                  />
                </div>
              )}

              {/* Legacy / Advanced Section */}
              <div className="mt-12 pt-8 border-t border-border">
                <details className="group">
                  <summary className="cursor-pointer text-sm font-medium text-text-secondary hover:text-text-primary flex items-center">
                    <span className="mr-2">▶</span> 고급 설정 (수동 결정 패널)
                  </summary>
                  <div className="mt-4 opacity-75 grayscale group-hover:grayscale-0 group-hover:opacity-100 transition-all">
                    <LegacyOrchestrationDecisionPanel />
                  </div>
                </details>
              </div>
            </div>
          )}

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
                  <p className="text-sm text-text-secondary">현재 대기 중인 승인 요청이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvals.map((approval) => {
                    const job = jobs.find((j) => j.id === approval.dispatchJobId) ?? firstApprovalJob;
                    return (
                      <div key={approval.id} className="space-y-2">
                        <ApprovalGatePanel
                          approval={approval}
                          jobId={job.id}
                          onApprove={async () => {
                            mockApprove(approval.id);
                          }}
                          onReject={async () => {
                            mockReject(approval.id);
                          }}
                        />
                        {approval.status === "pending" && (
                          <details className="group">
                            <summary className="cursor-pointer text-xs font-medium text-text-secondary hover:text-text-primary flex items-center px-1">
                              <span className="mr-2">▶</span> 개발자용 모의 승인/거절
                            </summary>
                            <div className="mt-2 flex gap-2 px-1 pl-4">
                              <button
                                type="button"
                                onClick={() => mockApprove(approval.id)}
                                className="px-2 py-1 rounded border border-zinc-600 bg-zinc-900 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition-colors opacity-60 hover:opacity-80"
                              >
                                [dev] 모의 승인
                              </button>
                              <button
                                type="button"
                                onClick={() => mockReject(approval.id)}
                                className="px-2 py-1 rounded border border-zinc-600 bg-zinc-900 text-zinc-400 text-xs font-medium hover:bg-zinc-800 transition-colors opacity-60 hover:opacity-80"
                              >
                                [dev] 모의 거절
                              </button>
                            </div>
                          </details>
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
          {activeTab === 6 && (
            <div className="space-y-4">
              <AutoDecisionPanel validationId={results[0]?.id ?? "latest-validation"} />
              <MonitorInsightPanel />
            </div>
          )}

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
