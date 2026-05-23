"use client";

import type { NextTaskRecommendation } from "@/lib/orchestration/next-task-generator";
import type { AgentRoutingDetail } from "@/lib/orchestration/next-task-router";
import type { HermesInsight } from "@/lib/hermes/insight-recorder";
import type { ParallelSafetyDecision } from "@/lib/orchestration/parallel-safety-decider";
import { NextTaskRecommendationCard } from "./next-task-card";
import { HermesInsightPanel } from "./hermes-insight-panel";

interface OrchestrationDecisionPanelProps {
  recommendation: NextTaskRecommendation;
  routing: AgentRoutingDetail;
  insights?: HermesInsight[];
  parallelDecision?: ParallelSafetyDecision;
}

export function OrchestrationDecisionPanel({
  recommendation,
  routing,
  insights = [],
  parallelDecision,
}: OrchestrationDecisionPanelProps) {
  return (
    <div className="space-y-6">
      {/* 메인 작업 카드 */}
      <NextTaskRecommendationCard
        recommendation={recommendation}
        routing={routing}
      />

      {/* 병렬 실행 결정 */}
      {parallelDecision && (
        <div className="border rounded-lg p-6 bg-white shadow-sm">
          <h3 className="text-lg font-bold text-gray-900 mb-4">
            실행 방식 분석
          </h3>

          <div className="grid grid-cols-1 gap-4 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm font-semibold text-gray-700 mb-2">
                추천 실행 모드
              </p>
              <p className="text-lg font-bold text-blue-700">
                {parallelDecision.mode === "single" && "단일 실행"}
                {parallelDecision.mode === "sequential" && "순차 실행"}
                {parallelDecision.mode === "parallel_safe" && "병렬 실행 가능"}
                {parallelDecision.mode === "blocked" && "차단됨"}
              </p>
              <p className="text-sm text-gray-700 mt-2">
                {parallelDecision.reason}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  충돌 위험
                </p>
                <p className="text-lg font-bold text-gray-900">
                  {parallelDecision.conflictRisk === "none" && "없음"}
                  {parallelDecision.conflictRisk === "low" && "낮음"}
                  {parallelDecision.conflictRisk === "medium" && "중간"}
                  {parallelDecision.conflictRisk === "high" && "높음"}
                </p>
              </div>
              <div className="bg-gray-50 border border-gray-200 rounded p-4">
                <p className="text-sm font-semibold text-gray-700 mb-1">
                  겹치는 파일
                </p>
                <p className="text-sm text-gray-600">
                  {parallelDecision.conflictingFiles.length === 0
                    ? "없음"
                    : parallelDecision.conflictingFiles.length + "개"}
                </p>
              </div>
            </div>

            {parallelDecision.conflictingFiles.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded p-4">
                <p className="text-sm font-semibold text-amber-900 mb-2">
                  겹치는 파일 목록
                </p>
                <ul className="text-sm text-amber-900 space-y-1">
                  {parallelDecision.conflictingFiles.map((file, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-2">•</span>
                      <code className="bg-white px-1 rounded">{file}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                조언
              </p>
              <p className="text-sm text-blue-900">
                {parallelDecision.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Hermes 인사이트 */}
      {insights.length > 0 && <HermesInsightPanel insights={insights} />}
    </div>
  );
}
