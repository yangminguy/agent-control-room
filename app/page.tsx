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
            <h1 className="text-4xl font-bold tracking-tight text-text-primary">Control Tower</h1>
            <p className="text-text-secondary mt-2">Orchestrate AI agent execution, track blockers, monitor handoffs</p>
          </div>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 text-sm font-medium text-pink-primary hover:text-pink-soft border border-pink-primary/30 hover:border-pink-primary/60 rounded-lg px-3 py-2 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Implementation Plan
          </Link>
        </div>
      </section>

      {/* Section 1: Recent Session Report */}
      {recentSessionReport && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            Recent Session Report
          </h2>
          <div className="bg-surface border border-border rounded-lg p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-medium text-text-primary">Task {recentSessionReport.taskId}</p>
                <p className="text-sm text-text-secondary mt-1">{recentSessionReport.summary}</p>
              </div>
              <span className="text-xs font-medium px-2.5 py-1 rounded bg-surface-2 text-text-secondary">
                {recentSessionReport.agent}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-secondary">Execution Time</p>
                <p className="font-semibold text-text-primary">{recentSessionReport.executionTimeMinutes}m</p>
              </div>
              <div>
                <p className="text-text-secondary">Tokens Used</p>
                <p className="font-semibold text-text-primary">{(recentSessionReport.tokensUsed / 1000).toFixed(1)}K</p>
              </div>
            </div>
            <Link
              href="/reports"
              className="text-sm text-pink-primary hover:text-pink-soft transition-colors"
            >
              View all reports →
            </Link>
          </div>
        </section>
      )}

      {/* Section 2: Blocked & Needs Review Tasks */}
      {(blockedTasks.length > 0 || needsReviewTasks.length > 0) && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Attention Required ({blockedTasks.length + needsReviewTasks.length})
          </h2>
          <div className="space-y-2">
            {blockedTasks.slice(0, 3).map((task) => (
              <div key={task.id} className="bg-surface border border-border rounded-lg p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{task.title}</p>
                  <p className="text-xs text-text-secondary mt-1">Blocked • Assigned to {task.recommendedAgent}</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-red-900/20 text-red-400">Blocked</span>
              </div>
            ))}
            {needsReviewTasks.slice(0, 2).map((task) => (
              <div key={task.id} className="bg-surface border border-border rounded-lg p-3 flex items-start justify-between">
                <div>
                  <p className="font-medium text-text-primary">{task.title}</p>
                  <p className="text-xs text-text-secondary mt-1">In Progress • Review pending</p>
                </div>
                <span className="text-xs font-medium px-2 py-1 rounded bg-amber-900/20 text-amber-400">Review</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Section 3: Agent Performance Summary */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
          <Clock className="w-5 h-5 text-pink-primary" />
          Agent Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agentStatuses.map((status) => (
            <div key={status.agent} className="bg-surface border border-border rounded-lg p-4">
              <p className="font-medium text-text-primary capitalize">{status.agent}</p>
              <p className="text-sm text-text-secondary mt-2">
                Status: <span className={`font-semibold ${status.status === "available" ? "text-green-600" : "text-amber-500"}`}>
                  {status.status}
                </span>
              </p>
              {status.reason && <p className="text-xs text-text-secondary mt-1">{status.reason}</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Active Projects */}
      {projects.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary">Active Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.slice(0, 2).map((project) => (
              <ProjectStatusCard key={project.id} project={project} tasks={tasks} />
            ))}
          </div>
        </section>
      )}

      {/* Section 5: Next Handoff Candidates */}
      {pendingHandoffs.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Eye className="w-5 h-5 text-pink-primary" />
            Next Handoff Candidates ({pendingHandoffs.length})
          </h2>
          <div className="space-y-2">
            {pendingHandoffs.map((handoff) => (
              <div key={handoff.id} className="bg-surface border border-border rounded-lg p-3">
                <p className="font-medium text-text-primary">{handoff.reason}</p>
                <p className="text-xs text-text-secondary mt-1">
                  {handoff.fromAgent} → {handoff.toAgent}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Direction Orchestrator */}
      <div className="border-t border-border pt-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight text-text-primary">New Direction</h2>
          <p className="text-text-secondary mt-1">Convert product direction into actionable technical tasks and agent handoffs.</p>
        </div>
        <DirectionOrchestrator />
      </div>
    </div>
  );
}
