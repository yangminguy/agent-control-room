import { DashboardSnapshot, DispatchJob, ApprovalRequest } from "@/lib/types";
import { aggregateKPI } from "./kpi-aggregator";
import { buildActivityFeed } from "./activity-feed-builder";
import { getMultiProjectOrchestrator } from "@/lib/multi-project/multi-project-orchestrator";

export async function buildDashboardSnapshot(projectId?: string): Promise<DashboardSnapshot> {
  try {
    const orchestrator = getMultiProjectOrchestrator();
    const state = orchestrator.getOrchestratorState();

    const allJobs: DispatchJob[] = [];
    const allApprovals: ApprovalRequest[] = [];

    for (const [id, queue] of Object.entries(state.queues)) {
      if (projectId && id !== projectId) continue;

      if (queue.activeJobs) allJobs.push(...queue.activeJobs);
      if (queue.pendingJobs) allJobs.push(...queue.pendingJobs);
      if (queue.completedJobIds) {
        allJobs.push(
          ...queue.completedJobIds.map((jobId) => ({
            id: jobId,
            taskId: "unknown",
            agentId: "claude-code" as const,
            riskLevel: "safe" as const,
            status: "completed" as const,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            projectId: queue.projectId,
          } as DispatchJob))
        );
      }
      if (queue.blockedJobIds) {
        allJobs.push(
          ...queue.blockedJobIds.map((jobId) => ({
            id: jobId,
            taskId: "unknown",
            agentId: "claude-code" as const,
            riskLevel: "safe" as const,
            status: "failed" as const,
            createdAt: new Date().toISOString(),
            retryCount: 0,
            projectId: queue.projectId,
          } as DispatchJob))
        );
      }
    }

    const kpi = aggregateKPI(allJobs, allApprovals, projectId);
    kpi.activeProjects = projectId ? 1 : state.activeProjectIds.length;

    const recentActivity = buildActivityFeed({
      jobs: allJobs,
      approvals: allApprovals,
      projectQueues: Object.values(state.queues),
      projectId,
    });

    const blockedJobs = allJobs.filter((j) => j.status === "failed");
    const blockedApprovals = allApprovals.filter((a) => a.status === "pending");

    const agentSummaries = state.agentSlots
      .filter((slot) => !projectId || slot.projectId === projectId)
      .map((slot) => ({
        agentId: slot.agentId,
        status: "available" as const,
        activeProjectIds: [slot.projectId],
        completedJobsToday: 0,
        blockedJobsToday: 0,
      }));

    return {
      kpi,
      agentSummaries,
      recentActivity,
      blockedItems: {
        jobs: blockedJobs,
        approvalRequests: blockedApprovals,
      },
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("[dashboard-snapshot-builder] Error:", error);

    return {
      kpi: {
        totalJobs: 0,
        completedJobs: 0,
        blockedJobs: 0,
        failedJobs: 0,
        pendingApprovals: 0,
        activeProjects: 0,
        safetyViolations: 0,
        avgRetryCount: 0,
        completionRate: 0,
      },
      agentSummaries: [],
      recentActivity: [],
      blockedItems: { jobs: [], approvalRequests: [] },
      generatedAt: new Date().toISOString(),
    };
  }
}
