"use client";

import { useState } from "react";
import type { FeaturePlan, PlanTask, PlanTaskStatus } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";

const COLUMNS: { key: PlanTaskStatus; label: string; color: string }[] = [
  { key: "planned", label: "계획됨", color: "bg-surface-2 text-text-secondary" },
  { key: "ready", label: "준비됨", color: "bg-pink-primary/10 text-pink-primary" },
  { key: "running", label: "실행중", color: "bg-sky-500/10 text-sky-400" },
  { key: "needs_review", label: "검토필요", color: "bg-purple-500/10 text-purple-400" },
  { key: "done", label: "완료", color: "bg-emerald-500/10 text-emerald-400" },
  { key: "partial", label: "부분완료", color: "bg-amber-500/10 text-amber-400" },
  { key: "blocked", label: "블로킹됨", color: "bg-red-500/10 text-red-400" },
];

interface KanbanBoardProps {
  plan: FeaturePlan;
  projectPath: string;
}

export function KanbanBoard({ plan, projectPath }: KanbanBoardProps) {
  const [tasks, setTasks] = useState<PlanTask[]>(plan.tasks);

  const handleStatusChange = (taskId: string, newStatus: PlanTaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId ? { ...t, status: newStatus, updatedAt: new Date().toISOString() } : t,
      ),
    );
  };

  const handleTaskUpdate = (updatedTask: PlanTask) => {
    setTasks((prev) =>
      prev.map((task) => (task.id === updatedTask.id ? updatedTask : task)),
    );
  };

  const tasksByStatus = (status: PlanTaskStatus) =>
    tasks.filter((t) => t.status === status);

  const nonEmptyColumns = COLUMNS.filter(
    (col) => tasksByStatus(col.key).length > 0,
  );
  const emptyColumns = COLUMNS.filter(
    (col) => tasksByStatus(col.key).length === 0,
  );

  return (
    <div className="space-y-4">
      {/* 진행률 플로우 (ProgressFlow) */}
      <div className="bg-surface-2 rounded-xl border border-border p-4 mb-2 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center flex-wrap gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5"><span className="text-lg leading-none">🟤</span><span className="text-text-secondary font-medium text-xs">계획됨 <span className="text-text-primary">{tasksByStatus('planned').length}</span></span></div>
            <span className="text-border">→</span>
            <div className="flex items-center gap-1.5"><span className="text-lg leading-none">🟡</span><span className="text-text-secondary font-medium text-xs">준비됨 <span className="text-text-primary">{tasksByStatus('ready').length}</span></span></div>
            <span className="text-border">→</span>
            <div className="flex items-center gap-1.5"><span className="text-lg leading-none">🔵</span><span className="text-text-secondary font-medium text-xs">실행중 <span className="text-text-primary">{tasksByStatus('running').length}</span></span></div>
            <span className="text-border">→</span>
            <div className="flex items-center gap-1.5"><span className="text-lg leading-none">✅</span><span className="text-text-secondary font-medium text-xs">완료 <span className="text-text-primary">{tasksByStatus('done').length}</span></span></div>
          </div>
          <div className="text-xs font-semibold text-text-primary bg-surface px-2.5 py-1 rounded-full border border-border">
            전체 진행률: {tasks.length > 0 ? Math.round((tasksByStatus('done').length / tasks.length) * 100) : 0}%
          </div>
        </div>
        <div className="h-2 w-full bg-surface rounded-full overflow-hidden flex">
          <div className="bg-gray-500/50 transition-all" style={{ width: `${tasks.length ? (tasksByStatus('planned').length / tasks.length) * 100 : 0}%` }} />
          <div className="bg-pink-primary/70 transition-all" style={{ width: `${tasks.length ? (tasksByStatus('ready').length / tasks.length) * 100 : 0}%` }} />
          <div className="bg-sky-400 transition-all" style={{ width: `${tasks.length ? (tasksByStatus('running').length / tasks.length) * 100 : 0}%` }} />
          <div className="bg-emerald-400 transition-all" style={{ width: `${tasks.length ? (tasksByStatus('done').length / tasks.length) * 100 : 0}%` }} />
        </div>
      </div>

      {/* 칸반 보드 — 태스크가 있는 컬럼만 풀 표시, 나머지는 헤더만 */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {/* 활성 컬럼 */}
        {nonEmptyColumns.map((col) => (
          <div key={col.key} className="flex-shrink-0 w-72">
            <div
              className={`text-xs font-semibold px-3 py-1.5 rounded-full mb-3 inline-flex items-center gap-1 ${col.color}`}
            >
              {col.label}
              <span className="ml-1 bg-white/60 rounded-full px-1.5">
                {tasksByStatus(col.key).length}
              </span>
            </div>
            <div className="space-y-3">
              {tasksByStatus(col.key).map((task) => (
                <KanbanCard
                  key={task.id}
                  task={task}
                  planId={plan.id}
                  projectPath={projectPath}
                  onStatusChange={handleStatusChange}
                  onTaskUpdate={handleTaskUpdate}
                />
              ))}
            </div>
          </div>
        ))}

        {/* 빈 컬럼 — 작게 표시 */}
        {emptyColumns.length > 0 && (
          <div className="flex-shrink-0 flex flex-col gap-2 justify-start pt-0.5">
            {emptyColumns.map((col) => (
              <div
                key={col.key}
                className="text-xs font-medium px-3 py-1.5 rounded-full text-gray-300 bg-gray-50 border border-dashed border-gray-200"
              >
                {col.label} · 0
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
