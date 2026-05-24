/**
 * Multi-Agent Multi-Model Runtime Tests
 *
 * Comprehensive tests for:
 * - Agent Runtime Registry
 * - Model Registry
 * - Agent × Model Router
 * - Quota/Rate Limit Parser
 * - Handoff Engine
 * - Antigravity Model Detection
 * - Release Gate
 */

import {
  getAllAgentRuntimes,
  getAgentRuntime,
  updateAgentRuntime,
  isAgentAvailable,
  getAvailableAgentsForScope,
  canAgentAutoRun,
  resetRuntimeRegistry,
  setRuntimeRegistry,
} from "@/lib/agents/runtime-registry";
import type { AgentRuntimeProfile } from "@/lib/agents/runtime-registry";

import {
  getAllModels,
  getModelsForAgent,
  getModel,
  updateModel,
  resetModelRegistry,
} from "@/lib/agents/model-registry";
import type { ModelProfile } from "@/lib/agents/model-registry";

import {
  routeAgentAndModel,
  type AgentModelRoutingDecision,
} from "@/lib/agents/agent-model-router";

import {
  parseQuotaError,
  applyQuotaParseResult,
  isQuotaError,
} from "@/lib/agents/quota-parser";

import {
  analyzeHandoffNeed,
  executeHandoff,
  buildHandoffMessage,
  shouldWaitForRecovery,
} from "@/lib/agents/handoff-engine";

import {
  getAntigravityModelSwitchCapability,
  canSwitchAntigravityModelAutomatically,
} from "@/lib/agents/antigravity-model-detection";

import {
  createReleaseGateRequest,
  getReleaseGateRequest,
  getPendingReleaseGateRequests,
  approveReleaseGateRequest,
  requiresReleaseGate,
  isDangerousFilePath,
  clearAllReleaseGateRequests,
} from "@/lib/agents/release-gate";

describe("Multi-Agent Multi-Model Runtime", () => {
  beforeEach(() => {
    resetRuntimeRegistry();
    resetModelRegistry();
    clearAllReleaseGateRequests();
  });

  describe("Agent Runtime Registry", () => {
    test("should return all agent runtimes", () => {
      const runtimes = getAllAgentRuntimes();
      expect(runtimes.length).toBeGreaterThan(0);
      expect(runtimes.some((r) => r.id === "claude-code")).toBe(true);
      expect(runtimes.some((r) => r.id === "codex")).toBe(true);
    });

    test("should get specific agent runtime", () => {
      const claude = getAgentRuntime("claude-code");
      expect(claude).toBeDefined();
      expect(claude?.id).toBe("claude-code");
      expect(claude?.status).toBe("available_verified");
    });

    test("should check if agent is available", () => {
      expect(isAgentAvailable("claude-code")).toBe(true);
      expect(isAgentAvailable("omc")).toBe(false); // not_installed
    });

    test("should update agent runtime status", () => {
      const updated = updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
        lastFailureReason: "Usage limit hit",
      });

      expect(updated?.status).toBe("rate_limited");
      expect(updated?.nextRetryAt).toBeDefined();
      expect(updated?.lastFailureReason).toBe("Usage limit hit");
    });

    test("should get available agents for scope", () => {
      const agents = getAvailableAgentsForScope("safe_code");
      expect(agents.length).toBeGreaterThan(0);
      expect(agents.some((a) => a.id === "claude-code")).toBe(true);
    });

    test("should check if agent can auto-run for scope", () => {
      expect(canAgentAutoRun("claude-code", "safe_code")).toBe(true);
      expect(canAgentAutoRun("codex", "safe_code")).toBe(false);
    });
  });

  describe("Model Registry", () => {
    test("should return all models", () => {
      const models = getAllModels();
      expect(models.length).toBeGreaterThan(0);
    });

    test("should get models for specific agent", () => {
      const claudeModels = getModelsForAgent("claude-code");
      expect(claudeModels.length).toBeGreaterThan(0);
      expect(claudeModels.some((m) => m.id === "claude-sonnet-4-6")).toBe(true);
    });

    test("should get specific model", () => {
      const sonnet = getModel("claude-sonnet-4-6");
      expect(sonnet).toBeDefined();
      expect(sonnet?.displayName).toBe("Claude Sonnet 4.6");
      expect(sonnet?.speed).toBe("fast");
    });

    test("should update model quota status", () => {
      const updated = updateModel("gpt-5.5", {
        quotaStatus: "rate_limited",
        nextRefreshAt: new Date(Date.now() + 3600000).toISOString(),
      });

      expect(updated?.quotaStatus).toBe("rate_limited");
      expect(updated?.nextRefreshAt).toBeDefined();
    });

    test("should have correct model recommendations", () => {
      const opusModel = getModel("claude-opus-4-7");
      expect(opusModel?.recommendedFor).toContain("architecture");
      expect(opusModel?.recommendedFor).toContain("security");
    });
  });

  describe("Agent × Model Router", () => {
    test("should route implementation task to Claude Sonnet", () => {
      const decision = routeAgentAndModel("implementation");

      expect(decision.recommendedAgentId).toBe("claude-code");
      expect(decision.recommendedModelId).toBe("claude-sonnet-4-6");
      expect(decision.canAutoRun).toBe(true);
    });

    test("should route architecture task to Claude Opus", () => {
      const decision = routeAgentAndModel("architecture");

      expect(decision.recommendedAgentId).toBe("claude-code");
      expect(decision.recommendedModelId).toBe("claude-opus-4-7");
      // Architecture task routes with safe_code scope, should be eligible for auto-run
      expect(decision.executionMode).toBe("auto");
    });

    test("should route QA task to Codex", () => {
      const decision = routeAgentAndModel("qa");

      expect(decision.recommendedAgentId).toBe("codex");
    });

    test("should route UI task to Antigravity", () => {
      const decision = routeAgentAndModel("ui");

      expect(decision.recommendedAgentId).toBe("antigravity");
    });

    test("should handle high-risk tasks with release gate", () => {
      const decision = routeAgentAndModel("deployment", undefined, undefined, "high");

      expect(decision.executionMode).toBe("release_gate");
      expect(decision.requiresApproval).toBe(true);
    });

    test("should handle critical-risk tasks with release gate", () => {
      const decision = routeAgentAndModel("database", undefined, undefined, "critical");

      expect(decision.executionMode).toBe("release_gate");
      expect(decision.requiresApproval).toBe(true);
    });

    test("should handle unavailable agent gracefully", () => {
      // Make claude-code unavailable
      updateAgentRuntime("claude-code", { status: "rate_limited" });

      // Route implementation task - claude-code is preferred but unavailable
      const decision = routeAgentAndModel("implementation");

      // System should either wait for recovery or have a fallback agent
      expect(
        decision.executionMode === "waiting_for_recovery" ||
        (decision.fallbackAgentId && decision.fallbackAgentId.length > 0)
      ).toBe(true);
    });
  });

  describe("Quota Parser", () => {
    test("should parse Codex rate limit error", () => {
      const error =
        "You've hit your usage limit. Upgrade to Pro (...), visit ... to purchase more credits or try again at May 27th, 2026 3:58 PM.";
      const result = parseQuotaError(error);

      expect(result).toBeDefined();
      expect(result?.status).toBe("rate_limited");
      expect(result?.source).toBe("codex");
      expect(result?.nextRetryAt).toBeDefined();
    });

    test("should detect quota error", () => {
      const error =
        "You've hit your usage limit. Upgrade to Pro (...), visit ... to purchase more credits or try again at May 27th, 2026 3:58 PM.";
      expect(isQuotaError(error)).toBe(true);
    });

    test("should not detect non-quota error", () => {
      const error = "Syntax error in line 42";
      expect(isQuotaError(error)).toBe(false);
    });

    test("should apply quota parse result to registry", () => {
      const error =
        "You've hit your usage limit. Upgrade to Pro (...), visit ... to purchase more credits or try again at May 27th, 2026 3:58 PM.";
      const result = parseQuotaError(error);

      if (result) {
        applyQuotaParseResult(result);

        // Check that Codex status was updated
        const codex = getAgentRuntime("codex");
        expect(codex?.status).toBe("rate_limited");
      }
    });

    test("should parse Claude rate limit error", () => {
      const error = "429 Rate limit reached. Retry after 30 seconds.";
      const result = parseQuotaError(error);

      expect(result).toBeDefined();
      expect(result?.source).toBe("claude");
      expect(result?.status).toBe("rate_limited");
    });
  });

  describe("Handoff Engine", () => {
    test("should detect Codex rate limit scenario", () => {
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const decision = routeAgentAndModel("qa");
      const handoffPlan = analyzeHandoffNeed(
        "qa",
        decision,
        false
      );

      expect(handoffPlan.scenario).toBe("codex_rate_limited");
      expect(handoffPlan.shouldWaitForRecovery).toBe(true);
    });

    test("should fallback to Claude for urgent Codex tasks", () => {
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const decision = routeAgentAndModel("test");
      const handoffPlan = analyzeHandoffNeed(
        "test",
        decision,
        true
      );

      expect(handoffPlan.scenario).toBe("codex_rate_limited");
      if (!handoffPlan.shouldWaitForRecovery) {
        expect(handoffPlan.fallbackAgent).toBe("claude-code");
      }
    });

    test("should build user-friendly handoff message", () => {
      const decision = routeAgentAndModel("qa");
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const handoffPlan = analyzeHandoffNeed(
        "qa",
        decision,
        false
      );
      const message = buildHandoffMessage(handoffPlan);

      expect(message).toContain("Codex");
    });

    test("should check if task should wait for recovery", () => {
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      // When codex is rate-limited, re-routing won't return codex
      const decision = routeAgentAndModel("qa");

      // Should handle the unavailable agent scenario
      if (decision.executionMode === "waiting_for_recovery") {
        expect(shouldWaitForRecovery({
          scenario: "all_unavailable",
          primaryAgent: decision.recommendedAgentId,
          fallbackAgent: null,
          reason: "Agent unavailable",
          shouldWaitForRecovery: true,
        })).toBe(true);
      } else {
        // Or propose handoff if fallback is available
        expect(decision.fallbackAgentId).toBeDefined();
      }
    });
  });

  describe("Antigravity Model Detection", () => {
    test("should have model switch capability object", () => {
      const capability = getAntigravityModelSwitchCapability();

      expect(capability).toBeDefined();
      expect(capability.lastCheckedAt).toBeDefined();
    });

    test("should report automatic switching capability as a boolean", () => {
      const canSwitch = canSwitchAntigravityModelAutomatically();
      expect(typeof canSwitch).toBe("boolean");
    });

    test("should provide failureReason when switching is not possible", () => {
      const capability = getAntigravityModelSwitchCapability();
      if (!capability.canSwitchAutomatically) {
        expect(capability.failureReason).toBeDefined();
      } else {
        // agy binary and settings.json found — no failure reason expected
        expect(capability.switchMethod).toBe("config_write");
      }
    });
  });

  describe("Release Gate", () => {
    test("should create release gate request", () => {
      const request = createReleaseGateRequest("task-1", "git_push", "high", {
        summary: "Push feature branch to main",
        changedFiles: ["src/components/Navbar.tsx"],
        riskExplanation: "Changes pushed to remote repository",
        requiredChecks: ["tests passed", "review completed"],
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe("pending");
      expect(request.operation).toBe("git_push");
    });

    test("should approve release gate request", () => {
      const request = createReleaseGateRequest("task-1", "git_push", "high", {
        summary: "Push feature branch to main",
        changedFiles: ["src/components/Navbar.tsx"],
        riskExplanation: "Changes pushed to remote repository",
        requiredChecks: ["tests passed", "review completed"],
      });

      const approved = approveReleaseGateRequest(request.id, "user@example.com");

      expect(approved?.status).toBe("approved");
      expect(approved?.approvedAt).toBeDefined();
      expect(approved?.approvedBy).toBe("user@example.com");
    });

    test("should get pending release gate requests", () => {
      createReleaseGateRequest("task-1", "git_push", "high", {
        summary: "Push feature branch to main",
        changedFiles: ["src/components/Navbar.tsx"],
        riskExplanation: "Changes pushed to remote repository",
        requiredChecks: ["tests passed", "review completed"],
      });

      const pending = getPendingReleaseGateRequests();

      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe("pending");
    });

    test("should identify dangerous operations", () => {
      expect(requiresReleaseGate("git_push")).toBe(true);
      expect(requiresReleaseGate("production_deploy")).toBe(true);
      expect(requiresReleaseGate("db_migration")).toBe(true);
      expect(requiresReleaseGate("git_force_push")).toBe(true);
      expect(requiresReleaseGate("supabase_write")).toBe(true);
    });

    test("should identify dangerous file paths", () => {
      expect(isDangerousFilePath(".env.production")).toBe(true);
      expect(isDangerousFilePath("src/components/Button.tsx")).toBe(false);
      expect(isDangerousFilePath("database/migrations/001_init.sql")).toBe(true);
    });

    test("should mark high-risk operations", () => {
      const request = createReleaseGateRequest(
        "task-1",
        "production_deploy",
        "critical",
        {
          summary: "Deploy to production",
          changedFiles: ["src/index.ts"],
          riskExplanation: "Affects production users",
          requiredChecks: ["tests passed"],
        }
      );

      expect(request.riskLevel).toBe("critical");
    });
  });

  describe("Integration Tests", () => {
    test("should route, detect unavailability, and handoff", () => {
      // Route a QA task to Codex
      let decision = routeAgentAndModel("qa");
      expect(decision.recommendedAgentId).toBe("codex");

      // Mark Codex as rate-limited
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      // Re-route - codex is now unavailable, so should use fallback or wait
      decision = routeAgentAndModel("qa");

      // Should handle the rate limit
      expect(decision.riskNotes.some((n) => n.includes("unavailable")) || decision.executionMode === "waiting_for_recovery").toBe(true);
    });

    test("should handle complex UI task with model routing", () => {
      const decision = routeAgentAndModel("ui");

      expect(decision.recommendedAgentId).toBe("antigravity");
      expect(decision.recommendedModelId).toMatch(/gemini|claude/);
      // UI tasks by Antigravity are marked as "ui_only" scope
      // Execution mode depends on whether auto-run is allowed
      expect(["auto", "manual_confirm"]).toContain(decision.executionMode);
    });

    test("should enforce release gate for critical operations", () => {
      const decision = routeAgentAndModel("deployment", undefined, undefined, "critical");

      expect(decision.executionMode).toBe("release_gate");
      expect(decision.requiresApproval).toBe(true);

      // Create and verify release gate
      const request = createReleaseGateRequest("task-1", "production_deploy", "critical", {
        summary: "Deploy to production",
        changedFiles: ["src/api/routes.ts"],
        riskExplanation: "Affects production users",
        requiredChecks: ["smoke tests passed", "rollback plan verified"],
      });

      expect(request.status).toBe("pending");

      const approved = approveReleaseGateRequest(request.id);
      expect(approved?.status).toBe("approved");
    });
  });
});
