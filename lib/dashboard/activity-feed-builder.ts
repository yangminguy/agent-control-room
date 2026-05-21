import { DispatchJob, ApprovalRequest, ProjectOrchestrationQueue, DashboardActivityEvent } from "@/lib/types";

export function buildActivityFeed(config: {
  jobs: DispatchJob[];
  approvals: ApprovalRequest[];
  projectQueues: ProjectOrchestrationQueue[];
  projectId?: string;
}): DashboardActivityEvent[] {
  const events: DashboardActivityEvent[] = [];

  const filteredJobs = config.projectId
    ? config.jobs.filter((j) => (j as any).projectId === config.projectId)
    : config.jobs;

  const filteredApprovals = config.projectId
    ? config.approvals.filter((a) => (a as any).projectId === config.projectId)
    : config.approvals;

  filteredJobs.forEach((job) => {
    const event = buildActivityEventFromJob(job);
    if (event) events.push(event);
  });

  filteredApprovals.forEach((approval) => {
    const event = buildActivityEventFromApproval(approval);
    if (event) events.push(event);
  });

  config.projectQueues.forEach((queue) => {
    if (config.projectId && queue.projectId !== config.projectId) return;

    if (queue.status === "active") {
      events.push({
        id: `event-project-activated-${queue.projectId}`,
        timestamp: queue.createdAt,
        eventType: "project_activated",
        projectId: queue.projectId,
        projectName: queue.projectName,
        detail: `Project "${queue.projectName}" activated`,
      });
    }
  });

  return events.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 20);
}

export function buildActivityEventFromJob(job: DispatchJob): DashboardActivityEvent | null {
  const projectId = (job as any).projectId || "unknown";

  if (job.status === "completed") {
    return {
      id: `event-job-completed-${job.id}`,
      timestamp: job.completedAt || new Date().toISOString(),
      eventType: "job_completed",
      projectId,
      agentId: job.agentId,
      detail: `Job ${job.id} completed`,
    };
  }

  if (job.status === "failed") {
    return {
      id: `event-job-failed-${job.id}`,
      timestamp: new Date().toISOString(),
      eventType: "job_blocked",
      projectId,
      detail: `Job ${job.id} failed`,
    };
  }

  return null;
}

export function buildActivityEventFromApproval(approval: ApprovalRequest): DashboardActivityEvent | null {
  if (approval.status === "pending") {
    return {
      id: `event-approval-required-${approval.id}`,
      timestamp: approval.createdAt,
      eventType: "approval_required",
      detail: `Approval required for job ${approval.dispatchJobId}`,
    };
  }

  return null;
}
