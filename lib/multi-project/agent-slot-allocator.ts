import { AgentSlotAllocation, AgentType } from "@/lib/types";

export class AgentSlotAllocator {
  private allocations: AgentSlotAllocation[] = [];
  private maxConcurrentProjects = 2;

  allocateAgent(projectId: string, agentId: AgentType): void {
    const allocation: AgentSlotAllocation = {
      projectId,
      agentId,
      allocatedAt: new Date().toISOString(),
    };
    this.allocations.push(allocation);
  }

  releaseAgent(projectId: string, agentId: AgentType): void {
    this.allocations = this.allocations.filter(
      (a) => !(a.projectId === projectId && a.agentId === agentId)
    );
  }

  getProjectAllocations(projectId: string): AgentSlotAllocation[] {
    return this.allocations.filter((a) => a.projectId === projectId);
  }

  getAvailableAgentsForProject(projectId: string): AgentType[] {
    const allocated = this.getProjectAllocations(projectId).map((a) => a.agentId);
    const allAgents: AgentType[] = ["claude-code", "codex", "antigravity"];
    return allAgents.filter((agent) => !allocated.includes(agent));
  }

  getSlotUsage(): Record<string, number> {
    const usage: Record<string, number> = {};
    this.allocations.forEach((a) => {
      usage[a.projectId] = (usage[a.projectId] || 0) + 1;
    });
    return usage;
  }

  releaseProjectSlots(projectId: string): void {
    this.allocations = this.allocations.filter((a) => a.projectId !== projectId);
  }

  getAllAllocations(): AgentSlotAllocation[] {
    return [...this.allocations];
  }
}
