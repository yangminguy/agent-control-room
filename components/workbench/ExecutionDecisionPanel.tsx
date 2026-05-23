"use client";

import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Ban,
  GitFork,
  HelpCircle,
} from "lucide-react";
import type { DecisionLabel } from "@/lib/types";

export interface ExecutionDecisionPanelProps {
  decision: DecisionLabel;
  reason: string;
  confidence: number;
  nextAction: string;
}

const DECISION_CONFIG: Record<
  DecisionLabel,
  {
    label: string;
    icon: React.ReactNode;
    borderColor: string;
    bgColor: string;
    textColor: string;
    badgeBg: string;
  }
> = {
  pass: {
    label: "통과",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
    badgeBg: "bg-emerald-100 text-emerald-700",
  },
  fail: {
    label: "실패",
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
    badgeBg: "bg-red-100 text-red-700",
  },
  qa_needed: {
    label: "QA 필요",
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    badgeBg: "bg-blue-100 text-blue-700",
  },
  retry_needed: {
    label: "다시 시도 필요",
    icon: <RotateCcw className="w-5 h-5 text-amber-600" />,
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
    badgeBg: "bg-amber-100 text-amber-700",
  },
  blocked: {
    label: "막힘",
    icon: <Ban className="w-5 h-5 text-orange-600" />,
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
    badgeBg: "bg-orange-100 text-orange-700",
  },
  drift_detected: {
    label: "방향 이탈 감지",
    icon: <GitFork className="w-5 h-5 text-purple-600" />,
    borderColor: "border-purple-200",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
    badgeBg: "bg-purple-100 text-purple-700",
  },
  manual_review: {
    label: "수동 검토 필요",
    icon: <HelpCircle className="w-5 h-5 text-gray-600" />,
    borderColor: "border-gray-200",
    bgColor: "bg-gray-50",
    textColor: "text-gray-700",
    badgeBg: "bg-gray-100 text-gray-700",
  },
};

const NEXT_ACTION_KO: Record<string, string> = {
  proceed_to_next_task: "다음 태스크 진행",
  run_qa_agent: "QA 에이전트 실행",
  retry_same_agent: "동일 에이전트 재시도",
  request_user_approval: "사용자 승인 요청",
  halt_and_notify: "실행 중단 및 알림",
  request_manual_review: "수동 검토 요청",
};

function ConfidenceBar({ confidence }: { confidence: number }) {
  const clamped = Math.min(100, Math.max(0, confidence));
  const color =
    clamped >= 85
      ? "bg-emerald-400"
      : clamped >= 60
        ? "bg-amber-400"
        : "bg-red-400";

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 w-8 text-right">
        {clamped}%
      </span>
    </div>
  );
}

export function ExecutionDecisionPanel({
  decision,
  reason,
  confidence,
  nextAction,
}: ExecutionDecisionPanelProps) {
  const config = DECISION_CONFIG[decision] ?? DECISION_CONFIG.manual_review;
  const nextActionLabel = NEXT_ACTION_KO[nextAction] ?? nextAction;

  return (
    <div className="space-y-3">
      {/* Decision badge row */}
      <div
        className={`flex items-center gap-3 rounded-lg border ${config.borderColor} ${config.bgColor} px-4 py-3`}
      >
        {config.icon}
        <span className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {/* Reason */}
      <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-1">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
          판정 이유
        </span>
        <p className="text-sm text-gray-800 leading-relaxed">{reason}</p>
      </div>

      {/* Confidence + Next action */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            신뢰도
          </span>
          <ConfidenceBar confidence={confidence} />
        </div>

        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            다음 추천 작업
          </span>
          <p className="text-sm font-medium text-gray-800">{nextActionLabel}</p>
        </div>
      </div>
    </div>
  );
}
