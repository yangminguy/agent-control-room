import { DispatchJob, ApprovalRequest, DashboardKPI } from "@/lib/types";

export function aggregateKPI(
  jobs: DispatchJob[],
  approvals: ApprovalRequest[],
  projectId?: string
): DashboardKPI {
  const filteredJobs = projectId
    ? jobs.filter((j) => (j as any).projectId === projectId)
    : jobs;
  const filteredApprovals = projectId
    ? approvals.filter((a) => (a as any).projectId === projectId)
    : approvals;

  const totalJobs = filteredJobs.length;
  const completedJobs = filteredJobs.filter((j) => j.status === "completed").length;
  const blockedJobs = filteredJobs.filter((j) => j.status === "failed").length;
  const failedJobs = filteredJobs.filter((j) => j.status === "failed").length;
  const pendingApprovals = filteredApprovals.filter((a) => a.status === "pending").length;

  const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
  const avgRetryCount =
    totalJobs > 0 ? filteredJobs.reduce((sum, j) => sum + j.retryCount, 0) / totalJobs : 0;

  return {
    totalJobs,
    completedJobs,
    blockedJobs,
    failedJobs,
    pendingApprovals,
    activeProjects: projectId ? 1 : 0,
    safetyViolations: 0,
    avgRetryCount,
    completionRate,
  };
}

export function filterJobsByProject(jobs: DispatchJob[], projectId: string): DispatchJob[] {
  return jobs.filter((j) => (j as any).projectId === projectId);
}

export function calculateCompletionRate(jobs: DispatchJob[]): number {
  if (jobs.length === 0) return 0;
  const completed = jobs.filter((j) => j.status === "completed").length;
  return Math.round((completed / jobs.length) * 100);
}

export function getBlockedJobs(jobs: DispatchJob[]): DispatchJob[] {
  return jobs.filter((j) => j.status === "failed");
}

export function getPendingApprovals(approvals: ApprovalRequest[]): ApprovalRequest[] {
  return approvals.filter((a) => a.status === "pending");
}

export function getFailedJobs(jobs: DispatchJob[]): DispatchJob[] {
  return jobs.filter((j) => j.status === "failed");
}
