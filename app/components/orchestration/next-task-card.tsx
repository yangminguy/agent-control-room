"use client";

import type { NextTaskRecommendation } from "@/lib/orchestration/next-task-generator";
import type { AgentRoutingDetail } from "@/lib/orchestration/next-task-router";

interface NextTaskRecommendationCardProps {
  recommendation: NextTaskRecommendation;
  routing: AgentRoutingDetail;
}

export function NextTaskRecommendationCard({
  recommendation,
  routing,
}: NextTaskRecommendationCardProps) {
  const riskLevelColor: Record<string, string> = {
    safe: "bg-blue-50 text-blue-900 border-blue-200",
    low: "bg-green-50 text-green-900 border-green-200",
    medium: "bg-yellow-50 text-yellow-900 border-yellow-200",
    high: "bg-orange-50 text-orange-900 border-orange-200",
    critical: "bg-red-50 text-red-900 border-red-200",
  };

  const executionModeLabel: Record<string, string> = {
    single: "단일 실행",
    sequential: "순차 실행",
    parallel_safe: "병렬 실행 가능",
    blocked: "차단됨",
  };

  const conflictRiskLabel: Record<string, string> = {
    none: "위험 없음",
    low: "낮음",
    medium: "중간",
    high: "높음",
  };

  const agentLabel: Record<string, string> = {
    "claude-code": "Claude Code",
    codex: "Codex",
    antigravity: "Antigravity",
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-bold text-gray-900 mb-2">
            다음 추천 작업
          </h3>
          <h2 className="text-xl font-semibold text-blue-700">
            {recommendation.title}
          </h2>
        </div>
        <div className={`px-3 py-1 rounded-full text-sm font-medium border ${riskLevelColor[recommendation.riskLevel]}`}>
          {recommendation.riskLevel === "safe" && "안전"}
          {recommendation.riskLevel === "low" && "낮음"}
          {recommendation.riskLevel === "medium" && "중간"}
          {recommendation.riskLevel === "high" && "높음"}
          {recommendation.riskLevel === "critical" && "위험"}
        </div>
      </div>

      {/* 목표 */}
      <div className="mb-4">
        <p className="text-gray-600 mb-2">
          <span className="font-semibold">목표:</span> {recommendation.goal}
        </p>
        <p className="text-gray-500 text-sm">
          {recommendation.description}
        </p>
      </div>

      {/* 에이전트 및 선택 이유 */}
      <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              추천 에이전트
            </p>
            <p className="text-lg font-bold text-blue-700">
              {agentLabel[routing.agent]}
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-1">
              선택 이유
            </p>
            <p className="text-sm text-gray-700">
              {routing.reason}
            </p>
          </div>
        </div>
      </div>

      {/* 에이전트 능력 */}
      <div className="mb-4">
        <p className="text-sm font-semibold text-gray-700 mb-2">
          에이전트 능력
        </p>
        <div className="flex flex-wrap gap-2">
          {routing.capabilities.map((cap, i) => (
            <span
              key={i}
              className="bg-green-100 text-green-800 px-3 py-1 rounded text-sm"
            >
              ✓ {cap}
            </span>
          ))}
        </div>
      </div>

      {/* 제약사항 */}
      {routing.restrictions.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            제약사항
          </p>
          <div className="flex flex-wrap gap-2">
            {routing.restrictions.map((restriction, i) => (
              <span
                key={i}
                className="bg-red-100 text-red-800 px-3 py-1 rounded text-sm"
              >
                ⚠ {restriction}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 실행 방식 및 충돌 위험 */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            추천 실행 방식
          </p>
          <p className="text-sm text-gray-900 font-medium">
            {executionModeLabel[recommendation.executionMode]}
          </p>
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            충돌 위험
          </p>
          <p className="text-sm text-gray-900 font-medium">
            {conflictRiskLabel[recommendation.conflictRisk]}
          </p>
          {recommendation.conflictRiskReason && (
            <p className="text-xs text-gray-600 mt-1">
              {recommendation.conflictRiskReason}
            </p>
          )}
        </div>
      </div>

      {/* 자동 실행 가능 여부 */}
      {!routing.canAutoRun && (
        <div className="bg-amber-50 border border-amber-200 rounded p-3 mb-4">
          <p className="text-sm text-amber-900">
            ⚠️ <span className="font-semibold">수동 검토 필요:</span>{" "}
            이 에이전트는 자동 실행이 불가능합니다. 사용자가 검토 후 승인해야 합니다.
          </p>
        </div>
      )}

      {/* 완료 기준 */}
      {recommendation.acceptanceCriteria.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-semibold text-gray-700 mb-2">
            완료 기준
          </p>
          <ul className="space-y-1">
            {recommendation.acceptanceCriteria.map((criterion, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-start">
                <span className="mr-2">•</span>
                <span>{criterion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 파일 범위 */}
      {(recommendation.allowedFiles || recommendation.doNotTouchFiles) && (
        <div className="bg-gray-50 border border-gray-200 rounded p-3">
          {recommendation.allowedFiles && (
            <div className="mb-2">
              <p className="text-xs font-semibold text-gray-700 mb-1">
                ✓ 수정 가능 파일
              </p>
              <p className="text-xs text-gray-600">
                {recommendation.allowedFiles.join(", ")}
              </p>
            </div>
          )}
          {recommendation.doNotTouchFiles && (
            <div>
              <p className="text-xs font-semibold text-red-700 mb-1">
                ✗ 수정 금지 파일
              </p>
              <p className="text-xs text-red-600">
                {recommendation.doNotTouchFiles.join(", ")}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
