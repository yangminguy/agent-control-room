import type { Metadata } from "next";
import { getFeaturePlans } from "@/lib/storage/feature-plan-store";
import { getProjects } from "@/lib/storage/json-store";
import { KanbanBoard } from "@/components/plan/KanbanBoard";
import {
  LayoutDashboard,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import type { PlanTaskStatus } from "@/lib/types";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Implementation Plan — Agent Control Room",
  description: "Feature plan and kanban board view for AI agent task execution tracking.",
};

// 서버 컴포넌트: 매 요청마다 최신 데이터 읽기
export const dynamic = "force-dynamic";

function PlanSummaryBar({
  tasks,
}: {
  tasks: { status: PlanTaskStatus }[];
}) {
  const total = tasks.length;
  const done = tasks.filter((t) => t.status === "done").length;
  const running = tasks.filter((t) => t.status === "running").length;
  const blocked = tasks.filter((t) => t.status === "blocked").length;
  const ready = tasks.filter((t) => t.status === "ready").length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="rounded-xl border bg-white p-4 flex flex-wrap gap-6 items-center">
      {/* 진행률 바 */}
      <div className="flex-1 min-w-40">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>전체 진행률</span>
          <span className="font-semibold text-gray-700">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* 통계 */}
      <div className="flex gap-4 flex-wrap text-xs">
        <span className="flex items-center gap-1 text-emerald-600">
          <CheckCircle2 className="w-3.5 h-3.5" />
          Done {done}/{total}
        </span>
        {running > 0 && (
          <span className="flex items-center gap-1 text-amber-600">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Running {running}
          </span>
        )}
        {ready > 0 && (
          <span className="flex items-center gap-1 text-pink-primary">
            <Clock className="w-3.5 h-3.5" />
            Ready {ready}
          </span>
        )}
        {blocked > 0 && (
          <span className="flex items-center gap-1 text-red-600">
            <AlertTriangle className="w-3.5 h-3.5" />
            Blocked {blocked}
          </span>
        )}
      </div>
    </div>
  );
}

export default async function PlanPage() {
  const [plans, projects] = await Promise.all([getFeaturePlans(), getProjects()]);
  const projectPathById = new Map(
    projects.map((project) => [project.id, project.path]),
  );

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* 헤더 */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
              Dashboard
            </Link>
            <span className="text-gray-300">/</span>
            <span className="text-xs text-gray-600">Plan</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <LayoutDashboard className="w-7 h-7 text-pink-primary" />
            Implementation Plan
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            Feature plan과 실행 태스크를 칸반 보드로 추적합니다.
          </p>
        </div>
      </div>

      {/* 플랜 없을 때 */}
      {plans.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">등록된 Feature Plan이 없습니다.</p>
          <p className="text-gray-300 text-sm mt-1">
            Direction Orchestrator에서 계획을 생성하면 여기에 표시됩니다.
          </p>
        </div>
      )}

      {/* 플랜 목록 */}
      {plans.map((plan) => (
        <section key={plan.id} className="space-y-4">
          {/* 플랜 헤더 */}
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{plan.title}</h2>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                  plan.status === "done"
                    ? "bg-emerald-50 text-emerald-600"
                    : plan.status === "running"
                      ? "bg-amber-50 text-amber-600"
                      : plan.status === "blocked"
                        ? "bg-red-50 text-red-600"
                        : "bg-gray-100 text-gray-500"
                }`}
              >
                {plan.status}
              </span>
            </div>
            {plan.userGoal && (
              <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                {plan.userGoal}
              </p>
            )}
          </div>

          {/* 진행률 요약 바 */}
          <PlanSummaryBar tasks={plan.tasks} />

          {/* 칸반 보드 */}
          <KanbanBoard
            plan={plan}
            projectPath={projectPathById.get(plan.projectId) ?? ""}
          />
        </section>
      ))}
    </div>
  );
}
