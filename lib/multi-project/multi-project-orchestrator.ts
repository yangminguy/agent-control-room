import { SafeDispatchQueue } from "@/lib/dispatch/safe-dispatch-queue";
import { AgentSlotAllocator } from "./agent-slot-allocator";
import { ProjectQueueManager } from "./project-queue-manager";
import { DispatchJob, MultiProjectOrchestratorState, ProjectOrchestrationQueue, AgentType } from "@/lib/types";

export class MultiProjectOrchestrator {
  private queues: Map<string, SafeDispatchQueue> = new Map();
  private queueManager: ProjectQueueManager;
  private slotAllocator: AgentSlotAllocator;
  private activeProjectIds: string[] = [];
  private maxConcurrentProjects = 2;

  constructor(queueManager?: ProjectQueueManager, slotAllocator?: AgentSlotAllocator) {
    this.queueManager = queueManager || new ProjectQueueManager();
    this.slotAllocator = slotAllocator || new AgentSlotAllocator();
  }

  activateProject(projectId: string, projectName: string): void {
    if (this.activeProjectIds.length >= this.maxConcurrentProjects) {
      throw new Error(
        `Cannot activate more than ${this.maxConcurrentProjects} projects. Active: ${this.activeProjectIds.join(", ")}`
      );
    }

    if (!this.queueManager.getProjectQueue(projectId)) {
      this.queueManager.createProjectQueue(projectId, projectName);
    }

    if (!this.queues.has(projectId)) {
      this.queues.set(projectId, new SafeDispatchQueue());
    }

    this.queueManager.activateProject(projectId);
    this.activeProjectIds.push(projectId);
  }

  deactivateProject(projectId: string): void {
    const index = this.activeProjectIds.indexOf(projectId);
    if (index >= 0) {
      this.activeProjectIds.splice(index, 1);
    }

    this.queueManager.deactivateProject(projectId);
    this.slotAllocator.releaseProjectSlots(projectId);
  }

  dispatchJobForProject(projectId: string, job: DispatchJob): void {
    const queue = this.queues.get(projectId);
    if (!queue) {
      throw new Error(`Project ${projectId} is not activated`);
    }

    this.queueManager.addJobToProject(projectId, job);
    queue.addJob(job);
  }

  allocateAgentToProject(projectId: string, agentId: AgentType): void {
    this.slotAllocator.allocateAgent(projectId, agentId);

    const queue = this.queueManager.getProjectQueue(projectId);
    if (queue) {
      const allocations = this.slotAllocator.getProjectAllocations(projectId);
      queue.agentAllocations = allocations;
    }
  }

  releaseAgentFromProject(projectId: string, agentId: AgentType): void {
    this.slotAllocator.releaseAgent(projectId, agentId);

    const queue = this.queueManager.getProjectQueue(projectId);
    if (queue) {
      const allocations = this.slotAllocator.getProjectAllocations(projectId);
      queue.agentAllocations = allocations;
    }
  }

  getProjectQueue(projectId: string): SafeDispatchQueue | null {
    return this.queues.get(projectId) || null;
  }

  getNextJobForProject(projectId: string): DispatchJob | null {
    const queue = this.queues.get(projectId);
    return queue?.getNextJob("queued") || null;
  }

  dequeueJobForProject(projectId: string): DispatchJob | null {
    const queue = this.queues.get(projectId);
    if (!queue) return null;

    const job = queue.getNextJob("queued");
    if (job) {
      queue.updateJobStatus(job.id, "running");
      this.queueManager.moveJobToActive(projectId, job.id);
      return job;
    }
    return null;
  }

  completeJobForProject(projectId: string, jobId: string): void {
    this.queueManager.completeJob(projectId, jobId);
  }

  blockJobForProject(projectId: string, jobId: string): void {
    this.queueManager.blockJob(projectId, jobId);
  }

  getOrchestratorState(): MultiProjectOrchestratorState {
    return {
      activeProjectIds: [...this.activeProjectIds],
      maxConcurrentProjects: this.maxConcurrentProjects,
      queues: Object.fromEntries(
        this.activeProjectIds
          .map((id) => [id, this.queueManager.getProjectQueue(id)])
          .filter(([, q]) => q !== null) as [string, ProjectOrchestrationQueue][]
      ),
      agentSlots: this.slotAllocator.getAllAllocations(),
    };
  }

  getActiveProjectIds(): string[] {
    return [...this.activeProjectIds];
  }

  isProjectActive(projectId: string): boolean {
    return this.activeProjectIds.includes(projectId);
  }

  getQueueSize(projectId: string): number {
    const queue = this.queues.get(projectId);
    const stats = queue?.getStats();
    return stats?.total || 0;
  }

  getAllQueueSizes(): Record<string, number> {
    const sizes: Record<string, number> = {};
    this.activeProjectIds.forEach((id) => {
      sizes[id] = this.getQueueSize(id);
    });
    return sizes;
  }
}

let globalOrchestrator: MultiProjectOrchestrator | null = null;

export function getMultiProjectOrchestrator(): MultiProjectOrchestrator {
  if (!globalOrchestrator) {
    globalOrchestrator = new MultiProjectOrchestrator();
  }
  return globalOrchestrator;
}

export function setMultiProjectOrchestrator(orchestrator: MultiProjectOrchestrator): void {
  globalOrchestrator = orchestrator;
}
