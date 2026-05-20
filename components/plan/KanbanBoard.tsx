"use client";

import { useState } from "react";
import type { FeaturePlan, PlanTask, PlanTaskStatus } from "@/lib/types";
import { KanbanCard } from "./KanbanCard";

const COLUMNS: { key: PlanTaskStatus; label: string; color: string }[] = [
  { key: "planned", label: "Backlog", color: "bg-gray-100 text-gray-600" },
  { key: "ready", label: "Ready", color: "bg-blue-100 text-blue-700" },
  { key: "running", label: "Running", color: "bg-amber-100 text-amber-700" },
  { key: "needs_review", label: "Review", color: "bg-purple-100 text-purple-700" },
  { key: "done", label: "Done", color: "bg-emerald-100 text-emerald-700" },
  { key: "partial", label: "Partial", color: "bg-orange-100 text-orange-700" },
  { key: "blocked", label: "Blocked", color: "bg-red-100 text-red-700" },
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
      {/* 통계 요약 */}
      <div className="flex flex-wrap gap-2">
        {COLUMNS.map((col) => {
          const count = tasksByStatus(col.key).length;
          if (count === 0) return null;
          return (
            <span
              key={col.key}
              className={`text-xs font-medium px-2.5 py-1 rounded-full ${col.color}`}
            >
              {col.label}: {count}
            </span>
          );
        })}
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
