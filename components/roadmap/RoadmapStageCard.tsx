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
  const isBlocked = stage.status === "blocked" || stage.status === "failed";
  const needsUserInput = stage.status === "user_input_required" || stage.status === "handoff_needed";
  const isWaiting = stage.status === "waiting";

  // Hierarchy styling matching:
  // Active: full border and breathing glow
  // Blocked: red border with breathing red glow
  // User Input Needed: amber border with breathing amber glow
  // Completed: compact, slightly faded, opacity 70% dark surface
  // Waiting: muted, opacity 40% dark surface
  let cardStyle = "border-border bg-surface";
  if (isActive && !isBlocked && !needsUserInput) {
    cardStyle = "border-pink-primary/40 bg-surface animate-breathing-pink shadow-lg shadow-pink-primary/5";
  } else if (isBlocked) {
    cardStyle = "border-red-500/20 bg-surface animate-breathing-red shadow-sm";
  } else if (needsUserInput) {
    cardStyle = "border-amber-500/20 bg-surface animate-breathing-amber shadow-sm";
  } else if (isWaiting) {
    cardStyle = "border-border/40 bg-surface/30 opacity-40 shadow-sm cursor-not-allowed";
  } else if (isCompleted) {
    cardStyle = "border-emerald-500/10 bg-surface/50 opacity-70 shadow-sm";
  }

  // Left accent bar
  const renderAccentBar = () => {
    if (isActive && !isBlocked && !needsUserInput) {
      return <div className="absolute top-0 left-0 w-1 h-full bg-pink-primary" />;
    }
    if (isBlocked) {
      return <div className="absolute top-0 left-0 w-1 h-full bg-red-500" />;
    }
    if (needsUserInput) {
      return <div className="absolute top-0 left-0 w-1 h-full bg-amber-500" />;
    }
    if (isCompleted) {
      return <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/50" />;
    }
    return null;
  };

  return (
    <div
      id={`phase-${stage.id}`}
      className={`
        relative overflow-hidden rounded-xl border transition-all duration-300
        ${cardStyle}
        ${className}
      `}
    >
      {renderAccentBar()}

      {/* Adjust padding based on status compactness */}
      <div className={`flex flex-col gap-3 ${isCompleted ? "p-3.5 sm:p-4" : "p-5"}`}>
        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Phase label + title */}
            <div className="flex items-center gap-2 flex-wrap">
              {stage.phaseNumber != null && (
                <span className="text-[9px] font-bold tracking-widest uppercase text-text-secondary/50 shrink-0">
                  PHASE {stage.phaseNumber}
                </span>
              )}
            </div>
            <h3
              className={`text-base font-bold tracking-tight mt-0.5 ${
                isActive && !isBlocked && !needsUserInput
                  ? "text-pink-primary"
                  : isCompleted
                    ? "text-emerald-700"
                    : isBlocked
                      ? "text-red-700"
                      : needsUserInput
                        ? "text-amber-700"
                        : "text-text-primary"
              }`}
            >
              {isCompleted && (
                <CheckCircle2 className="inline w-4 h-4 mr-1.5 text-emerald-600 align-[-2px]" />
              )}
              {stage.title}
            </h3>
            
            {/* Render description if not completed (completed is compact) */}
            {stage.description && !isCompleted && (
              <p className="mt-1 text-xs sm:text-sm text-text-secondary leading-relaxed">
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
          <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-3 flex gap-3 text-xs">
            <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-red-600" />
            <div className="space-y-1 text-red-700">
              <p className="font-semibold">차단 이유</p>
              <p className="opacity-90 leading-relaxed">{stage.blockerReason}</p>
              {stage.blockerUnlockAction && (
                <div className="flex items-start gap-1.5 mt-2 pt-2 border-t border-red-500/10">
                  <Unlock className="w-3.5 h-3.5 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-red-600 block mb-0.5">
                      해제 방법
                    </span>
                    <span>{stage.blockerUnlockAction}</span>
                  </div>
                </div>
              )}
              {stage.blockerResponsible && (
                <p className="text-[10px] mt-1 opacity-70">
                  담당: <span className="font-semibold">{stage.blockerResponsible}</span>
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── User input needed ── */}
        {needsUserInput && stage.userQuestion && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 flex gap-3 text-xs">
            <HelpCircle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600" />
            <div className="space-y-1.5 text-amber-700 w-full">
              <p className="font-semibold">사용자 확인 필요</p>
              <p className="opacity-90 leading-relaxed">{stage.userQuestion}</p>
              {stage.userDecisionOptions &&
                stage.userDecisionOptions.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-amber-500/10">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-1">
                      선택 가능한 옵션 (상단 Your Next Move에서 입력 가능)
                    </p>
                    <ol className="space-y-0.5">
                      {stage.userDecisionOptions.map((opt, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-2 text-xs text-amber-700"
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
        {(stage.currentTask || stage.nextAction) && !isCompleted && (
          <div className="bg-surface-2/60 rounded-lg p-3 space-y-2 border border-border/60">
            {stage.currentTask && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 shrink-0 w-4 flex justify-center text-text-secondary">
                  <CheckSquare className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="text-text-secondary block text-[10px] font-semibold mb-0.5 uppercase tracking-wider">
                    현재 작업
                  </span>
                  <span className="text-text-primary">
                    {stage.currentTask}
                  </span>
                </div>
              </div>
            )}

            {stage.nextAction && (
              <div className="flex gap-2.5">
                <div className="mt-0.5 shrink-0 w-4 flex justify-center text-pink-primary">
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs">
                  <span className="text-text-secondary block text-[10px] font-semibold mb-0.5 uppercase tracking-wider">
                    다음 행동
                  </span>
                  <span className="text-pink-soft font-semibold">
                    {stage.nextAction}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Acceptance criteria ── */}
        {stage.acceptanceCriteria && stage.acceptanceCriteria.length > 0 && !isCompleted && (
          <div className="mt-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <ListChecks className="w-3.5 h-3.5 text-text-secondary/60" />
              <p className="text-[10px] font-semibold text-text-secondary uppercase tracking-wider">
                완료 기준
              </p>
            </div>
            <ul className="space-y-1">
              {stage.acceptanceCriteria.map((criteria, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-xs text-text-secondary"
                >
                  <div
                    className={`w-1 h-1 rounded-full mt-1.5 shrink-0 bg-text-secondary/50`}
                  />
                  <span>
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
