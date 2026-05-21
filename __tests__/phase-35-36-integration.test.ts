import { MultiProjectOrchestrator, setMultiProjectOrchestrator } from "@/lib/multi-project/multi-project-orchestrator";
import { AgentSlotAllocator } from "@/lib/multi-project/agent-slot-allocator";
import { ProjectQueueManager } from "@/lib/multi-project/project-queue-manager";
import { buildDashboardSnapshot } from "@/lib/dashboard/dashboard-snapshot-builder";
import { aggregateKPI } from "@/lib/dashboard/kpi-aggregator";
import { buildActivityFeed } from "@/lib/dashboard/activity-feed-builder";
import { SafeDispatchQueue } from "@/lib/dispatch/safe-dispatch-queue";
import { DispatchJob, AgentType, RiskLevel } from "@/lib/types";

function createTestJob(
  id: string,
  status: string = "queued",
  taskId: string = "task-1",
  agentId: AgentType = "claude-code",
  riskLevel: RiskLevel = "safe"
): DispatchJob {
  return {
    id,
    taskId,
    agentId,
    riskLevel,
    status: status as any,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
}

describe("Phase 35-36: Multi-Project Integration Tests", () => {
  let orchestrator: MultiProjectOrchestrator;
  let queueManager: ProjectQueueManager;
  let slotAllocator: AgentSlotAllocator;

  beforeEach(() => {
    queueManager = new ProjectQueueManager();
    slotAllocator = new AgentSlotAllocator();
    orchestrator = new MultiProjectOrchestrator(queueManager, slotAllocator);
    setMultiProjectOrchestrator(orchestrator);
  });

  describe("Agent Slot Allocation", () => {
    it("should allocate agents to projects with max concurrent constraint", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      orchestrator.allocateAgentToProject("project-1", "claude-code");
      orchestrator.allocateAgentToProject("project-1", "codex");
      orchestrator.allocateAgentToProject("project-2", "antigravity");

      const state = orchestrator.getOrchestratorState();
      expect(state.agentSlots).toHaveLength(3);
      expect(state.agentSlots.filter((s) => s.projectId === "project-1")).toHaveLength(2);
      expect(state.agentSlots.filter((s) => s.projectId === "project-2")).toHaveLength(1);
    });

    it("should enforce max concurrent projects limit", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      expect(() => {
        orchestrator.activateProject("project-3", "Project 3");
      }).toThrow(/Cannot activate more than 2 projects/);
    });

    it("should release agents from projects", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.allocateAgentToProject("project-1", "claude-code");
      orchestrator.allocateAgentToProject("project-1", "codex");

      let state = orchestrator.getOrchestratorState();
      expect(state.agentSlots).toHaveLength(2);

      orchestrator.releaseAgentFromProject("project-1", "claude-code");

      state = orchestrator.getOrchestratorState();
      expect(state.agentSlots).toHaveLength(1);
      expect(state.agentSlots[0].agentId).toBe("codex");
    });
  });

  describe("Project Queue Management", () => {
    it("should create independent queues per project", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      const job1 = createTestJob("job-1");
      const job2 = createTestJob("job-2");

      orchestrator.dispatchJobForProject("project-1", job1);
      orchestrator.dispatchJobForProject("project-2", job2);

      expect(orchestrator.getQueueSize("project-1")).toBe(1);
      expect(orchestrator.getQueueSize("project-2")).toBe(1);
    });

    it("should maintain independent job states per project", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      const job1 = createTestJob("job-1");
      const job2 = createTestJob("job-2");

      orchestrator.dispatchJobForProject("project-1", job1);
      orchestrator.dispatchJobForProject("project-2", job2);

      expect(orchestrator.getQueueSize("project-1")).toBe(1);
      expect(orchestrator.getQueueSize("project-2")).toBe(1);

      const dequeuedJob1 = orchestrator.dequeueJobForProject("project-1");
      expect(dequeuedJob1?.id).toBe("job-1");

      const dequeuedJob2 = orchestrator.dequeueJobForProject("project-2");
      expect(dequeuedJob2?.id).toBe("job-2");
    });

    it("should complete jobs independently per project", () => {
      orchestrator.activateProject("project-1", "Project 1");

      const job1 = createTestJob("job-1");
      const job2 = createTestJob("job-2");

      orchestrator.dispatchJobForProject("project-1", job1);
      orchestrator.dispatchJobForProject("project-1", job2);

      const dequeued = orchestrator.dequeueJobForProject("project-1");
      if (dequeued) {
        orchestrator.completeJobForProject("project-1", dequeued.id);
      }

      const state = orchestrator.getOrchestratorState();
      expect(state.queues["project-1"].completedJobIds.length).toBeGreaterThan(0);
    });
  });

  describe("3-Agent Same-Project Workflow", () => {
    it("should dispatch same job to 3 agents on same project", () => {
      orchestrator.activateProject("feature-xyz", "Feature XYZ");

      const agents: AgentType[] = ["claude-code", "codex", "antigravity"];
      agents.forEach((agent) => {
        orchestrator.allocateAgentToProject("feature-xyz", agent);
      });

      const state = orchestrator.getOrchestratorState();
      expect(state.agentSlots).toHaveLength(3);
      expect(state.agentSlots.every((s) => s.projectId === "feature-xyz")).toBe(true);
    });

    it("should handle concurrent job processing from 3 agents", () => {
      orchestrator.activateProject("feature-xyz", "Feature XYZ");

      const agents: AgentType[] = ["claude-code", "codex", "antigravity"];
      agents.forEach((agent) => {
        orchestrator.allocateAgentToProject("feature-xyz", agent);
      });

      const job1 = createTestJob("task-001-claude", "queued", "task-001", "claude-code");
      const job2 = createTestJob("task-001-codex", "queued", "task-001", "codex");
      const job3 = createTestJob("task-001-antigravity", "queued", "task-001", "antigravity");

      orchestrator.dispatchJobForProject("feature-xyz", job1);
      orchestrator.dispatchJobForProject("feature-xyz", job2);
      orchestrator.dispatchJobForProject("feature-xyz", job3);

      expect(orchestrator.getQueueSize("feature-xyz")).toBe(3);

      const dequeuedJob1 = orchestrator.dequeueJobForProject("feature-xyz");
      const dequeuedJob2 = orchestrator.dequeueJobForProject("feature-xyz");
      const dequeuedJob3 = orchestrator.dequeueJobForProject("feature-xyz");

      expect(dequeuedJob1).not.toBeNull();
      expect(dequeuedJob2).not.toBeNull();
      expect(dequeuedJob3).not.toBeNull();

      if (dequeuedJob1) orchestrator.completeJobForProject("feature-xyz", dequeuedJob1.id);
      if (dequeuedJob2) orchestrator.completeJobForProject("feature-xyz", dequeuedJob2.id);
      if (dequeuedJob3) orchestrator.completeJobForProject("feature-xyz", dequeuedJob3.id);

      const state = orchestrator.getOrchestratorState();
      expect(state.queues["feature-xyz"].completedJobIds).toHaveLength(3);
    });

    it("should track agent status per project independently", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      orchestrator.allocateAgentToProject("project-1", "claude-code");
      orchestrator.allocateAgentToProject("project-1", "codex");
      orchestrator.allocateAgentToProject("project-2", "antigravity");

      const state = orchestrator.getOrchestratorState();

      const project1Agents = state.agentSlots.filter((s) => s.projectId === "project-1");
      const project2Agents = state.agentSlots.filter((s) => s.projectId === "project-2");

      expect(project1Agents).toHaveLength(2);
      expect(project2Agents).toHaveLength(1);
      expect(project2Agents[0].agentId).toBe("antigravity");
    });
  });

  describe("Dashboard KPI Aggregation", () => {
    it("should aggregate KPI across multiple projects", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      const job1 = createTestJob("p1-j1", "completed");
      const job2 = createTestJob("p1-j2", "completed");
      const job3 = createTestJob("p1-j3", "failed");
      const job4 = createTestJob("p2-j1", "completed");
      const job5 = createTestJob("p2-j2", "failed");

      orchestrator.dispatchJobForProject("project-1", job1);
      orchestrator.dispatchJobForProject("project-1", job2);
      orchestrator.dispatchJobForProject("project-1", job3);
      orchestrator.dispatchJobForProject("project-2", job4);
      orchestrator.dispatchJobForProject("project-2", job5);

      const kpi = aggregateKPI([job1, job2, job3, job4, job5], [], undefined);
      expect(kpi.totalJobs).toBe(5);
      expect(kpi.completedJobs).toBe(3);
      expect(kpi.failedJobs).toBe(2);
    });
  });

  describe("Dashboard Snapshot Building", () => {
    it("should build dashboard snapshot for multi-project state", async () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.allocateAgentToProject("project-1", "claude-code");

      const job = createTestJob("job-1");
      orchestrator.dispatchJobForProject("project-1", job);

      const snapshot = await buildDashboardSnapshot(undefined);

      expect(snapshot).toHaveProperty("kpi");
      expect(snapshot).toHaveProperty("agentSummaries");
      expect(snapshot).toHaveProperty("recentActivity");
      expect(snapshot).toHaveProperty("blockedItems");
      expect(snapshot).toHaveProperty("generatedAt");
    });

    it("should filter snapshot by projectId", async () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.activateProject("project-2", "Project 2");

      orchestrator.allocateAgentToProject("project-1", "claude-code");
      orchestrator.allocateAgentToProject("project-2", "codex");

      const snapshot = await buildDashboardSnapshot("project-1");

      expect(snapshot.kpi.activeProjects).toBe(1);
      expect(snapshot.agentSummaries.every((a) => a.activeProjectIds.includes("project-1"))).toBe(true);
    });

    it("should handle empty projects gracefully", async () => {
      const snapshot = await buildDashboardSnapshot(undefined);

      expect(snapshot.kpi.totalJobs).toBe(0);
      expect(snapshot.agentSummaries).toEqual([]);
      expect(snapshot.recentActivity).toEqual([]);
      expect(snapshot.blockedItems.jobs).toEqual([]);
    });
  });

  describe("Orchestrator State Consistency", () => {
    it("should maintain consistent state across operations", () => {
      orchestrator.activateProject("project-1", "Project 1");

      const job1 = createTestJob("job-1");
      const job2 = createTestJob("job-2");

      orchestrator.dispatchJobForProject("project-1", job1);
      orchestrator.dispatchJobForProject("project-1", job2);

      let state = orchestrator.getOrchestratorState();
      expect(state.queues["project-1"].pendingJobs).toHaveLength(2);

      const dequeuedJob1 = orchestrator.dequeueJobForProject("project-1");
      state = orchestrator.getOrchestratorState();

      expect(state.queues["project-1"].activeJobs.length).toBeGreaterThan(0);

      if (dequeuedJob1) {
        orchestrator.completeJobForProject("project-1", dequeuedJob1.id);
        state = orchestrator.getOrchestratorState();
        expect(state.queues["project-1"].completedJobIds).toContain(dequeuedJob1.id);
      }
    });

    it("should maintain active project list consistency", () => {
      expect(orchestrator.getActiveProjectIds()).toHaveLength(0);

      orchestrator.activateProject("project-1", "Project 1");
      expect(orchestrator.getActiveProjectIds()).toHaveLength(1);
      expect(orchestrator.isProjectActive("project-1")).toBe(true);

      orchestrator.activateProject("project-2", "Project 2");
      expect(orchestrator.getActiveProjectIds()).toHaveLength(2);

      orchestrator.deactivateProject("project-1");
      expect(orchestrator.getActiveProjectIds()).toHaveLength(1);
      expect(orchestrator.isProjectActive("project-1")).toBe(false);
      expect(orchestrator.isProjectActive("project-2")).toBe(true);
    });

    it("should cleanup resources on project deactivation", () => {
      orchestrator.activateProject("project-1", "Project 1");
      orchestrator.allocateAgentToProject("project-1", "claude-code");
      orchestrator.allocateAgentToProject("project-1", "codex");

      let state = orchestrator.getOrchestratorState();
      expect(state.agentSlots.filter((s) => s.projectId === "project-1")).toHaveLength(2);

      orchestrator.deactivateProject("project-1");

      state = orchestrator.getOrchestratorState();
      expect(state.agentSlots.filter((s) => s.projectId === "project-1")).toHaveLength(0);
      expect(orchestrator.isProjectActive("project-1")).toBe(false);
    });
  });

  describe("Real-world Multi-Agent Scenario", () => {
    it("should handle 3-agent parallel execution on same feature", () => {
      orchestrator.activateProject("feature-auth", "Feature: Authentication");

      const agents: AgentType[] = ["claude-code", "codex", "antigravity"];
      agents.forEach((agent) => {
        orchestrator.allocateAgentToProject("feature-auth", agent);
      });

      const tasks = agents.map((agent) =>
        createTestJob(`auth-task-${agent}`, "queued", "oauth-flow", agent)
      );

      tasks.forEach((task) => {
        orchestrator.dispatchJobForProject("feature-auth", task);
      });

      expect(orchestrator.getQueueSize("feature-auth")).toBe(3);

      const results: string[] = [];
      agents.forEach((agent) => {
        const task = orchestrator.dequeueJobForProject("feature-auth");
        if (task) {
          results.push(`${agent} processing ${task.id}`);
          orchestrator.completeJobForProject("feature-auth", task.id);
        }
      });

      const state = orchestrator.getOrchestratorState();
      expect(state.queues["feature-auth"].completedJobIds).toHaveLength(3);
      expect(results).toHaveLength(3);
    });

    it("should collect results from all agents in dashboard", async () => {
      orchestrator.activateProject("feature-auth", "Feature: Authentication");

      const agents: AgentType[] = ["claude-code", "codex", "antigravity"];
      agents.forEach((agent) => {
        orchestrator.allocateAgentToProject("feature-auth", agent);
      });

      agents.forEach((agent) => {
        const job = createTestJob(`job-${agent}`, "queued", "task", agent);
        orchestrator.dispatchJobForProject("feature-auth", job);
      });

      agents.forEach(() => {
        const job = orchestrator.dequeueJobForProject("feature-auth");
        if (job) {
          orchestrator.completeJobForProject("feature-auth", job.id);
        }
      });

      const snapshot = await buildDashboardSnapshot("feature-auth");
      expect(snapshot.kpi.completedJobs).toBeGreaterThan(0);
      expect(snapshot.kpi.activeProjects).toBe(1);
      expect(snapshot.agentSummaries.length).toBeGreaterThan(0);
    });
  });
});
