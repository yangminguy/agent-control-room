"use client";

import { useState } from "react";
import { AlertTriangle, Info } from "lucide-react";
import type {
  SchedulingMode,
  SchedulingModeDecision,
} from "@/lib/orchestration/scheduling-mode-selector";
import { getSchedulingModeDescription } from "@/lib/orchestration/scheduling-mode-selector";

interface SchedulingModePanelProps {
  taskId: string;
  taskTitle: string;
  decision: SchedulingModeDecision;
  onModeChange?: (mode: SchedulingMode) => void;
}

const ALL_MODES: SchedulingMode[] = ["single", "sequential", "parallel", "token_relay"];

const MODE_BADGE_COLORS: Record<SchedulingMode, string> = {
  single: "bg-red-100 text-red-700 border border-red-200",
  sequential: "bg-amber-100 text-amber-700 border border-amber-200",
  parallel: "bg-emerald-100 text-emerald-700 border border-emerald-200",
  token_relay: "bg-blue-100 text-blue-700 border border-blue-200",
};

const MODE_RADIO_BORDER: Record<SchedulingMode, string> = {
  single: "border-red-300",
  sequential: "border-amber-300",
  parallel: "border-emerald-300",
  token_relay: "border-blue-300",
};

export function SchedulingModePanel({
  taskId,
  taskTitle,
  decision,
  onModeChange,
}: SchedulingModePanelProps) {
  const [selectedMode, setSelectedMode] = useState<SchedulingMode>(decision.mode);

  function handleModeSelect(mode: SchedulingMode) {
    setSelectedMode(mode);
    onModeChange?.(mode);
  }

  const hasConflictWarnings =
    decision.conflictWarnings && decision.conflictWarnings.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-gray-200 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">스케줄링 모드 선택</h2>
        <p className="mt-0.5 text-sm text-gray-500 truncate" title={taskTitle}>
          {taskTitle}
        </p>
      </div>

      {/* Recommended mode + reason */}
      <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-gray-600 font-medium">권장 모드:</span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${MODE_BADGE_COLORS[decision.mode]}`}
          >
            {getSchedulingModeDescription(decision.mode).label}
          </span>
        </div>
        <div className="mt-2 flex items-start gap-2 text-sm text-gray-600">
          <Info size={14} className="mt-0.5 shrink-0 text-gray-400" />
          <span>{decision.reason}</span>
        </div>
      </div>

      {/* Mode radio list */}
      <div className="px-5 py-4 space-y-3">
        {ALL_MODES.map((mode) => {
          const desc = getSchedulingModeDescription(mode);
          const isRecommended = mode === decision.mode;
          const isSelected = mode === selectedMode;

          return (
            <label
              key={mode}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 transition-colors ${
                isSelected
                  ? `${MODE_RADIO_BORDER[mode]} bg-gray-50`
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <input
                type="radio"
                name={`scheduling-mode-${taskId}`}
                value={mode}
                checked={isSelected}
                onChange={() => handleModeSelect(mode)}
                className="mt-0.5 h-4 w-4 shrink-0 accent-gray-700"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">
                    {desc.label}
                  </span>
                  {isRecommended && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                      권장
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-gray-500">{desc.pmDescription}</p>
              </div>
            </label>
          );
        })}
      </div>

      {/* Conflict warnings */}
      {hasConflictWarnings && (
        <div className="px-5 pb-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle size={14} className="text-amber-600 shrink-0" />
              <span className="text-xs font-semibold text-amber-700">
                파일 충돌 경고
              </span>
            </div>
            <ul className="space-y-1">
              {decision.conflictWarnings!.map((warning, i) => (
                <li key={i} className="text-xs text-amber-700 leading-snug">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Footer actions */}
      <div className="flex justify-end gap-2 border-t border-gray-200 px-5 py-4">
        <button
          type="button"
          className="rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          onClick={() => setSelectedMode(decision.mode)}
        >
          취소
        </button>
        <button
          type="button"
          className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 transition-colors"
          onClick={() => onModeChange?.(selectedMode)}
        >
          승인
        </button>
      </div>
    </div>
  );
}
