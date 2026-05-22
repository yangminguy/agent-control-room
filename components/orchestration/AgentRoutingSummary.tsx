"use client";

/**
 * AgentRoutingSummary
 * Phase 40: Full Orchestration Layer
 *
 * 에이전트 라우팅 판단 결과를 요약 표시한다.
 */

import type { ExtendedAgentType, ExecutionMode } from "@/lib/orchestration/types";
import type { RiskLevel } from "@/lib/types";

const AGENT_INFO: Record<ExtendedAgentType, { label: string; emoji: string; role: string }> = {
  "claude-code": {
    label: "Claude Code",
    emoji: "🤖",
    role: "아키텍처, 복잡한 구현, 통합, 고위험 변경",
  },
  codex: {
    label: "Codex",
    emoji: "🔬",
    role: "테스트, QA, 타입 에러, 제한된 구현",
  },
  antigravity: {
    label: "Antigravity",
    emoji: "🎨",
    role: "UI, 화면, 시각적 QA, 프론트엔드",
  },
  hermes: {
    label: "Hermes",
    emoji: "📋",
    role: "감시자, 기록자, 요약자, Obsidian memory",
  },
  "vibe-kanban": {
    label: "Vibe Kanban",
    emoji: "📌",
    role: "장시간 실행, 워크스페이스, diff/preview",
  },
  "manual-user": {
    label: "Manual/User",
    emoji: "👤",
    role: "비즈니스 결정, 방향 설정, 사용자 판단",
  },
};

const MODE_LABELS: Record<ExecutionMode, string> = {
  single_agent: "단일 에이전트",
  sequential_multi_agent: "순차 다중 에이전트",
  parallel_safe: "병렬 안전",
  token_relay: "토큰 릴레이",
  manual_handoff: "수동 인수인계",
  workbench_handoff: "워크벤치 연결",
  blocked_user_decision: "사용자 결정 필요",
};

const RISK_COLORS: Record<RiskLevel, string> = {
  safe: "text-green-600",
  low: "text-blue-600",
  medium: "text-yellow-600",
  high: "text-orange-600",
  critical: "text-red-600",
};

interface AgentRoutingSummaryProps {
  primaryAgent: ExtendedAgentType;
  secondaryAgent?: ExtendedAgentType;
  riskLevel: RiskLevel;
  executionMode: ExecutionMode;
  reasoning?: string[];
}

export function AgentRoutingSummary({
  primaryAgent,
  secondaryAgent,
  riskLevel,
  executionMode,
  reasoning,
}: AgentRoutingSummaryProps) {
  const primary = AGENT_INFO[primaryAgent];
  const secondary = secondaryAgent ? AGENT_INFO[secondaryAgent] : undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">에이전트 라우팅</h3>

      {/* Mode */}
      <div className="mb-3 flex items-center gap-2 text-xs">
        <span className="text-gray-500">실행 방식:</span>
        <span className="font-medium text-gray-800">{MODE_LABELS[executionMode]}</span>
        <span className={`font-medium ${RISK_COLORS[riskLevel]}`}>
          (위험도: {riskLevel})
        </span>
      </div>

      {/* Agents */}
      <div className="space-y-2">
        <div className="flex items-start gap-3 p-2 bg-gray-50 rounded">
          <span className="text-lg">{primary.emoji}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-900">{primary.label}</span>
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">주 에이전트</span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{primary.role}</p>
          </div>
        </div>

        {secondary && (
          <div className="flex items-start gap-3 p-2 bg-gray-50 rounded opacity-75">
            <span className="text-lg">{secondary.emoji}</span>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-900">{secondary.label}</span>
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">보조 에이전트</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">{secondary.role}</p>
            </div>
          </div>
        )}
      </div>

      {/* Reasoning */}
      {reasoning && reasoning.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 mb-1">판단 근거</p>
          {reasoning.slice(0, 3).map((r, i) => (
            <p key={i} className="text-xs text-gray-600">• {r}</p>
          ))}
        </div>
      )}
    </div>
  );
}
