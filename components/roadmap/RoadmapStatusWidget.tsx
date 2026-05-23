"use client";

import React from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Loader2, MapPin } from "lucide-react";
import type { Roadmap, RoadmapStage } from "@/lib/types";

interface CurrentExecution {
  taskId: string;
  agent: string;
  startedAt: string;
}

interface RoadmapStatusWidgetProps {
  roadmap: Roadmap;
  currentExecution?: CurrentExecution;
}

function formatStartedAt(iso: string): string {
  try {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const min = String(d.getMinutes()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  } catch {
    return iso;
  }
}

function friendlyAgent(agentId: string): string {
  const n = agentId.toLowerCase();
  if (n.includes("claude")) return "Claude Code";
  if (n.includes("codex")) return "Codex";
  if (n.includes("antigravity")) return "Antigravity";
  if (n.includes("hermes")) return "Hermes";
  if (n.includes("vibe") || n.includes("kanban")) return "Vibe Kanban";
  if (n.includes("manual") || n.includes("user")) return "사용자 직접";
  return agentId;
}

function getStatusColor(status: RoadmapStage["status"]): string {
  switch (status) {
    case "completed":
      return "text-emerald-600 dark:text-emerald-400";
    case "active":
      return "text-blue-600 dark:text-blue-400";
    case "blocked":
      return "text-red-600 dark:text-red-400";
    case "user_input_required":
      return "text-amber-600 dark:text-amber-400";
    default:
      return "text-gray-500 dark:text-gray-400";
  }
}

function getStatusLabel(status: RoadmapStage["status"]): string {
  switch (status) {
    case "completed":
      return "완료";
    case "active":
      return "활성";
    case "blocked":
      return "차단됨";
    case "waiting":
      return "대기";
    case "user_input_required":
      return "확인 필요";
    case "failed":
      return "실패";
    case "handoff_needed":
      return "핸드오프 필요";
    default:
      return status;
  }
}

export default function RoadmapStatusWidget({
  roadmap,
  currentExecution,
}: RoadmapStatusWidgetProps) {
  const stages = roadmap.stages;

  // Find the active phase (priority: user_input_required > blocked > active)
  const activeStage =
    stages.find((s) => s.status === "user_input_required") ??
    stages.find((s) => s.status === "blocked") ??
    stages.find((s) => s.status === "active");

  // Overall progress
  const totalTasks = stages.reduce((sum, s) => sum + (s.tasks?.length ?? 0), 0);
  const completedTasks = stages.reduce((sum, s) => {
    const tasks = s.tasks ?? [];
    return sum + tasks.filter((t) => t.status === "done").length;
  }, 0);
  const pct =
    roadmap.overallProgress ??
    (totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0);

  // Next 3 recommended actions from active stage tasks, or next waiting stage
  const nextActions: Array<{ label: string; done: boolean }> = [];
  if (activeStage) {
    const stageTasks = activeStage.tasks ?? [];
    stageTasks.slice(0, 3).forEach((t) => {
      nextActions.push({ label: t.title, done: t.status === "done" });
    });
  }
  // Pad with next waiting stage if fewer than 3
  if (nextActions.length < 3) {
    const nextWaiting = stages.find((s) => s.status === "waiting");
    if (nextWaiting && nextActions.length < 3) {
      nextActions.push({ label: nextWaiting.title, done: false });
    }
  }

  // Find current task title within active stage
  let currentTaskTitle: string | undefined;
  if (activeStage?.currentTaskId) {
    const found = (activeStage.tasks ?? []).find(
      (t) => t.id === activeStage.currentTaskId,
    );
    if (found) currentTaskTitle = found.title;
  }
  if (!currentTaskTitle && currentExecution) {
    // Fallback: search all stages for the task
    for (const s of stages) {
      const found = (s.tasks ?? []).find(
        (t) => t.id === currentExecution.taskId,
      );
      if (found) {
        currentTaskTitle = found.title;
        break;
      }
    }
  }

  const agentLabel = activeStage?.responsibleAgent
    ? friendlyAgent(activeStage.responsibleAgent)
    : currentExecution?.agent
      ? friendlyAgent(currentExecution.agent)
      : null;

  const statusColor = activeStage ? getStatusColor(activeStage.status) : "text-gray-500";
  const statusLabel = activeStage ? getStatusLabel(activeStage.status) : null;

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-950/40">
        <MapPin className="w-4 h-4 text-pink-500 shrink-0" />
        <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
          현재 상태
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Active phase */}
        {activeStage ? (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-base font-bold ${statusColor}`}>
              {activeStage.status === "active" && (
                <Loader2 className="inline w-4 h-4 mr-1.5 animate-spin align-[-2px]" />
              )}
              {activeStage.status === "completed" && (
                <CheckCircle2 className="inline w-4 h-4 mr-1.5 align-[-2px] text-emerald-500" />
              )}
              단계 {activeStage.number} {statusLabel} — {activeStage.title}
            </span>
          </div>
        ) : (
          <p className="text-sm text-gray-400">활성화된 단계 없음</p>
        )}

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs mb-1.5 text-gray-500 dark:text-gray-400">
            <span>진행률</span>
            <span className="font-bold text-gray-700 dark:text-gray-200">
              {pct}%
            </span>
          </div>
          <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-400 to-blue-500 rounded-full transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        {/* Execution info */}
        {(currentTaskTitle || agentLabel || currentExecution) && (
          <div className="rounded-lg bg-gray-50 dark:bg-gray-950/50 border border-gray-100 dark:border-gray-800 p-3.5 space-y-1.5 text-sm">
            {currentTaskTitle && (
              <div className="flex gap-2">
                <span className="text-gray-400 shrink-0 w-20 text-xs font-semibold uppercase tracking-wide pt-0.5">
                  현재 작업
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {currentTaskTitle}
                </span>
              </div>
            )}
            {agentLabel && (
              <div className="flex gap-2">
                <span className="text-gray-400 shrink-0 w-20 text-xs font-semibold uppercase tracking-wide pt-0.5">
                  에이전트
                </span>
                <span className="text-gray-700 dark:text-gray-300 font-medium">
                  {agentLabel}
                </span>
              </div>
            )}
            {currentExecution?.startedAt && (
              <div className="flex gap-2">
                <span className="text-gray-400 shrink-0 w-20 text-xs font-semibold uppercase tracking-wide pt-0.5">
                  시작
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {formatStartedAt(currentExecution.startedAt)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Next recommended actions */}
        {nextActions.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              다음 권장 행동
            </p>
            <ul className="space-y-1.5">
              {nextActions.map((action, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  {action.done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <ArrowRight className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={
                      action.done
                        ? "line-through text-gray-400 dark:text-gray-600"
                        : "text-gray-700 dark:text-gray-300"
                    }
                  >
                    {action.label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link to full roadmap */}
        <div className="pt-1">
          <Link
            href="/plan"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-500 hover:text-pink-600 transition-colors"
          >
            전체 로드맵 보기
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
