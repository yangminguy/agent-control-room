import React from "react";
import { RoadmapStatusBadge, RoadmapStatus } from "./RoadmapStatusBadge";
import { AgentBadge } from "./AgentBadge";
import {
  AlertCircle,
  ArrowRight,
  CheckSquare,
  HelpCircle,
  CheckCircle2,
  Unlock,
  ListChecks,
} from "lucide-react";

export type RoadmapStage = {
  id: string;
  title: string;
  description?: string;
  status: RoadmapStatus;
  assignedAgent?: string;
  currentTask?: string;
  nextAction?: string;
  blockerReason?: string;
  /** 차단 해제를 위한 구체적인 행동 */
  blockerUnlockAction?: string;
  /** 차단됨 상태에서 누가 액션해야 하는지 */
  blockerResponsible?: string;
  userQuestion?: string;
  /** 사용자 결정 옵션들 */
  userDecisionOptions?: string[];
  acceptanceCriteria?: string[];
  /** Phase 번호 (1, 2, 3...) */
  phaseNumber?: number;
};

interface RoadmapStageCardProps {
  stage: RoadmapStage;
  className?: string;
}

export function RoadmapStageCard({
  stage,
  className = "",
}: RoadmapStageCardProps) {
  const isActive = stage.status === "active";
  const isCompleted = stage.status === "completed";
  const isBlocked = stage.status === "blocked";
  const needsUserInput = stage.status === "user_input_required";
  const isWaiting = stage.status === "waiting";

  return (
    <div
      className={`
        relative overflow-hidden rounded-xl border transition-all duration-200
        ${isActive && !isBlocked && !needsUserInput ? "bg-white dark:bg-gray-900 border-blue-400 dark:border-blue-500 shadow-lg ring-2 ring-blue-400/25 shadow-blue-500/10" : ""}
        ${isBlocked ? "bg-red-50/40 dark:bg-red-950/20 border-red-300 dark:border-red-800 shadow-sm ring-1 ring-red-400/20" : ""}
        ${needsUserInput ? "bg-amber-50/40 dark:bg-amber-950/20 border-amber-300 dark:border-amber-800 shadow-sm ring-1 ring-amber-400/20" : ""}
        ${isWaiting ? "bg-gray-50/60 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 shadow-sm opacity-80" : ""}
        ${isCompleted ? "bg-green-50/20 dark:bg-green-950/10 border-green-200 dark:border-green-900 opacity-70" : ""}
        ${!isActive && !isBlocked && !needsUserInput && !isWaiting && !isCompleted ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-sm" : ""}
        ${className}
      `}
    >
      {/* Left accent bar */}
      {isActive && !isBlocked && !needsUserInput && (
        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
      )}
      {isBlocked && (
        <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />
      )}
      {needsUserInput && (
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />
      )}
      {isCompleted && (
        <div className="absolute top-0 left-0 w-1 h-full bg-green-400" />
      )}

      <div className="p-5 flex flex-col gap-4">
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Phase label + title */}
            <div className="flex items-center gap-2 flex-wrap">
              {stage.phaseNumber != null && (
                <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400 dark:text-gray-500 shrink-0">
                  PHASE {stage.phaseNumber}
                </span>
              )}
            </div>
            <h3
              className={`text-base font-semibold tracking-tight mt-0.5 ${
                isActive && !isBlocked && !needsUserInput
                  ? "text-blue-700 dark:text-blue-400"
                  : isCompleted
                    ? "text-green-700 dark:text-green-500"
                    : isBlocked
                      ? "text-red-700 dark:text-red-400"
                      : needsUserInput
                        ? "text-amber-700 dark:text-amber-400"
                        : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {/* Completed checkmark inline with title */}
              {isCompleted && (
                <CheckCircle2 className="inline w-4 h-4 mr-1.5 text-green-500 dark:text-green-400 align-[-2px]" />
              )}
              {stage.title}
            </h3>
            {stage.description && (
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {stage.description}
              </p>
            )}
          </div>

          {/* Badges */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {stage.assignedAgent && (
              <AgentBadge agent={stage.assignedAgent} />
            )}
            <RoadmapStatusBadge status={stage.status} />
          </div>
        </div>

        {/* ── Blocked alert ── */}
        {isBlocked && stage.blockerReason && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-lg p-3.5 flex gap-3 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="space-y-2 text-red-800 dark:text-red-400">
              <p className="font-semibold">차단 이유</p>
              <p className="opacity-90">{stage.blockerReason}</p>
              {stage.blockerUnlockAction && (
                <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-red-200 dark:border-red-800/30">
                  <Unlock className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-red-500 dark:text-red-500 block mb-0.5">
                      해제 방법
                    </span>
                    <span>{stage.blockerUnlockAction}</span>
                  </div>
                </div>
              )}
              {stage.blockerResponsible && (
                <p className="text-xs mt-1 opacity-70">
                  담당:{" "}
                  <span className="font-semibold">
                    {stage.blockerResponsible}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── User input needed ── */}
        {needsUserInput && stage.userQuestion && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3.5 flex gap-3 text-sm">
            <HelpCircle className="w-5 h-5 shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-2 text-amber-800 dark:text-amber-400 w-full">
              <p className="font-semibold">사용자 확인 필요</p>
              <p className="opacity-90 leading-relaxed">{stage.userQuestion}</p>
              {stage.userDecisionOptions &&
                stage.userDecisionOptions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-200 dark:border-amber-800/30">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-500 mb-1.5">
                      선택 가능한 옵션
                    </p>
                    <ol className="space-y-1">
                      {stage.userDecisionOptions.map((opt, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-sm text-amber-700 dark:text-amber-400"
                        >
                          <span className="font-bold shrink-0">{i + 1}.</span>
                          <span>{opt}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ── Current task & next action (active/waiting/etc.) ── */}
        {(stage.currentTask || stage.nextAction) && (
          <div className="bg-gray-50 dark:bg-gray-950/50 rounded-lg p-3.5 space-y-3 border border-gray-100 dark:border-gray-800">
            {stage.currentTask && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 shrink-0 w-5 flex justify-center text-gray-400">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400 block text-xs font-semibold mb-0.5 uppercase tracking-wider">
                    현재 작업
                  </span>
                  <span className="text-gray-800 dark:text-gray-200">
                    {stage.currentTask}
                  </span>
                </div>
              </div>
            )}

            {stage.nextAction && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 shrink-0 w-5 flex justify-center text-blue-500">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <div className="text-sm">
                  <span className="text-gray-500 dark:text-gray-400 block text-xs font-semibold mb-0.5 uppercase tracking-wider">
                    다음 행동
                  </span>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">
                    {stage.nextAction}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Acceptance criteria ── */}
        {stage.acceptanceCriteria && stage.acceptanceCriteria.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <ListChecks className="w-3.5 h-3.5 text-gray-400" />
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                완료 기준
              </p>
            </div>
            <ul className="space-y-1.5">
              {stage.acceptanceCriteria.map((criteria, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                      isCompleted
                        ? "bg-green-400"
                        : "bg-gray-300 dark:bg-gray-600"
                    }`}
                  />
                  <span
                    className={isCompleted ? "line-through opacity-60" : ""}
                  >
                    {criteria}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
