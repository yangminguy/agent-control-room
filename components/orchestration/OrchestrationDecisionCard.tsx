"use client";

/**
 * OrchestrationDecisionCard
 * Phase 40: Full Orchestration Layer
 *
 * OrchestrationDecision 판단 결과를 시각적으로 표시한다.
 */

import type { OrchestrationDecision } from "@/lib/orchestration/types";

const RISK_COLORS: Record<OrchestrationDecision["riskLevel"], string> = {
  safe: "bg-green-50 border-green-200 text-green-800",
  low: "bg-blue-50 border-blue-200 text-blue-800",
  medium: "bg-yellow-50 border-yellow-200 text-yellow-800",
  high: "bg-orange-50 border-orange-200 text-orange-800",
  critical: "bg-red-50 border-red-200 text-red-800",
};

const RISK_BADGES: Record<OrchestrationDecision["riskLevel"], string> = {
  safe: "bg-green-100 text-green-700",
  low: "bg-blue-100 text-blue-700",
  medium: "bg-yellow-100 text-yellow-700",
  high: "bg-orange-100 text-orange-700",
  critical: "bg-red-100 text-red-700",
};

const RISK_LABELS: Record<OrchestrationDecision["riskLevel"], string> = {
  safe: "안전",
  low: "낮음",
  medium: "중간",
  high: "높음",
  critical: "위험",
};

const MODE_LABELS: Record<OrchestrationDecision["executionMode"], string> = {
  single_agent: "단일 에이전트",
  sequential_multi_agent: "순차 다중 에이전트",
  parallel_safe: "병렬 안전",
  token_relay: "토큰 릴레이",
  manual_handoff: "수동 인수인계",
  workbench_handoff: "워크벤치 연결",
  blocked_user_decision: "사용자 결정 필요",
};

const AGENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  antigravity: "Antigravity",
  hermes: "Hermes",
  "vibe-kanban": "Vibe Kanban",
  "manual-user": "Manual/User",
};

interface OrchestrationDecisionCardProps {
  decision: OrchestrationDecision;
  onContextPackClick?: () => void;
  onHermesMemoryClick?: () => void;
}

export function OrchestrationDecisionCard({
  decision,
  onContextPackClick,
  onHermesMemoryClick,
}: OrchestrationDecisionCardProps) {
  const riskColorClass = RISK_COLORS[decision.riskLevel];
  const riskBadgeClass = RISK_BADGES[decision.riskLevel];

  return (
    <div className={`rounded-lg border-2 p-4 ${riskColorClass}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-semibold text-sm">{decision.title}</h3>
          <p className="text-xs opacity-75 mt-0.5">{decision.taskType}</p>
        </div>
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${riskBadgeClass}`}>
          위험도: {RISK_LABELS[decision.riskLevel]}
        </span>
      </div>

      {/* Summary */}
      <p className="text-xs opacity-80 mb-3 line-clamp-2">{decision.summary}</p>

      {/* Key Info Grid */}
      <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
        <div>
          <span className="opacity-60">실행 방식</span>
          <p className="font-medium">{MODE_LABELS[decision.executionMode]}</p>
        </div>
        <div>
          <span className="opacity-60">주 에이전트</span>
          <p className="font-medium">{AGENT_LABELS[decision.primaryAgent] ?? decision.primaryAgent}</p>
        </div>
        <div>
          <span className="opacity-60">병렬 실행</span>
          <p className="font-medium">{decision.parallelAllowed ? "가능" : "불가"}</p>
        </div>
        <div>
          <span className="opacity-60">승인 필요</span>
          <p className="font-medium">{decision.approvalGate.required ? "필요" : "불필요"}</p>
        </div>
      </div>

      {/* Next Action */}
      <div className="bg-white bg-opacity-50 rounded p-2 mb-3 text-xs">
        <span className="opacity-60">다음 액션: </span>
        <span className="font-medium">{decision.nextAction}</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 flex-wrap">
        {decision.contextPackRecommended && onContextPackClick && (
          <button
            onClick={onContextPackClick}
            className="text-xs px-3 py-1 bg-white bg-opacity-70 rounded border border-current opacity-80 hover:opacity-100 transition-opacity"
          >
            Context Pack 생성
          </button>
        )}
        {decision.hermesMemoryRecommended && onHermesMemoryClick && (
          <button
            onClick={onHermesMemoryClick}
            className="text-xs px-3 py-1 bg-white bg-opacity-70 rounded border border-current opacity-80 hover:opacity-100 transition-opacity"
          >
            Hermes 메모리 기록
          </button>
        )}
      </div>
    </div>
  );
}
