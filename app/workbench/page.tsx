import type { Metadata } from "next";
import { getFeaturePlanById } from "@/lib/storage/feature-plan-store";
import { getProjects } from "@/lib/storage/json-store";
import { ExecutionReadinessGate } from "@/components/workbench/ExecutionReadinessGate";
import { AlertTriangle, ArrowLeft, Wrench } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "실행 워크벤치 — Agent Control Room",
  description: "승인 게이트를 통과한 후 에이전트를 실행합니다.",
};

export const dynamic = "force-dynamic";

/**
 * /workbench — Local Execution Approval Gate
 *
 * This page is where a user approves execution of a local tool
 * (Claude Code CLI, Codex, Antigravity, etc.)
 *
 * IMPORTANT: This is NOT a paid external AI API execution page.
 * It is a local terminal/IDE automation approval gate.
 *
 * The flow:
 * 1. User completes approval checklist
 * 2. System issues server-side approval token (5-min TTL, one-time use)
 * 3. User clicks "승인 후 에이전트 실행" (Approve & Execute)
 * 4. /api/runner spawns local tool (e.g. claude -p "...")
 * 5. Logs stream back to UI in real time
 * 6. Git diff analyzed automatically
 * 7. Next prompt suggested
 *
 * No external paid API calls are made in this flow.
 * The user must already be authenticated into the local tool.
 */

export default async function WorkbenchPage({
  searchParams,
}: {
  searchParams: Promise<{ planId?: string; taskId?: string }>;
}) {
  const { planId, taskId } = await searchParams;

  // No params provided
  if (!planId || !taskId) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <Wrench className="w-12 h-12 text-text-secondary mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">
          작업을 선택하세요
        </h2>
        <p className="text-text-secondary text-sm mb-6">
          실행할 작업을 실행 계획에서 선택한 후 이 페이지로 이동하세요.
        </p>
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-md bg-pink-primary px-4 py-2 text-sm font-semibold text-white hover:bg-pink-soft transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          실행 계획으로 돌아가기
        </Link>
      </div>
    );
  }

  // Load data
  const [plan, projects] = await Promise.all([
    getFeaturePlanById(planId),
    getProjects(),
  ]);

  // Task not found
  if (!plan) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">
          작업을 찾을 수 없습니다
        </h2>
        <p className="text-text-secondary text-sm mb-1">planId: {planId}</p>
        <p className="text-text-secondary text-sm mb-6">taskId: {taskId}</p>
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-md bg-pink-primary px-4 py-2 text-sm font-semibold text-white hover:bg-pink-soft transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          실행 계획으로 돌아가기
        </Link>
      </div>
    );
  }

  const task = plan.tasks.find((t) => t.id === taskId);

  // Task not found in plan
  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 text-center">
        <AlertTriangle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-text-primary mb-2">
          작업을 찾을 수 없습니다
        </h2>
        <p className="text-text-secondary text-sm mb-1">planId: {planId}</p>
        <p className="text-text-secondary text-sm mb-6">taskId: {taskId}</p>
        <Link
          href="/plan"
          className="inline-flex items-center gap-2 rounded-md bg-pink-primary px-4 py-2 text-sm font-semibold text-white hover:bg-pink-soft transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          실행 계획으로 돌아가기
        </Link>
      </div>
    );
  }

  // Compute project path
  const projectPathById = new Map(
    projects.map((project) => [project.id, project.path]),
  );
  const projectPath = projectPathById.get(plan.projectId) ?? "";

  // Main render
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-secondary">
        <Link href="/" className="hover:text-text-primary transition-colors">
          대시보드
        </Link>
        <span>/</span>
        <Link
          href="/plan"
          className="hover:text-text-primary transition-colors"
        >
          실행 계획
        </Link>
        <span>/</span>
        <span className="text-text-primary">실행 워크벤치</span>
      </nav>

      {/* Page heading */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-6 h-6 text-pink-primary" />
          <h1 className="text-2xl font-bold text-text-primary">실행 워크벤치</h1>
        </div>
        <p className="text-sm text-text-secondary">
          승인 게이트를 통과한 후 에이전트를 실행합니다.
        </p>
      </div>

      {/* Execution readiness gate */}
      <ExecutionReadinessGate
        task={task}
        planId={planId}
        projectPath={projectPath}
      />
    </div>
  );
}
