import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Circle,
  Clock,
  ExternalLink,
  RadioTower,
} from "lucide-react";
import { getLatestControlRoomPlan, getControlRoomRuns } from "@/lib/control-room/store";
import { getAllRoadmaps } from "@/lib/storage/roadmap-store";
import type { RoadmapStatus } from "@/lib/types";

export const metadata: Metadata = {
  title: "Phase Roadmap — Agent Control Room",
  description: "채팅에서 확정한 계획의 Phase 진행 상황을 추적합니다.",
};

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<RoadmapStatus, string> = {
  completed: "완료",
  active: "진행 중",
  waiting: "대기",
  blocked: "차단",
  user_input_required: "확인 필요",
  failed: "실패",
  handoff_needed: "핸드오프 필요",
};

function agentLabel(agent?: string): string {
  if (!agent) return "미정";
  if (agent === "claude-code") return "Claude Code";
  if (agent === "codex") return "Codex";
  if (agent === "antigravity") return "Antigravity";
  return agent;
}

function statusClass(status: RoadmapStatus): string {
  if (status === "completed") return "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";
  if (status === "active") return "border-blue-500/30 bg-blue-500/10 text-blue-200";
  if (status === "blocked" || status === "failed") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (status === "user_input_required" || status === "handoff_needed") return "border-amber-500/30 bg-amber-500/10 text-amber-200";
  return "border-border bg-surface text-text-secondary";
}

export default async function PlanPage() {
  const [latestPlan, runs, roadmaps] = await Promise.all([
    getLatestControlRoomPlan(),
    getControlRoomRuns(),
    getAllRoadmaps(),
  ]);
  const latestRun = runs[0] ?? null;
  const roadmap = roadmaps[0] ?? null;
  const phases = roadmap?.stages ?? latestPlan?.phases ?? [];
  const overallProgress =
    roadmap?.overallProgress ??
    (phases.length
      ? Math.round(
          phases.reduce((sum, phase) => sum + phase.completionPercentage, 0) /
            phases.length,
        )
      : 0);

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-primary">
            Phase Roadmap
          </p>
          <h1 className="mt-1 text-3xl font-bold text-text-primary">
            프로젝트 진행 상황
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">
            채팅에서 확정한 계획이 Phase 단위로 어디까지 진행됐는지만 보여줍니다. 세부 실행과 결과는 Vibe Kanban과 Hermes 패킷으로 추적합니다.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center gap-2 rounded-lg border border-pink-primary px-4 py-2 text-sm font-semibold text-pink-primary hover:bg-pink-primary/10"
        >
          채팅으로 돌아가기
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-2 p-5">
          <p className="text-sm text-text-secondary">전체 진행률</p>
          <p className="mt-2 text-4xl font-bold text-text-primary">{overallProgress}%</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-emerald-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-5">
          <p className="text-sm text-text-secondary">현재 계획</p>
          <p className="mt-2 text-lg font-semibold text-text-primary">
            {latestPlan?.title ?? roadmap?.title ?? "아직 확정된 계획 없음"}
          </p>
          <p className="mt-2 text-xs leading-5 text-text-tertiary">
            {latestPlan?.finalPlanReady
              ? "실행 버튼으로 시작 가능한 상태입니다."
              : "채팅에서 계획을 더 확정해야 합니다."}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface-2 p-5">
          <div className="flex items-center gap-2">
            <RadioTower className="h-4 w-4 text-pink-primary" />
            <p className="text-sm text-text-secondary">Hermes / 실행 상태</p>
          </div>
          <p className="mt-2 text-lg font-semibold text-text-primary">
            {latestRun ? latestRun.status : "대기 중"}
          </p>
          <p className="mt-2 text-xs leading-5 text-text-tertiary">
            {latestRun
              ? latestRun.message
              : "실제 실행 시작 버튼을 누르기 전까지 Hermes와 agent runner는 시작되지 않습니다."}
          </p>
        </div>
      </section>

      <section className="space-y-3">
        {phases.map((phase) => {
          const status = phase.status as RoadmapStatus;
          const phaseWithVibe = phase as {
            vibeIssueId?: string;
            vibeWorkspaceUrl?: string;
          };
          const vibeIssue = phaseWithVibe.vibeIssueId;
          const vibeWorkspace = phaseWithVibe.vibeWorkspaceUrl;
          return (
            <article
              key={phase.id}
              className="rounded-xl border border-border bg-surface-2 p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex gap-4">
                  <div className="pt-1">
                    {status === "completed" ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                    ) : status === "active" ? (
                      <Clock className="h-6 w-6 text-blue-300" />
                    ) : status === "blocked" || status === "failed" ? (
                      <AlertTriangle className="h-6 w-6 text-red-300" />
                    ) : (
                      <Circle className="h-6 w-6 text-text-tertiary" />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-bold text-text-primary">
                        {phase.number}. {phase.title}
                      </h2>
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}>
                        {STATUS_LABEL[status]}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-text-secondary">
                      {phase.goal}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-text-tertiary">
                      <span>담당: {agentLabel(phase.responsibleAgent)}</span>
                      <span>작업: {phase.tasks.length}개</span>
                      <span>진행률: {phase.completionPercentage}%</span>
                    </div>
                  </div>
                </div>

                {(vibeWorkspace || vibeIssue) && (
                  <a
                    href={vibeWorkspace ?? "#"}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary"
                  >
                    Vibe Kanban
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1fr]">
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    다음 액션
                  </p>
                  <p className="mt-2 text-sm leading-6 text-text-primary">
                    {phase.nextAction || "다음 액션 대기 중"}
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-surface p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                    완료 기준
                  </p>
                  <ul className="mt-2 space-y-1 text-sm leading-6 text-text-primary">
                    {phase.acceptanceCriteria.slice(0, 3).map((criterion) => (
                      <li key={criterion}>- {criterion}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}

        {phases.length === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-surface-2 px-6 py-16 text-center">
            <p className="text-text-secondary">
              아직 표시할 Phase가 없습니다. 홈 채팅에서 계획을 먼저 만들어 주세요.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
