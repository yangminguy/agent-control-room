import { ProjectOrchestrationQueue, DispatchJob, AgentSlotAllocation, ProjectRunStatus } from "@/lib/types";

export class ProjectQueueManager {
  private projectQueues: Map<string, ProjectOrchestrationQueue> = new Map();

  createProjectQueue(projectId: string, projectName: string): void {
    if (!this.projectQueues.has(projectId)) {
      this.projectQueues.set(projectId, {
        projectId,
        projectName,
        status: "idle",
        activeJobs: [],
        pendingJobs: [],
        completedJobIds: [],
        blockedJobIds: [],
        agentAllocations: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  }

  activateProject(projectId: string): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      queue.status = "active";
      queue.updatedAt = new Date().toISOString();
    }
  }

  deactivateProject(projectId: string): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      queue.status = "idle";
      queue.updatedAt = new Date().toISOString();
    }
  }

  addJobToProject(projectId: string, job: DispatchJob): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      queue.pendingJobs.push(job);
      queue.updatedAt = new Date().toISOString();
    }
  }

  moveJobToActive(projectId: string, jobId: string): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      const index = queue.pendingJobs.findIndex((j) => j.id === jobId);
      if (index >= 0) {
        const job = queue.pendingJobs.splice(index, 1)[0];
        queue.activeJobs.push(job);
        queue.updatedAt = new Date().toISOString();
      }
    }
  }

  completeJob(projectId: string, jobId: string): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      const activeIndex = queue.activeJobs.findIndex((j) => j.id === jobId);
      if (activeIndex >= 0) {
        queue.activeJobs.splice(activeIndex, 1);
      }
      if (!queue.completedJobIds.includes(jobId)) {
        queue.completedJobIds.push(jobId);
      }
      queue.updatedAt = new Date().toISOString();
    }
  }

  blockJob(projectId: string, jobId: string): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      const activeIndex = queue.activeJobs.findIndex((j) => j.id === jobId);
      const pendingIndex = queue.pendingJobs.findIndex((j) => j.id === jobId);

      if (activeIndex >= 0) {
        queue.activeJobs.splice(activeIndex, 1);
      }
      if (pendingIndex >= 0) {
        queue.pendingJobs.splice(pendingIndex, 1);
      }

      if (!queue.blockedJobIds.includes(jobId)) {
        queue.blockedJobIds.push(jobId);
      }
      queue.updatedAt = new Date().toISOString();
    }
  }

  getProjectQueue(projectId: string): ProjectOrchestrationQueue | null {
    return this.projectQueues.get(projectId) || null;
  }

  getAllQueues(): ProjectOrchestrationQueue[] {
    return Array.from(this.projectQueues.values());
  }

  getActiveQueues(): ProjectOrchestrationQueue[] {
    return Array.from(this.projectQueues.values()).filter((q) => q.status === "active");
  }

  isProjectActive(projectId: string): boolean {
    const queue = this.projectQueues.get(projectId);
    return queue ? queue.status === "active" : false;
  }

  updateQueueStatus(projectId: string, status: ProjectRunStatus): void {
    const queue = this.projectQueues.get(projectId);
    if (queue) {
      queue.status = status;
      queue.updatedAt = new Date().toISOString();
    }
  }
}
