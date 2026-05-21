import React from "react";
import { RoadmapStage, RoadmapStageCard } from "./RoadmapStageCard";
import { CheckCircle2 } from "lucide-react";

interface RoadmapTimelineProps {
  stages: RoadmapStage[];
  className?: string;
}

export function RoadmapTimeline({
  stages,
  className = "",
}: RoadmapTimelineProps) {
  if (!stages || stages.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500 border border-dashed rounded-xl border-gray-200 dark:border-gray-800">
        표시할 로드맵 단계가 없습니다.
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {/* Vertical connector line */}
      <div className="absolute left-4 sm:left-[1.875rem] top-8 bottom-8 w-0.5 bg-gradient-to-b from-green-200 via-gray-200 to-gray-100 dark:from-green-900 dark:via-gray-800 dark:to-gray-900 hidden sm:block" />

      <div className="space-y-5 sm:space-y-6">
        {stages.map((stage, index) => {
          const isCompleted = stage.status === "completed";
          const isActive = stage.status === "active";
          const isBlocked = stage.status === "blocked";
          const needsUserInput = stage.status === "user_input_required";

          return (
            <div
              key={stage.id}
              className="relative flex flex-col sm:flex-row gap-4 sm:gap-5"
            >
              {/* ── Timeline marker (desktop) ── */}
              <div className="hidden sm:flex shrink-0 w-[3.75rem] flex-col items-center pt-5">
                <div className="relative">
                  {/* Outer pulse ring for active/blocked/user-input */}
                  {(isActive || isBlocked || needsUserInput) && (
                    <span
                      className={`absolute inset-0 -m-1.5 rounded-full animate-ping opacity-30 ${
                        isBlocked
                          ? "bg-red-400"
                          : needsUserInput
                            ? "bg-amber-400"
                            : "bg-blue-400"
                      }`}
                    />
                  )}

                  {/* Marker dot */}
                  <div
                    className={`
                      relative w-5 h-5 rounded-full z-10 border-2 flex items-center justify-center
                      ${isCompleted ? "bg-green-500 border-green-400 dark:border-green-700" : ""}
                      ${isActive && !isBlocked && !needsUserInput ? "bg-blue-500 border-blue-300 dark:border-blue-700" : ""}
                      ${isBlocked ? "bg-red-500 border-red-300 dark:border-red-700" : ""}
                      ${needsUserInput ? "bg-amber-500 border-amber-300 dark:border-amber-700" : ""}
                      ${!isCompleted && !isActive && !isBlocked && !needsUserInput ? "bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700" : ""}
                    `}
                  >
                    {isCompleted && (
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    )}
                    {!isCompleted && (
                      <span
                        className={`text-[8px] font-bold leading-none ${
                          isActive || isBlocked || needsUserInput
                            ? "text-white"
                            : "text-gray-400 dark:text-gray-600"
                        }`}
                      >
                        {index + 1}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* ── Mobile phase label ── */}
              <div className="sm:hidden flex items-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">
                <span
                  className={`flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${
                    isCompleted
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : isActive
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                        : isBlocked
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : needsUserInput
                            ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500"
                  }`}
                >
                  {index + 1}
                </span>
                <span>단계 {index + 1}</span>
              </div>

              {/* ── Stage card ── */}
              <div className="flex-1 w-full max-w-4xl">
                <RoadmapStageCard stage={stage} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
