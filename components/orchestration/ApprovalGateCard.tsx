"use client";

/**
 * ApprovalGateCard
 * Phase 40: Full Orchestration Layer
 *
 * 사용자가 실행 전 확인해야 할 승인 게이트를 표시한다.
 */

import { useState } from "react";
import type { ApprovalGate } from "@/lib/orchestration/types";
import type { RiskLevel } from "@/lib/types";

const RISK_LABELS: Record<RiskLevel, string> = {
  safe: "안전",
  low: "낮음",
  medium: "중간",
  high: "높음",
  critical: "위험",
};

interface ApprovalGateCardProps {
  gate: ApprovalGate;
  riskLevel: RiskLevel;
  onApprove?: (checkedItems: boolean[]) => void;
}

export function ApprovalGateCard({ gate, riskLevel, onApprove }: ApprovalGateCardProps) {
  const [checkedItems, setCheckedItems] = useState<boolean[]>(
    gate.checklist.map(() => false)
  );

  const allChecked = checkedItems.every(Boolean);

  function toggleItem(index: number) {
    setCheckedItems((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  if (!gate.required) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm">
        <div className="flex items-center gap-2 text-green-700">
          <span>✓</span>
          <span>승인 불필요 — 위험도 {RISK_LABELS[riskLevel]} 작업</span>
        </div>
        {gate.checklist.length > 0 && (
          <p className="mt-1 text-xs text-green-600 opacity-80">{gate.reason}</p>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg border-2 border-orange-200 bg-orange-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-orange-900">승인 게이트</h3>
        <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
          위험도: {RISK_LABELS[riskLevel]}
        </span>
      </div>

      {/* Reason */}
      <p className="text-xs text-orange-800 mb-3">{gate.reason}</p>

      {/* Checklist */}
      {gate.checklist.length > 0 && (
        <div className="mb-3">
          <p className="text-xs font-medium text-orange-900 mb-2">확인 체크리스트</p>
          <div className="space-y-1.5">
            {gate.checklist.map((item, i) => (
              <label key={i} className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checkedItems[i]}
                  onChange={() => toggleItem(i)}
                  className="mt-0.5 h-3.5 w-3.5 rounded border-orange-300 accent-orange-500"
                />
                <span className="text-xs text-orange-800">{item}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Stop Conditions */}
      {gate.stopConditions.length > 0 && (
        <div className="mb-3 p-2 bg-red-50 rounded border border-red-200">
          <p className="text-xs font-medium text-red-700 mb-1">중단 조건</p>
          {gate.stopConditions.map((c, i) => (
            <p key={i} className="text-xs text-red-600">• {c}</p>
          ))}
        </div>
      )}

      {/* Review After */}
      {gate.reviewAfterCompletion && (
        <div className="mb-3 text-xs text-orange-700 flex items-center gap-1">
          <span>⚠️</span>
          <span>완료 후 diff 검토 필요</span>
        </div>
      )}

      {/* Approve Button */}
      {onApprove && (
        <button
          onClick={() => onApprove(checkedItems)}
          disabled={!allChecked}
          className={`w-full py-2 text-xs font-medium rounded transition-colors ${
            allChecked
              ? "bg-orange-500 text-white hover:bg-orange-600"
              : "bg-orange-100 text-orange-400 cursor-not-allowed"
          }`}
        >
          {allChecked ? "모두 확인 완료 — 승인" : `${checkedItems.filter(Boolean).length}/${gate.checklist.length} 항목 확인 중`}
        </button>
      )}
    </div>
  );
}
