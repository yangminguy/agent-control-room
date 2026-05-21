import type { Metadata } from "next";
import { getFeaturePlans } from "@/lib/storage/feature-plan-store";
import { getProjects } from "@/lib/storage/json-store";
import { getRoadmap } from "@/lib/storage/roadmap-store";
import { KanbanBoard } from "@/components/plan/KanbanBoard";
import { RoadmapTimeline } from "@/components/roadmap/RoadmapTimeline";
import { AgentStatusPanel } from "@/components/agents/AgentStatusPanel";
import RoadmapStatusWidget from "@/components/roadmap/RoadmapStatusWidget";
import { adaptRoadmapStagesForUI } from "@/lib/roadmap-ui-adapter";
import { getAgentStatuses } from "@/lib/agents/agent-status";
import type { Roadmap } from "@/lib/types";
import {
  LayoutDashboard,
  Target,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Loader2,
  Compass,
  Cpu,
  HelpCircle,
  ChevronDown,
  Zap,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "개발 로드맵 — Agent Control Room",
  description:
    "AI Development Control Tower: 개발 로드맵 현황, 에이전트 상태, 다음 행동을 한눈에 파악합니다.",
};

// 서버 컴포넌트: 매 요청마다 최신 데이터 읽기
export const dynamic = "force-dynamic";

// ── Roadmap stage-level progress summary ─────────────────────────────────────

function RoadmapSummaryBar({ roadmap }: { roadmap: Roadmap }) {
  const stages = roadmap.stages;
  const total = stages.length;
  const completed = stages.filter((s) => s.status === "completed").length;
  const active = stages.filter((s) => s.status === "active").length;
  const blocked = stages.filter((s) => s.status === "blocked").length;
  const waiting = stages.filter((s) => s.status === "waiting").length;
  const userInput = stages.filter(
    (s) => s.status === "user_input_required",
  ).length;
  const pct = roadmap.overallProgress ?? Math.round((completed / total) * 100);

  return (
    <div className="rounded-xl border bg-surface-2 p-5 space-y-4">
      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="font-semibold text-text-primary">전체 진행률</span>
          <span className="font-bold text-text-primary">{pct}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Stage stat pills */}
      <div className="flex flex-wrap gap-3">
        <StatPill
          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
          label="완료"
          value={completed}
          total={total}
          colorClass="text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
        />
        {active > 0 && (
          <StatPill
            icon={<Loader2 className="w-3.5 h-3.5 animate-spin" />}
            label="진행 중"
            value={active}
            colorClass="text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800"
          />
        )}
        {waiting > 0 && (
          <StatPill
            icon={<Clock className="w-3.5 h-3.5" />}
            label="대기 중"
            value={waiting}
            colorClass="text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700"
          />
        )}
        {blocked > 0 && (
          <StatPill
            icon={<AlertTriangle className="w-3.5 h-3.5" />}
            label="차단됨"
            value={blocked}
            colorClass="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          />
        )}
        {userInput > 0 && (
          <StatPill
            icon={<HelpCircle className="w-3.5 h-3.5" />}
            label="확인 필요"
            value={userInput}
            colorClass="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800"
          />
        )}
      </div>
    </div>
  );
}

function StatPill({
  icon,
  label,
  value,
  total,
  colorClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  total?: number;
  colorClass: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border ${colorClass}`}
    >
      {icon}
      {label}{" "}
      <span className="font-bold">
        {value}
        {total != null ? `/${total}` : ""}
      </span>
    </span>
  );
}

// ── Agent display label helper ──────────────────────────────────────────────

function friendlyAgentLabel(agentId: string | undefined): string {
  if (!agentId) return "";
  const n = agentId.toLowerCase();
  if (n.includes("claude")) return "Claude Code";
  if (n.includes("codex")) return "Codex";
  if (n.includes("antigravity")) return "Antigravity";
  if (n.includes("hermes")) return "Hermes";
  if (n.includes("vibe") || n.includes("kanban")) return "Vibe Kanban";
  if (n.includes("manual") || n.includes("user")) return "사용자 직접";
  if (n.includes("frontend")) return "프론트엔드";
  if (n.includes("backend")) return "백엔드";
  return agentId;
}

// ── Current situation callout ─────────────────────────────────────────────────

function CurrentSituationCallout({ roadmap }: { roadmap: Roadmap }) {
  const stages = roadmap.stages;

  // Priority: user_input_required > blocked > active > next waiting
  const urgentStage =
    stages.find((s) => s.status === "user_input_required") ??
    stages.find((s) => s.status === "blocked") ??
    stages.find((s) => s.status === "active");

  if (!urgentStage) {
    const nextWaiting = stages.find((s) => s.status === "waiting");
    if (nextWaiting) {
      return (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/40 p-5 flex items-start gap-4">
          <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 shrink-0">
            <Clock className="w-5 h-5 text-gray-500" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
              다음 단계
            </p>
            <p className="font-semibold text-text-primary">
              {nextWaiting.title}
            </p>
            {nextWaiting.nextAction && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                {nextWaiting.nextAction}
              </p>
            )}
          </div>
        </div>
      );
    }
    // All done
    return (
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-900/10 p-5 flex items-start gap-4">
        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 shrink-0">
          <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
            현재 상황
          </p>
          <p className="font-semibold text-emerald-700 dark:text-emerald-300">
            모든 로드맵 단계가 완료되었습니다 🎉
          </p>
        </div>
      </div>
    );
  }

  const isUserInput = urgentStage.status === "user_input_required";
  const isBlocked = urgentStage.status === "blocked";
  const isActive = urgentStage.status === "active";

  const palette = isUserInput
    ? {
        border: "border-amber-300 dark:border-amber-700",
        bg: "bg-amber-50/60 dark:bg-amber-900/10",
        iconBg: "bg-amber-100 dark:bg-amber-900/30",
        iconColor: "text-amber-600",
        labelColor: "text-amber-600 dark:text-amber-400",
        titleColor: "text-amber-800 dark:text-amber-200",
        icon: <HelpCircle className="w-5 h-5 text-amber-500" />,
        situationLabel: "사용자 확인 필요",
      }
    : isBlocked
      ? {
          border: "border-red-300 dark:border-red-700",
          bg: "bg-red-50/60 dark:bg-red-900/10",
          iconBg: "bg-red-100 dark:bg-red-900/30",
          iconColor: "text-red-600",
          labelColor: "text-red-600 dark:text-red-400",
          titleColor: "text-red-800 dark:text-red-200",
          icon: <AlertTriangle className="w-5 h-5 text-red-500" />,
          situationLabel: "차단됨 — 조치 필요",
        }
      : {
          border: "border-blue-300 dark:border-blue-700",
          bg: "bg-blue-50/60 dark:bg-blue-900/10",
          iconBg: "bg-blue-100 dark:bg-blue-900/30",
          iconColor: "text-blue-600",
          labelColor: "text-blue-600 dark:text-blue-400",
          titleColor: "text-blue-800 dark:text-blue-200",
          icon: <Zap className="w-5 h-5 text-blue-500" />,
          situationLabel: "현재 진행 중",
        };

  // Derive the action text
  let actionText: string | undefined;
  if (isUserInput && urgentStage.userDecisions?.[0]?.question) {
    actionText = urgentStage.userDecisions[0].question;
  } else if (isBlocked && urgentStage.blockers?.[0]) {
    const b = urgentStage.blockers[0];
    actionText = b.requiredAction ?? b.description;
  } else if (urgentStage.nextAction) {
    actionText = urgentStage.nextAction;
  }

  const responsibleAgent = urgentStage.responsibleAgent;

  return (
    <div
      className={`rounded-xl border ${palette.border} ${palette.bg} p-5 flex items-start gap-4`}
    >
      <div className={`p-2 rounded-lg ${palette.iconBg} shrink-0`}>
        {palette.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs font-semibold uppercase tracking-wider mb-1 ${palette.labelColor}`}
        >
          {palette.situationLabel}
        </p>
        <p className={`font-semibold ${palette.titleColor}`}>
          {urgentStage.title}
        </p>
        {actionText && (
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1.5 flex items-start gap-1.5">
            <ArrowRight className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
            <span>{actionText}</span>
          </p>
        )}
        {responsibleAgent && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            담당 에이전트:{" "}
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              {friendlyAgentLabel(responsibleAgent)}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default async function PlanPage() {
  const [plans, projects, roadmap] = await Promise.all([
    getFeaturePlans(),
    getProjects(),
    getRoadmap("agent-control-room"),
  ]);

  const projectPathById = new Map(
    projects.map((project) => [project.id, project.path]),
  );

  // 로드맵 단계를 UI 형식으로 변환
  const uiStages = roadmap ? adaptRoadmapStagesForUI(roadmap.stages) : [];

  // 에이전트 상태 데이터 로드
  const agentStatuses = getAgentStatuses();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-10">

      {/* ── 헤더 ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/"
              className="text-xs text-text-secondary hover:text-text-primary transition-colors"
            >
              대시보드
            </Link>
            <span className="text-border">/</span>
            <span className="text-xs text-text-secondary">개발 로드맵</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Compass className="w-7 h-7 text-pink-primary" />
            개발 로드맵
          </h1>
          <p className="text-gray-500 mt-1 text-sm">
            AI Development Control Tower — 현재 개발 상황, 다음 행동, 에이전트
            현황을 한눈에 파악합니다.
          </p>
        </div>
        <Link
          href="/prompt-compiler"
          className="rounded-md border border-pink-primary/30 bg-pink-primary/5 hover:bg-pink-primary/10 px-4 py-2 text-sm font-semibold text-pink-primary transition-all flex items-center gap-2 shadow-sm shrink-0"
        >
          <Cpu className="w-4 h-4" />
          프롬프트 컴파일러
        </Link>
      </div>

      {/* ── 안전성 안내 ── */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <p className="text-sm text-blue-900 leading-relaxed">
          {/* AI Development Control Tower safety notice — do not split the sentence below across lines */}
          {"Agent Control Room은 로드맵 검토, 프롬프트 준비, 핸드오프 패킷 생성, 검토 체크리스트를 제공합니다. 에이전트를 자동으로 실행하거나 파일을 수정하지 않습니다. 모든 실행은 사용자 승인 후 수동으로 수행됩니다."}
        </p>
      </div>

      {/* ── 현재 상태 위젯 ── */}
      {roadmap && (
        <RoadmapStatusWidget roadmap={roadmap} />
      )}

      {/* ── 로드맵 섹션 ── */}
      {roadmap ? (
        <section className="space-y-6">
          {/* Section header */}
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-pink-primary" />
              <h2 className="text-xl font-bold text-text-primary">
                개발 로드맵
              </h2>
            </div>
            {roadmap.overallProgress > 0 && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-pink-primary/10 text-pink-primary">
                {roadmap.overallProgress}% 완료
              </span>
            )}
          </div>

          {/* Stage-level progress summary */}
          <RoadmapSummaryBar roadmap={roadmap} />

          {/* Current situation callout */}
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
              지금 확인할 것
            </p>
            <CurrentSituationCallout roadmap={roadmap} />
          </div>

          {/* Timeline */}
          {uiStages.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                전체 단계
              </p>
              <RoadmapTimeline stages={uiStages} />
            </div>
          )}
        </section>
      ) : (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            등록된 로드맵이 없습니다.
          </p>
          <p className="text-gray-300 text-sm mt-1">
            Direction Orchestrator에서 계획을 생성하면 여기에 표시됩니다.
          </p>
        </div>
      )}

      {/* ── 에이전트 상태 패널 ── */}
      {agentStatuses && agentStatuses.length > 0 && (
        <section className="space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-4">
            <Cpu className="w-5 h-5 text-pink-primary" />
            <h2 className="text-xl font-bold text-text-primary">
              에이전트 시스템 상태
            </h2>
          </div>
          <AgentStatusPanel agents={agentStatuses} />
        </section>
      )}

      {/* ── 작업 상세 보기 (Kanban, 접을 수 있음) ── */}
      {plans.length > 0 && (
        <section>
          <details className="group">
            <summary className="flex items-center justify-between border border-border rounded-xl px-5 py-3.5 cursor-pointer select-none bg-surface-2 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors list-none">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-4 h-4 text-pink-primary" />
                <span className="text-sm font-semibold text-text-primary">
                  작업 상세 보기 (칸반 보드)
                </span>
                <span className="text-xs text-gray-400">
                  — {plans.length}개 계획
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-gray-400 transition-transform group-open:rotate-180" />
            </summary>

            <div className="mt-4 space-y-8">
              {plans.map((plan) => (
                <section key={plan.id} className="space-y-4">
                  {/* Plan header */}
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-base font-bold text-text-primary">
                        {plan.title}
                      </h3>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          plan.status === "done"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : plan.status === "running"
                              ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                              : plan.status === "blocked"
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-surface-2 text-text-secondary border border-border"
                        }`}
                      >
                        {plan.status === "done"
                          ? "완료"
                          : plan.status === "running"
                            ? "실행중"
                            : plan.status === "blocked"
                              ? "블로킹됨"
                              : plan.status}
                      </span>
                    </div>
                    {plan.userGoal && (
                      <p className="text-sm text-gray-500 leading-relaxed max-w-2xl">
                        {plan.userGoal}
                      </p>
                    )}
                  </div>

                  {/* Kanban board */}
                  <KanbanBoard
                    plan={plan}
                    projectPath={projectPathById.get(plan.projectId) ?? ""}
                  />
                </section>
              ))}
            </div>
          </details>
        </section>
      )}

      {/* No plans at all */}
      {plans.length === 0 && !roadmap && (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 p-16 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-400 font-medium">
            등록된 Feature Plan이 없습니다.
          </p>
          <p className="text-gray-300 text-sm mt-1">
            Direction Orchestrator에서 계획을 생성하면 여기에 표시됩니다.
          </p>
        </div>
      )}
    </div>
  );
}
