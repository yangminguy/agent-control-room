import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Eye, ChevronDown } from "lucide-react";

import { getLatestControlRoomPlan, getControlRoomRuns } from "@/lib/control-room/store";
import { getAllRoadmaps } from "@/lib/storage/roadmap-store";
import { getAgentStatuses } from "@/lib/storage/agent-status-store";
import type { RoadmapStatus } from "@/lib/types";

// New Components
import { CommandCenterHero } from "@/components/control-room/CommandCenterHero";
import { KpiStrip } from "@/components/control-room/KpiStrip";
import { YourNextMove } from "@/components/control-room/YourNextMove";
import { RiskRadar } from "@/components/control-room/RiskRadar";
import { AgentStatusPanel } from "@/components/agents/AgentStatusPanel";
import { RoadmapTimeline } from "@/components/roadmap/RoadmapTimeline";

import type { AgentStatus as UIAgentStatus, AgentAvailability } from "@/components/agents/types";
import type { RoadmapStage as UIRoadmapStage } from "@/components/roadmap/RoadmapStageCard";

export const metadata: Metadata = {
  title: "AI Development Control Tower — Agent Control Room",
  description: "AI Development Control Tower for non-developer PMs.",
};

export const dynamic = "force-dynamic";

export default async function PlanPage() {
  const [latestPlan, runs, roadmaps, agentStatusesRaw] = await Promise.all([
    getLatestControlRoomPlan(),
    getControlRoomRuns(),
    getAllRoadmaps(),
    getAgentStatuses(),
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

  // 1. Prepare Active Phase Info
  const activePhase = phases.find(p => p.status === "active" || p.status === "user_input_required" || p.status === "blocked") 
                      || phases.find(p => p.status === "waiting");

  // 2. Map Agents for AgentStatusPanel
  const getAvail = (id: string): AgentAvailability => {
    return (agentStatusesRaw.find(a => a.agent === id)?.status || "available") as AgentAvailability;
  };

  const agentsList: UIAgentStatus[] = [
    {
      id: "agent-claude",
      type: "claude_code",
      name: "Claude Code",
      role: "Architecture & Reasoning",
      availability: getAvail("claude-code"),
      bestFor: ["Complex reasoning", "Architecture", "Multi-file changes"],
      currentTask: phases.find(p => p.status === "active" && p.responsibleAgent === "claude-code")?.currentTaskId || undefined,
    },
    {
      id: "agent-codex",
      type: "codex",
      name: "Codex",
      role: "Implementation & QA",
      availability: getAvail("codex"),
      bestFor: ["Bug fixes", "Type checking", "Isolated implementation"],
      currentTask: phases.find(p => p.status === "active" && p.responsibleAgent === "codex")?.currentTaskId || undefined,
    },
    {
      id: "agent-antigravity",
      type: "antigravity",
      name: "Antigravity",
      role: "UI/UX & Frontend",
      availability: getAvail("antigravity"),
      bestFor: ["UI prototyping", "Visual iteration", "Tailwind styling"],
      currentTask: phases.find(p => p.status === "active" && p.responsibleAgent === "antigravity")?.currentTaskId || undefined,
    },
    {
      id: "agent-hermes",
      type: "hermes",
      name: "Hermes",
      role: "Background Validator",
      availability: "background_worker",
      bestFor: ["Validation", "Quality checks", "Handoff preparation"],
    }
  ];

  // 3. Prepare Decisions and Blockers for YourNextMove
  const userDecisions = phases.flatMap(p => 
    (p.userDecisions || []).map(d => ({
      id: d.id,
      question: d.question,
      options: d.options,
      stageId: p.id,
      stageTitle: p.title
    }))
  );
  
  const blockers = phases.flatMap(p => 
    (p.blockers || []).map(b => ({
      id: b.id,
      title: b.title,
      description: b.description,
      stageId: p.id,
      stageTitle: p.title
    }))
  );

  phases.forEach(p => {
    if (p.status === "user_input_required" && (!p.userDecisions || p.userDecisions.length === 0)) {
      userDecisions.push({
        id: `implicit-decision-${p.id}`,
        question: `사용자 결정 대기 중 (${p.title})`,
        options: ["Review Phase", "Approve", "Hold"],
        stageId: p.id,
        stageTitle: p.title
      });
    }
    if ((p.status === "blocked" || p.status === "failed") && (!p.blockers || p.blockers.length === 0)) {
      blockers.push({
        id: `implicit-blocker-${p.id}`,
        title: "Phase Blocked",
        description: "이 단계의 실행이 차단되었습니다.",
        stageId: p.id,
        stageTitle: p.title
      });
    }
  });

  const approvalRequired = latestRun?.approvalRequired || agentsList.some(a => a.availability === "approval_required");

  // 4. Map Stages for RoadmapTimeline
  const mappedStages: UIRoadmapStage[] = phases.map(p => ({
    id: p.id,
    title: p.title,
    description: p.description,
    status: p.status as RoadmapStatus,
    assignedAgent: p.responsibleAgent,
    currentTask: p.currentTaskId || undefined,
    nextAction: p.nextAction,
    blockerReason: p.blockers?.[0]?.description,
    blockerUnlockAction: p.blockers?.[0]?.requiredAction,
    blockerResponsible: p.blockers?.[0]?.blockedAgent,
    userQuestion: p.userDecisions?.[0]?.question,
    userDecisionOptions: p.userDecisions?.[0]?.options,
    acceptanceCriteria: p.acceptanceCriteria,
    phaseNumber: p.number
  }));

  // 5. Compute KPI Strip values
  const activeAgentsCount = agentsList.filter(a => a.availability === "working" || a.availability === "available" || a.availability === "background_worker").length;
  const blockersCount = blockers.length;
  const decisionsCount = userDecisions.length + (approvalRequired ? 1 : 0);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 lg:px-8 space-y-8 animate-fade-in pb-24">
      {/* HEADER */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between border-b border-border/50 pb-6">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-primary mb-1">
            Control Tower
          </p>
          <h1 className="text-2xl font-extrabold text-text-primary tracking-tight">
            AI Development Command Center
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-text-secondary">
            프로젝트 전체 상황을 모니터링하고 지휘합니다. 모든 에이전트는 승인된 범위 내에서만 작동합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/result-review"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            <Eye className="h-4 w-4" />
            리뷰 모드
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-pink-primary px-4 py-2 text-xs font-semibold text-white hover:bg-pink-soft transition-colors shadow-lg shadow-pink-primary/20"
          >
            기획 채팅
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      {/* HERO & KPIs */}
      <div className="space-y-4">
        <CommandCenterHero 
          planTitle={latestPlan?.title ?? roadmap?.title ?? "No Active Plan"}
          projectName={roadmap?.projectId ?? "Project"}
          productVision={roadmap?.productVision}
          overallProgress={overallProgress}
          activePhaseNumber={activePhase?.number}
          activePhaseTitle={activePhase?.title}
          latestRunStatus={latestRun?.status}
          latestRunMessage={latestRun?.message}
        />
        <KpiStrip 
          overallProgress={overallProgress}
          activeAgentsCount={activeAgentsCount}
          blockersCount={blockersCount}
          decisionsCount={decisionsCount}
        />
      </div>

      {/* MAIN TWO-COLUMN LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_400px] gap-8">
        
        {/* LEFT COLUMN: Operations & Timeline */}
        <div className="space-y-8 min-w-0">
          
          {/* Your Next Move (Promoted Decisions) */}
          {hasItemsForNextMove(userDecisions, blockers, approvalRequired) && (
            <section className="scroll-mt-6" id="your-next-move">
              <YourNextMove 
                userDecisions={userDecisions}
                blockers={blockers}
                approvalRequired={approvalRequired}
              />
            </section>
          )}

          {/* Mission Timeline */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary">Mission Timeline</h2>
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-surface-2 border border-border/60 text-text-secondary">
                {phases.length} Phases
              </span>
            </div>
            <div className="bg-surface rounded-xl border border-border p-4 sm:p-6 lg:p-8">
              <RoadmapTimeline stages={mappedStages} />
            </div>
          </section>
        </div>

        {/* RIGHT COLUMN: Live Board & Radar */}
        <div className="space-y-8 min-w-0 flex flex-col order-first lg:order-none">
          
          <section className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Risk & Security Radar</h2>
            <RiskRadar stages={phases} agents={agentsList} />
          </section>

          <section className="space-y-4">
            <h2 className="text-lg font-bold text-text-primary">Agent Live Board</h2>
            <div className="bg-surface rounded-xl border border-border p-4">
              <AgentStatusPanel agents={agentsList} />
            </div>
          </section>

        </div>
      </div>

      {/* DETAILED KANBAN (COLLAPSIBLE) */}
      <section className="mt-16 pt-8 border-t border-border/40">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between rounded-lg bg-surface-2 p-4 border border-border/60 text-sm font-semibold text-text-primary transition-colors hover:bg-surface-2/80">
            <span>Detailed Task Kanban (Legacy View)</span>
            <ChevronDown className="h-5 w-5 text-text-secondary transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-4 rounded-xl border border-dashed border-border bg-surface-2/40 px-6 py-12 text-center text-sm text-text-secondary">
            Vibe Kanban 워크벤치와의 통합으로 인해 상세 태스크 보기는 이곳에서 제공되지 않습니다. 
            <br className="mb-4" />
            <a href="#" className="inline-flex mt-4 items-center gap-1.5 text-pink-primary hover:text-pink-soft font-semibold">
              Open Vibe Kanban <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </details>
      </section>
    </main>
  );
}

function hasItemsForNextMove(decisions: any[], blockers: any[], approvalRequired: boolean) {
  return decisions.length > 0 || blockers.length > 0 || approvalRequired;
}
