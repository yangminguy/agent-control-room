import { DirectionOrchestrator } from "@/components/DirectionOrchestrator";
import { getProjects, getAgentStatuses, getTasks } from "@/lib/storage/json-store";
import { AgentStatusCard } from "@/components/agents/AgentStatusCard";
import { ProjectStatusCard } from "@/components/projects/ProjectStatusCard";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export default async function Home() {
  const [projects, agentStatuses, tasks] = await Promise.all([
    getProjects(),
    getAgentStatuses(),
    getTasks(),
  ]);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-12">
      <section className="space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500 mt-1">System Overview &amp; Agent Status</p>
          </div>
          <Link
            href="/plan"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-200 hover:border-blue-400 rounded-lg px-3 py-2 transition-all"
          >
            <LayoutDashboard className="w-4 h-4" />
            Implementation Plan
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {agentStatuses.map((status) => (
            <AgentStatusCard key={status.agent} status={status} />
          ))}
        </div>
      </section>

      {projects.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Active Projects</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.slice(0, 3).map((project) => (
              <ProjectStatusCard key={project.id} project={project} tasks={tasks} />
            ))}
          </div>
        </section>
      )}

      <div className="border-t pt-10">
        <div className="mb-6">
          <h2 className="text-2xl font-bold tracking-tight">Direction Orchestrator</h2>
          <p className="text-gray-500 mt-1">Convert product direction into actionable technical tasks and agent handoffs.</p>
        </div>
        <DirectionOrchestrator />
      </div>
    </div>
  );
}
