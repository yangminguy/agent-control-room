"use client";

import { useEffect, useState } from "react";
import { DashboardSnapshot } from "@/lib/types";
import { Activity, BarChart3, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { ActiveWorkspacesCard, type ActiveWorkspace } from "@/components/ops/ActiveWorkspacesCard";
import { ApprovalNeededCard, type PendingAction } from "@/components/ops/ApprovalNeededCard";
import { RuntimeStatusCard, type AgentRuntimeRow } from "@/components/ops/RuntimeStatusCard";
import { AntigravityCapabilityCard, type AgtSwitchCapability, type AgtReadiness } from "@/components/ops/AntigravityCapabilityCard";

type OpsData = {
  workspaces: ActiveWorkspace[];
  pendingActions: PendingAction[];
  agents: AgentRuntimeRow[];
  antigravity: {
    currentModel: string | null;
    switchCapability: AgtSwitchCapability;
    binaryPath: string | null;
    readiness: AgtReadiness;
    failureReason?: string;
  } | null;
};

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");
  const [ops, setOps] = useState<OpsData>({
    workspaces: [],
    pendingActions: [],
    agents: [],
    antigravity: null,
  });

  useEffect(() => {
    const fetchSnapshot = async () => {
      try {
        const url = `/api/dashboard${selectedProject ? `?projectId=${selectedProject}` : ""}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setSnapshot(data);
        }
      } catch (error) {
        console.error("Failed to fetch snapshot:", error);
      } finally {
        setLoading(false);
      }
    };

    const fetchOps = async () => {
      try {
        const [wsRes, envRes, rtRes, agtRes] = await Promise.all([
          fetch("/api/ops/workspaces"),
          fetch("/api/ops/envelopes"),
          fetch("/api/ops/runtimes"),
          fetch("/api/ops/antigravity"),
        ]);

        const wsData = wsRes.ok ? await wsRes.json() : { workspaces: [] };
        const envData = envRes.ok ? await envRes.json() : { envelopes: [] };
        const rtData = rtRes.ok ? await rtRes.json() : { agents: [] };
        const agtData = agtRes.ok ? await agtRes.json() : null;

        const workspaces: ActiveWorkspace[] = (wsData.workspaces ?? []).map((ws: {
          id: string; taskId: string; primaryAgent: string; status: string; branchName: string;
        }) => ({
          id: ws.id.slice(0, 8),
          task: ws.taskId,
          primaryAgent: ws.primaryAgent,
          status: (["running", "needs_review", "approved"].includes(ws.status) ? ws.status : "running") as ActiveWorkspace["status"],
          branch: ws.branchName,
        }));

        const pendingActions: PendingAction[] = (envData.envelopes ?? []).map((e: {
          taskId: string; actionType: string; riskLevel: string; createdAt: string; expiresAt?: string;
        }) => ({
          taskId: e.taskId,
          actionType: e.actionType,
          riskLevel: (["medium", "high", "critical"].includes(e.riskLevel) ? e.riskLevel : "medium") as PendingAction["riskLevel"],
          createdAt: e.createdAt,
          expiresAt: e.expiresAt,
        }));

        setOps({ workspaces, pendingActions, agents: rtData.agents ?? [], antigravity: agtData });
      } catch {
        // ops fetch failure is non-blocking
      }
    };

    fetchSnapshot();
    fetchOps();
    const interval = setInterval(fetchSnapshot, 30000);
    const opsInterval = setInterval(fetchOps, 15000);
    return () => { clearInterval(interval); clearInterval(opsInterval); };
  }, [selectedProject]);

  if (loading || !snapshot) {
    return (
      <div className="p-8 text-center min-h-screen">
        <Clock className="mx-auto mb-4 text-pink-primary animate-spin" size={32} />
        <p className="text-text-secondary">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 animate-fade-in">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 border-b border-border/50 pb-6">
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-primary mb-1">
            System Monitoring
          </p>
          <h1 className="text-3xl font-extrabold mb-2 text-text-primary tracking-tight">Multi-Project Dashboard</h1>
          <p className="text-text-secondary">Real-time execution monitoring across all active spaces</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Jobs" value={snapshot.kpi.totalJobs} icon="briefcase" />
          <KPICard label="Completed" value={snapshot.kpi.completedJobs} icon="check" />
          <KPICard label="Blocked" value={snapshot.kpi.blockedJobs} icon="alert" color="red" />
          <KPICard label="Completion Rate" value={`${snapshot.kpi.completionRate}%`} icon="trend" />
          <KPICard label="Active Projects" value={snapshot.kpi.activeProjects} icon="folder" />
          <KPICard label="Safety Violations" value={snapshot.kpi.safetyViolations} icon="shield" color="red" />
          <KPICard label="Pending Approvals" value={snapshot.kpi.pendingApprovals} icon="clock" color="amber" />
          <KPICard label="Avg Retries" value={snapshot.kpi.avgRetryCount.toFixed(1)} icon="repeat" />
        </div>

        {/* Agent Status */}
        <div className="bg-surface rounded-xl border border-border p-6 mb-8">
          <h2 className="text-lg font-bold text-text-primary mb-4">Agent Status Pools</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {snapshot.agentSummaries.map((agent) => (
              <div
                key={agent.agentId}
                className="p-4 rounded-xl bg-surface-2 border border-border/60 hover:border-pink-primary/30 transition-colors"
              >
                <p className="font-bold text-sm text-text-primary tracking-wide uppercase">{agent.agentId}</p>
                <p className="text-xs font-semibold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Available
                </p>
                <p className="text-[11px] text-text-secondary mt-3 bg-surface border border-border/50 px-2 py-1 rounded inline-block">
                  Projects: {agent.activeProjectIds.length}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Ops Cards */}
        <div className="mb-8">
          <p className="text-[10px] font-bold uppercase tracking-widest text-pink-primary mb-3">
            Live Operations
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ActiveWorkspacesCard workspaces={ops.workspaces} />
            <ApprovalNeededCard pendingActions={ops.pendingActions} />
            <RuntimeStatusCard agents={ops.agents} />
            {ops.antigravity && (
              <AntigravityCapabilityCard
                currentModel={ops.antigravity.currentModel}
                switchCapability={ops.antigravity.switchCapability}
                binaryPath={ops.antigravity.binaryPath}
                readiness={ops.antigravity.readiness}
                failureReason={ops.antigravity.failureReason}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <div className="bg-surface rounded-xl border border-border p-6">
            <h2 className="text-lg font-bold text-text-primary mb-4">Recent Operations Activity</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
              {snapshot.recentActivity.length > 0 ? (
                snapshot.recentActivity.map((event) => (
                  <div key={event.id} className="flex gap-3 text-sm border-l-2 border-pink-primary/40 pl-3">
                    <div className="text-[10px] text-text-tertiary whitespace-nowrap uppercase tracking-wider font-semibold mt-0.5 w-16">
                      {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-text-primary">{event.eventType}</p>
                      <p className="text-xs text-text-secondary mt-0.5 leading-relaxed">{event.detail}</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-text-secondary/70 italic">No recent activity</p>
              )}
            </div>
          </div>

          <div className="space-y-8">
            {/* Blocked Items */}
            {snapshot.blockedItems.jobs.length > 0 && (
              <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
                <div className="flex items-center gap-2.5 mb-4">
                  <AlertCircle className="text-red-400 w-5 h-5" />
                  <h2 className="text-lg font-bold text-red-300">Blocked Operational Items</h2>
                </div>
                <div className="space-y-2">
                  {snapshot.blockedItems.jobs.map((job) => (
                    <div key={job.id} className="text-xs text-red-200/80 bg-red-500/10 border border-red-500/10 px-3 py-2 rounded">
                      <span className="font-semibold text-red-300">Job {job.id}</span> — Status: {job.status}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {snapshot.blockedItems.jobs.length === 0 && (
              <div className="bg-emerald-500/5 rounded-xl border border-emerald-500/20 p-6 flex items-start gap-3">
                <CheckCircle2 className="text-emerald-400 shrink-0 w-6 h-6" />
                <div>
                  <p className="font-bold text-emerald-300">All Operations Clear</p>
                  <p className="text-xs text-emerald-200/70 mt-1">No blocked items or system-level approval requests across any projects.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  icon,
  color = "blue",
}: {
  label: string;
  value: string | number;
  icon: string;
  color?: "blue" | "red" | "green" | "amber";
}) {
  const bgColor = {
    blue: "bg-surface-2",
    red: "bg-red-500/5",
    green: "bg-emerald-500/5",
    amber: "bg-amber-500/5",
  }[color];

  const borderColor = {
    blue: "border-border/60",
    red: "border-red-500/20",
    green: "border-emerald-500/20",
    amber: "border-amber-500/20",
  }[color];

  const textColor = {
    blue: "text-text-primary",
    red: "text-red-400",
    green: "text-emerald-400",
    amber: "text-amber-400",
  }[color];

  return (
    <div className={`${bgColor} rounded-xl p-4 border ${borderColor} hover:-translate-y-0.5 transition-transform`}>
      <p className="text-[10px] font-bold text-text-secondary mb-2 uppercase tracking-wider">{label}</p>
      <p className={`text-2xl font-extrabold tracking-tight ${textColor}`}>{value}</p>
    </div>
  );
}
