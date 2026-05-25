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
  ExecutionPacketPanel,
  ExternalToolsStatusPanel,
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

const TABS = [
  "종합 관제 대시보드",
  "작업 대기열",
  "개발자용 고급 도구",
] as const;

type TabIndex = 0 | 1 | 2;

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
    isDemoMode,
    setStatusFilter,
    updateJobStatus,
    collectResult,
    mockApprove,
    mockReject,
    toggleDemoMode,
  } = useOrchestration();

  // Auto-open dashboard (we show approvals at the top of dashboard)
  const [activeTab, setActiveTab] = useState<TabIndex>(0);

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
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
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
                    ? "border-pink-primary text-pink-primary bg-white"
                    : "border-transparent text-zinc-500 hover:text-zinc-900 hover:bg-white"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        <div className="pt-4">
          {/* Tab 0: Dashboard (종합 관제 대시보드) */}
          {activeTab === 0 && (
            <div className="space-y-8">
              {/* 진행 상황 */}
              <section>
                <h2 className="text-lg font-bold text-text-primary mb-4">현재 진행 상황</h2>
                <ProgressManagerStatusView
                  safeJobs={safeJobs}
                  riskyJobs={riskyJobs}
                  approvalCountdowns={approvalCountdowns}
                />
              </section>

              {/* 승인 대기 중 (최상단 강조) */}
              {approvals.length > 0 && firstApproval && (
                <section className="bg-orange-50 border border-orange-200 rounded-lg p-4 relative">
                  {isDemoMode && (
                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded shadow">
                      개발자용 샘플 데이터
                    </div>
                  )}
                  <h2 className="text-lg font-bold text-orange-800 mb-4 flex items-center">
                    <span className="mr-2">⚠️</span> 승인 대기 중인 항목
                  </h2>
                  <div className="space-y-4">
                    {approvals.filter(a => a.status === 'pending').map((approval) => {
                      const job = jobs.find((j) => j.id === approval.dispatchJobId) ?? firstApprovalJob;
                      return (
                        <div key={approval.id}>
                          <ApprovalGatePanel
                            approval={approval}
                            jobId={job.id}
                            isMock={true}
                            onApprove={async () => {
                              mockApprove(approval.id);
                            }}
                            onReject={async () => {
                              mockReject(approval.id);
                            }}
                          />
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* 다음 실행 판단 (Phase 2 UI) */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-text-primary">다음 실행 제안</h2>
                  <button
                    type="button"
                    onClick={toggleDemoMode}
                    className="px-3 py-1.5 text-xs font-medium rounded border border-border bg-surface-2 hover:bg-surface-3 transition-colors text-text-secondary"
                  >
                    {isDemoMode ? "[개발자용] 데모 데이터 끄기" : "[개발자용] 데모 데이터 켜기"}
                  </button>
                </div>

                {!isDemoMode ? (
                  <div className="border border-dashed border-zinc-300 rounded-lg p-12 text-center bg-white">
                    <p className="text-lg font-medium text-text-primary mb-2">현재 실행 제안이 없습니다.</p>
                    <p className="text-sm text-text-secondary">
                      새로운 작업이 대기열에 올라오면 다음 추천 작업 및 프롬프트가 표시됩니다.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4 relative border-2 border-yellow-400 rounded-xl p-4 bg-yellow-50/30">
                    <div className="absolute -top-3 -right-3 px-3 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded shadow">
                      개발자용 샘플 데이터
                    </div>
                    <Phase2OrchestrationDecisionPanel
                      recommendation={demoRecommendation}
                      routing={demoRouting}
                      parallelDecision={demoParallelDecision}
                      insights={demoInsights}
                    />
                  </div>
                )}
              </section>

              {/* 막힌 부분 / 시스템 판단 */}
              <section>
                <h2 className="text-lg font-bold text-text-primary mb-4">시스템 판단 및 인사이트</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <AutoDecisionPanel validationId={results[0]?.id ?? "latest-validation"} />
                  <MonitorInsightPanel />
                </div>
              </section>
            </div>
          )}

          {/* Tab 1: Queue (작업 대기열) */}
          {activeTab === 1 && (
            <div className="space-y-6">
              <section>
                <h2 className="text-lg font-bold text-text-primary mb-4">채팅 기반 작업 등록</h2>
                <ConversationToJobPanel />
              </section>
              <section>
                <h2 className="text-lg font-bold text-text-primary mb-4">자동 실행 설정</h2>
                <AutoDispatchControl />
              </section>
              <section>
                <h2 className="text-lg font-bold text-text-primary mb-4">대기열 목록</h2>
                <DispatchStatusPanel
                  jobs={jobs}
                  selectedStatus={statusFilter}
                  onStatusFilterChange={setStatusFilter}
                />
              </section>
            </div>
          )}

          {/* Tab 2: Advanced (고급 / 개발자용 도구) */}
          {activeTab === 2 && (
            <div className="space-y-8 p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
              <div className="bg-red-50 text-red-800 p-3 rounded text-sm font-semibold mb-6 inline-block">
                ⚠️ [개발자용 영역] 이 탭의 도구들은 시스템 테스트 및 디버깅 목적으로만 사용하세요.
              </div>

              {/* 승인 이력 모의 테스트 (개발자용 승인/거절) */}
              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  승인 이력 및 모의 테스트
                </summary>
                <div className="p-4 space-y-4">
                  {approvals.length === 0 ? (
                    <p className="text-sm text-text-secondary">현재 승인 요청이 없습니다.</p>
                  ) : (
                    approvals.map((approval) => (
                      <div key={approval.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                        <p className="text-sm mb-2">상태: <strong>{approval.status}</strong></p>
                        {approval.status === "pending" && (
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => mockApprove(approval.id)}
                              className="px-3 py-1.5 rounded border border-zinc-600 bg-zinc-800 text-zinc-100 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                              [개발자용] 모의 승인
                            </button>
                            <button
                              type="button"
                              onClick={() => mockReject(approval.id)}
                              className="px-3 py-1.5 rounded border border-zinc-600 bg-zinc-800 text-zinc-100 text-sm font-medium hover:bg-zinc-700 transition-colors"
                            >
                              [개발자용] 모의 거절
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  결과 수집기 (Result Collection)
                </summary>
                <div className="p-4">
                  <ResultCollectionPanel
                    onCollect={collectResult}
                    jobs={jobs}
                    results={results}
                    onJobStatusChange={updateJobStatus}
                  />
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  수동 오케스트레이션 결정 (Legacy)
                </summary>
                <div className="p-4">
                  <LegacyOrchestrationDecisionPanel />
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  피드백 루프 이력
                </summary>
                <div className="p-4 space-y-4">
                  {feedbackOutputs.length === 0 || !firstFeedback ? (
                    <div className="rounded-lg border border-dashed border-border p-6 text-center">
                      <p className="text-sm text-text-secondary">아직 피드백 루프 이력이 없습니다.</p>
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
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden" open>
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  외부 툴 연동 상태 (External Tools)
                </summary>
                <div className="p-4 bg-gray-50">
                  <ExternalToolsStatusPanel />
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  실행 패킷 뷰어 (Execution Packets)
                </summary>
                <div className="p-4 bg-gray-50">
                  <ExecutionPacketPanel />
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  실행 로그 뷰어
                </summary>
                <div className="p-4">
                  <OrchestrationLogViewer />
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  실행 지표
                </summary>
                <div className="p-4">
                  <OrchestrationMetricsPanel />
                </div>
              </details>

              <details className="group border border-zinc-300 rounded-lg bg-white overflow-hidden">
                <summary className="cursor-pointer font-bold bg-zinc-100 p-4 hover:bg-zinc-200 transition-colors">
                  Hermes 실시간 감시 패널
                </summary>
                <div className="p-4">
                  <MonitorLivePanel />
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
