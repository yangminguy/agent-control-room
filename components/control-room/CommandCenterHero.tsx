import React from "react";
import { Play, Activity, CheckCircle, Radio } from "lucide-react";

interface CommandCenterHeroProps {
  planTitle: string;
  projectName: string;
  productVision?: string;
  overallProgress: number;
  activePhaseNumber?: number;
  activePhaseTitle?: string;
  latestRunStatus?: string;
  latestRunMessage?: string;
}

export function CommandCenterHero({
  planTitle,
  projectName,
  productVision,
  overallProgress,
  activePhaseNumber,
  activePhaseTitle,
  latestRunStatus = "idle",
  latestRunMessage,
}: CommandCenterHeroProps) {
  // Determine execution indicator status
  const isRunning = latestRunStatus === "running";
  const isBlocked = latestRunStatus === "blocked";
  const isCompleted = latestRunStatus === "completed";

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-surface p-6 sm:p-8 animate-fade-in shadow-xl">
      {/* Premium Radial Glow & Grid Overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.15),transparent_45%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6 z-10">
        <div className="space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-pink-primary/10 text-pink-primary border border-pink-primary/20">
              <Radio className="w-3.5 h-3.5 animate-status-ping" />
              Control Tower Active
            </span>
            {activePhaseNumber && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-2 text-text-secondary border border-border">
                Active: Phase {activePhaseNumber}
              </span>
            )}
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            {planTitle} <span className="text-text-secondary/40 font-medium">({projectName})</span>
          </h1>

          {productVision && (
            <p className="text-sm leading-relaxed text-text-secondary">
              {productVision}
            </p>
          )}

          {latestRunMessage && (
            <div className="mt-3 flex items-center gap-2 text-xs text-text-secondary/80 bg-surface-2/60 border border-border/50 px-3 py-2 rounded-lg max-w-lg">
              <div className={`w-2 h-2 rounded-full shrink-0 ${
                isRunning ? "bg-blue-400 animate-status-ping" :
                isBlocked ? "bg-red-400" :
                isCompleted ? "bg-emerald-400" : "bg-zinc-500"
              }`} />
              <span className="truncate">{latestRunMessage}</span>
            </div>
          )}
        </div>

        {/* Progress & Live status panel */}
        <div className="shrink-0 flex flex-col items-start md:items-end gap-3 min-w-[200px]">
          <div className="w-full flex items-center justify-between md:justify-end md:gap-4 text-sm font-semibold">
            <span className="text-text-secondary">Overall Progress</span>
            <span className="text-xl font-bold text-pink-primary">{overallProgress}%</span>
          </div>

          <div className="w-full h-2.5 overflow-hidden rounded-full bg-surface-2 border border-border/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pink-primary to-pink-soft transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>

          {activePhaseTitle && (
            <p className="text-xs text-text-secondary/70">
              Target: <span className="font-semibold text-text-primary">{activePhaseTitle}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
