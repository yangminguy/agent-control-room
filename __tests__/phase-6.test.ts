/**
 * Phase 6 Tests: Intelligent Routing & Agent Composition
 *
 * T023: Agent Capability Inventory
 * T024: Dynamic Agent Selection Router
 * T025: Agent Composition Executor
 */

import { intelligentRoute, mapToExternalAgent } from "@/lib/routing/intelligent-router";
import { createCompositionPlan, generateCompositionPrompt, getCompositionSummary } from "@/lib/routing/agent-composition";
import agentProfiles from "@/data/agent-profiles.json";

describe("Phase 6: Intelligent Routing & Agent Composition", () => {
  // ──────────────────────────────────────────────────────────
  // T023: Agent Capability Inventory
  // ──────────────────────────────────────────────────────────

  describe("T023: Agent Capability Inventory", () => {
    it("should have a substantial agent profile inventory", () => {
      expect(agentProfiles.agents.length).toBeGreaterThanOrEqual(40);
    });

    it("each agent should have required fields", () => {
      agentProfiles.agents.forEach((agent) => {
        expect(agent.agent_id).toBeDefined();
        expect(agent.aliases).toBeDefined();
        expect(agent.specializations.length).toBeGreaterThan(0);
        expect(agent.best_for.length).toBeGreaterThan(0);
        expect(agent.avoid_when.length).toBeGreaterThan(0);
        expect(agent.estimated_tokens).toBeGreaterThan(0);
        expect(agent.estimated_time_minutes).toBeGreaterThan(0);
        expect(agent.success_rate).toBeGreaterThanOrEqual(0.75);
        expect(agent.success_rate).toBeLessThanOrEqual(1.0);
      });
    });

    it("should have valid categories", () => {
      const { categories } = agentProfiles.metadata;
      expect(Object.keys(categories).length).toBeGreaterThan(0);

      // 모든 agent가 최소 한 category에 속해야 함
      const allAgentsInCategories = Object.values(categories)
        .flat()
        .filter((v, i, a) => a.indexOf(v) === i);

      expect(allAgentsInCategories.length).toBe(agentProfiles.agents.length);
    });

    it("should have unique agent IDs", () => {
      const ids = agentProfiles.agents.map((a) => a.agent_id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  // ──────────────────────────────────────────────────────────
  // T024: Dynamic Agent Selection Router
  // ──────────────────────────────────────────────────────────

  describe("T024: Dynamic Agent Selection Router", () => {
    it("should route UI design task correctly", () => {
      const task = "Create a new dark mode toggle component with accessibility support";
      const result = intelligentRoute(task);

      expect(result.primary).toBeDefined();
      expect(result.primary.confidence).toBeGreaterThan(0);
      expect(result.primary.agent_id).toBeDefined();

      // UI-related agents should be recommended
      expect(
        ["ui-designer", "frontend-developer", "react-specialist", "accessibility-tester"].includes(
          result.primary.agent_id,
        ),
      ).toBe(true);
    });

    it("should route backend task correctly", () => {
      const task = "Implement REST API endpoint for user authentication with JWT tokens";
      const result = intelligentRoute(task);

      expect(result.primary).toBeDefined();
      expect(
        ["backend-developer", "nextjs-developer", "typescript-pro", "postgres-pro"].includes(
          result.primary.agent_id,
        ),
      ).toBe(true);
    });

    it("should recommend secondary agents", () => {
      const task = "Refactor legacy authentication module and add comprehensive tests";
      const result = intelligentRoute(task);

      expect(Array.isArray(result.secondary)).toBe(true);
    });

    it("should provide composition agents for complex tasks", () => {
      const task =
        "Design and implement a new dashboard with performance metrics, accessibility, and comprehensive test coverage";
      const result = intelligentRoute(task);

      expect(result.composition.length).toBeGreaterThan(0);
      expect(result.executionOrder.length).toBeGreaterThanOrEqual(result.composition.length);
    });

    it("should estimate tokens and time", () => {
      const task = "Add caching layer to the database queries";
      const result = intelligentRoute(task);

      expect(result.primary.estimated_tokens).toBeGreaterThan(0);
      expect(result.primary.estimated_time_minutes).toBeGreaterThan(0);
      expect(result.totalEstimatedTokens).toBeGreaterThanOrEqual(result.primary.estimated_tokens);
    });

    it("should respect success rates", () => {
      const task = "Optimize PostgreSQL queries for production database";
      const result = intelligentRoute(task);

      expect(result.primary.success_rate).toBeGreaterThan(0.75);
      result.secondary.forEach((secondary) => {
        expect(secondary.success_rate).toBeGreaterThan(0.75);
      });
    });

    it("should return executable order", () => {
      const task = "Build full-stack feature: API + UI + tests + docs";
      const result = intelligentRoute(task);

      expect(result.executionOrder).toBeDefined();
      expect(result.executionOrder.length).toBeGreaterThan(0);
      expect(result.executionOrder).toContain(result.primary.agent_id);
    });

    it("should map to external agents correctly", () => {
      expect(mapToExternalAgent("backend-developer")).toBe("codex");
      expect(mapToExternalAgent("react-specialist")).toBe("codex");
      expect(mapToExternalAgent("ui-designer")).toBe("antigravity");
      expect(mapToExternalAgent("data-analyst")).toBe("claude-code");
    });
  });

  // ──────────────────────────────────────────────────────────
  // T025: Agent Composition Executor
  // ──────────────────────────────────────────────────────────

  describe("T025: Agent Composition Executor", () => {
    it("should create composition plan from routing result", () => {
      const task = "Build a new admin dashboard with UI, backend API, tests, and documentation";
      const routing = intelligentRoute(task);

      const composition = createCompositionPlan(routing, "Admin Dashboard", task, "plan-123");

      expect(composition.primaryTask).toBeDefined();
      expect(composition.primaryTask.title).toBe("Admin Dashboard");
      expect(composition.primaryTask.status).toBe("ready");
      expect(composition.primaryTask.assignedAgent).toBeDefined();
      expect(["claude-code", "codex", "antigravity"].includes(composition.primaryTask.assignedAgent)).toBe(true);
    });

    it("should include all agents as sub-agent tracks", () => {
      const routing = intelligentRoute("Complex task");
      const composition = createCompositionPlan(routing, "Complex Task", "Complex task", "plan-123");

      expect(composition.subTracks.length).toBeGreaterThan(0);
      expect(composition.primaryTask.subAgentTracks.length).toBe(composition.subTracks.length);
    });

    it("should set execution order in sub-agent tracks", () => {
      const routing = intelligentRoute("Task with dependencies");
      const composition = createCompositionPlan(routing, "Task", "Task", "plan-123");

      composition.subTracks.forEach((track) => {
        expect(track.executionOrder).toBeDefined();
        expect(track.executionOrder).toBeGreaterThanOrEqual(0);
      });
    });

    it("should calculate total estimated tokens and time", () => {
      const routing = intelligentRoute("Multi-agent task");
      const composition = createCompositionPlan(routing, "Task", "Task", "plan-123");

      expect(composition.totalEstimatedTokens).toBeGreaterThan(0);
      expect(composition.totalEstimatedTime).toBeGreaterThan(0);
      expect(composition.totalEstimatedTokens).toBeGreaterThanOrEqual(routing.totalEstimatedTokens);
    });

    it("should generate copy-ready composition prompt", () => {
      const routing = intelligentRoute("Build feature");
      const composition = createCompositionPlan(routing, "Feature", "Build feature", "plan-123");

      const prompt = generateCompositionPrompt(composition, "TestProject", "Test context");

      expect(prompt).toContain("멀티-에이전트");
      expect(prompt).toContain("Feature");
      expect(prompt).toContain("TestProject");
      expect(prompt).toContain("실행 순서");
      expect(prompt).toContain("소요 시간");
    });

    it("should provide composition summary", () => {
      const routing = intelligentRoute("Task");
      const composition = createCompositionPlan(routing, "Task", "Task", "plan-123");

      const summary = getCompositionSummary(composition);

      expect(summary).toContain("멀티-에이전트");
      expect(summary).toContain("분 소요");
    });

    it("should accept all composition plans", () => {
      const composition = createCompositionPlan(
        intelligentRoute("Any task"),
        "Title",
        "Description",
        "plan-123",
      );

      expect(composition.primaryTask.acceptanceCriteria.length).toBeGreaterThan(0);
      composition.primaryTask.acceptanceCriteria.forEach((criteria) => {
        expect(criteria).toBeTruthy();
      });
    });
  });

  // ──────────────────────────────────────────────────────────
  // Integration Tests
  // ──────────────────────────────────────────────────────────

  describe("Phase 6 Integration", () => {
    it("should handle end-to-end routing → composition flow", () => {
      const userTask = "Redesign user authentication flow with new security measures, update UI, and add comprehensive tests";

      // T024: Route task
      const routing = intelligentRoute(userTask);
      expect(routing.primary).toBeDefined();

      // T025: Create composition
      const composition = createCompositionPlan(routing, "Auth Redesign", userTask, "plan-456");
      expect(composition.primaryTask).toBeDefined();

      // Generate prompt
      const prompt = generateCompositionPrompt(composition, "MyApp", "Authentication system");
      expect(prompt).toContain("Auth Redesign");
      expect(prompt).toContain("Authentication system");

      // Verify execution order
      expect(composition.executionSequence.length).toBeGreaterThan(0);
      expect(composition.executionSequence).toContain(routing.primary.agent_id);
    });

    it("should handle variety of task types", () => {
      const tasks = [
        "Fix bug in login form",
        "Design new landing page",
        "Optimize database queries",
        "Add dark mode support",
        "Write API documentation",
        "Implement caching layer",
      ];

      tasks.forEach((task) => {
        const routing = intelligentRoute(task);
        expect(routing.primary).toBeDefined();
        expect(routing.primary.confidence).toBeGreaterThanOrEqual(0);

        const composition = createCompositionPlan(routing, task, task, "plan-123");
        expect(composition.primaryTask).toBeDefined();
        expect(composition.totalEstimatedTime).toBeGreaterThan(0);
      });
    });

    it("should scale with complex multi-agent compositions", () => {
      const complexTask =
        "Build enterprise-grade feature: design system audit, full-stack implementation, automated QA, accessibility testing, performance optimization, documentation generation, and knowledge synthesis";

      const routing = intelligentRoute(complexTask);
      expect(routing.composition.length).toBeGreaterThan(0);

      const composition = createCompositionPlan(routing, "Enterprise Feature", complexTask, "plan-789");

      expect(composition.subTracks.length).toBeGreaterThanOrEqual(routing.composition.length + 1);
      expect(composition.totalEstimatedTokens).toBeGreaterThan(50000); // Complex task
    });
  });
});
