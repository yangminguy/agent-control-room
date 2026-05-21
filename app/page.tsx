import { DirectionOrchestrator } from "@/components/DirectionOrchestrator";
import { getProjects, getAgentStatuses, getTasks, getSessionReports, getHandoffs } from "@/lib/storage/json-store";
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";
import { ProjectStatusCard } from "@/components/projects/ProjectStatusCard";
import Link from "next/link";
import { LayoutDashboard, AlertTriangle, CheckCircle2, Clock, Eye } from "lucide-react";

export default async function Home() {
  const [projects, agentStatuses, tasks, sessionReports, handoffs] = await Promise.all([
    getProjects(),
    getAgentStatuses(),
    getTasks(),
    getSessionReports().catch(() => []),
    getHandoffs().catch(() => []),
  ]);

  // Control Tower Sections
  const recentSessionReport = sessionReports[0];
  const blockedTasks = tasks.filter((t) => t.status === "blocked");
  const needsReviewTasks = tasks.filter((t) => t.status === "in_progress");
  const activeAgents = agentStatuses.filter((a) => a.status === "available");
  const coolingDownAgents = agentStatuses.filter((a) => a.status === "cooling_down");
  const pendingHandoffs = handoffs.slice(0, 3);

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Header */}
      <section className="space-y-3 border-b border-border pb-8">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">대시보드</h1>
            <p className="text-text-secondary mt-2">AI 에이전트 실행을 관리하고 블로커를 추적하며 핸드오프를 모니터링합니다.</p>
          </div>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 text-sm font-medium text-pink-primary hover:text-pink-soft border border-pink-primary/30 hover:border-pink-primary/60 rounded-lg px-3 py-2 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            실행 계획
          </Link>
        </div>
      </section>

      {/* Section 1: Recent Session Report */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          최근 세션 리포트
        </h2>
        {recentSessionReport ? (
          <div className="bg-surface-2 border border-border rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">태스크 {recentSessionReport.taskId}</p>
                <p className="text-sm text-text-secondary mt-1">{recentSessionReport.summary}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded bg-surface text-text-secondary border border-border">
                {recentSessionReport.agent}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">실행 시간</p>
                <p className="font-semibold text-text-primary">{recentSessionReport.executionTimeMinutes}분</p>
              </div>
              <div>
                <p className="text-text-secondary">사용된 토큰</p>
                <p className="font-semibold text-text-primary">{(recentSessionReport.tokensUsed / 1000).toFixed(1)}K</p>
              </div>
            </div>
            <Link
              href="/reports"
              className="text-sm text-pink-primary hover:text-pink-soft transition-colors"
            >
              모든 리포트 보기 →
            </Link>
          </div>
        ) : (
          <div className="bg-surface-2 border border-border rounded-lg p-6 text-center">
            <p className="text-text-secondary">아직 세션 리포트가 없습니다.</p>
            <Link
              href="/reports"
              className="text-sm text-pink-primary hover:text-pink-soft transition-colors mt-2 inline-block"
            >
              첫 번째 세션 리포트를 작성해보세요 →
            </Link>
          </div>
        )}
      </section>

      {/* Section 2: Blocked & Needs Review Tasks */}
      {(blockedTasks.length > 0 || needsReviewTasks.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            조치 필요 ({blockedTasks.length + needsReviewTasks.length})
          </h2>
          <div className="space-y-2">
            {blockedTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-surface-2 border border-border rounded-lg p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{task.title}</p>
                  <p className="text-xs text-text-secondary mt-1">블로킹됨 • 담당: {task.recommendedAgent}</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">블로킹됨</span>
              </div>
            ))}
            {needsReviewTasks.slice(0, 2).map((task) => (
              <div key={task.id} className="bg-surface-2 border border-border rounded-lg p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{task.title}</p>
                  <p className="text-xs text-text-secondary mt-1">실행중 • 검토 대기 중</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">검토</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Agent Performance Summary */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Clock className="w-5 h-5 text-pink-primary" />
          에이전트 상태
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agentStatuses.map((status) => (
            <div key={status.agent} className="bg-surface-2 border border-border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
              <p className="font-medium text-text-primary capitalize">{status.agent}</p>
              <p className="text-sm text-text-secondary mt-2">
                상태: <span className={`font-semibold ${status.status === "available" ? "text-green-500" : "text-amber-500"}`}>
                  {status.status}
                </span>
              </p>
              {status.reason && <p className="text-xs text-text-secondary mt-1">{status.reason}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Active Projects */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary">활성 프로젝트</h2>
        {projects.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 2).map((project) => (
              <ProjectStatusCard key={project.id} project={project} tasks={tasks} />
            ))}
          </div>
        ) : (
          <div className="bg-surface-2 border border-border rounded-lg p-6 text-center">
            <p className="text-text-secondary">아직 등록된 프로젝트가 없습니다.</p>
            <Link
              href="/projects"
              className="text-sm text-pink-primary hover:text-pink-soft transition-colors mt-2 inline-block"
            >
              첫 번째 프로젝트를 등록해보세요 →
            </Link>
          </div>
        )}
      </section>

      {/* Section 5: Next Handoff Candidates */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Eye className="w-5 h-5 text-pink-primary" />
          다음 핸드오프 후보 {pendingHandoffs.length > 0 && `(${pendingHandoffs.length})`}
        </h2>
        {pendingHandoffs.length > 0 ? (
          <div className="space-y-2">
            {pendingHandoffs.map((handoff) => (
              <div key={handoff.id} className="bg-surface-2 border border-border rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow">
                <p className="font-medium text-text-primary">{handoff.reason}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {handoff.fromAgent} → {handoff.toAgent}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-surface-2 border border-border rounded-lg p-6 text-center">
            <p className="text-text-secondary">대기 중인 핸드오프가 없습니다.</p>
            <Link
              href="/handoffs"
              className="text-sm text-pink-primary hover:text-pink-soft transition-colors mt-2 inline-block"
            >
              핸드오프 보관함 보기 →
            </Link>
          </div>
        )}
      </section>

      {/* Direction Orchestrator */}
      <div className="border-t border-border pt-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">새로운 디렉션</h2>
          <p className="text-text-secondary mt-1">제품 방향성을 실행 가능한 기술적 태스크와 에이전트 핸드오프 문서로 변환합니다.</p>
        </div>
        <DirectionOrchestrator />
      </div>
    </div>
  );
}
