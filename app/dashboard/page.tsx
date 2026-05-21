"use client";

import { useEffect, useState } from "react";
import { DashboardSnapshot } from "@/lib/types";
import { Activity, BarChart3, AlertCircle, CheckCircle2, Clock } from "lucide-react";

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<string>("");

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

    fetchSnapshot();
    const interval = setInterval(fetchSnapshot, 30000);
    return () => clearInterval(interval);
  }, [selectedProject]);

  if (loading || !snapshot) {
    return (
      <div className="p-8 text-center">
        <Clock className="mx-auto mb-4 text-blue-600 animate-spin" size={32} />
        <p className="text-slate-600">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-slate-600">Real-time multi-project monitoring</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          <KPICard label="Total Jobs" value={snapshot.kpi.totalJobs} icon="briefcase" />
          <KPICard label="Completed" value={snapshot.kpi.completedJobs} icon="check" />
          <KPICard label="Blocked" value={snapshot.kpi.blockedJobs} icon="alert" color="red" />
          <KPICard label="Completion Rate" value={`${snapshot.kpi.completionRate}%`} icon="trend" />
          <KPICard label="Active Projects" value={snapshot.kpi.activeProjects} icon="folder" />
          <KPICard label="Safety Violations" value={snapshot.kpi.safetyViolations} icon="shield" color="red" />
          <KPICard label="Pending Approvals" value={snapshot.kpi.pendingApprovals} icon="clock" />
          <KPICard label="Avg Retries" value={snapshot.kpi.avgRetryCount.toFixed(1)} icon="repeat" />
        </div>

        {/* Agent Status */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Agent Status</h2>
          <div className="grid grid-cols-3 gap-4">
            {snapshot.agentSummaries.map((agent) => (
              <div
                key={agent.agentId}
                className="p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                <p className="font-medium text-sm">{agent.agentId}</p>
                <p className="text-xs text-green-600 mt-1">Available</p>
                <p className="text-xs text-slate-600 mt-2">
                  Projects: {agent.activeProjectIds.length}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {snapshot.recentActivity.length > 0 ? (
              snapshot.recentActivity.map((event) => (
                <div key={event.id} className="flex gap-3 text-sm border-l-4 border-blue-500 pl-3">
                  <div className="text-xs text-slate-500 whitespace-nowrap">
                    {new Date(event.timestamp).toLocaleTimeString()}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900">{event.eventType}</p>
                    <p className="text-slate-600">{event.detail}</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-500">No recent activity</p>
            )}
          </div>
        </div>

        {/* Blocked Items */}
        {snapshot.blockedItems.jobs.length > 0 && (
          <div className="bg-red-50 rounded-lg border border-red-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-red-600" size={20} />
              <h2 className="text-xl font-semibold text-red-900">Blocked Items</h2>
            </div>
            <div className="space-y-2">
              {snapshot.blockedItems.jobs.map((job) => (
                <div key={job.id} className="text-sm text-red-800">
                  Job {job.id} - Status: {job.status}
                </div>
              ))}
            </div>
          </div>
        )}

        {snapshot.blockedItems.jobs.length === 0 && (
          <div className="bg-green-50 rounded-lg border border-green-200 p-6 flex items-center gap-3">
            <CheckCircle2 className="text-green-600" size={24} />
            <div>
              <p className="font-semibold text-green-900">All Clear</p>
              <p className="text-sm text-green-800">No blocked items or approval requests</p>
            </div>
          </div>
        )}
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
  color?: "blue" | "red" | "green";
}) {
  const bgColor = {
    blue: "bg-blue-50",
    red: "bg-red-50",
    green: "bg-green-50",
  }[color];

  const textColor = {
    blue: "text-blue-600",
    red: "text-red-600",
    green: "text-green-600",
  }[color];

  return (
    <div className={`${bgColor} rounded-lg p-4 border border-slate-200`}>
      <p className="text-xs text-slate-600 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
}
