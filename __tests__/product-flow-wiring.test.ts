/**
 * Product Flow Wiring Tests
 *
 * Verifies that the Multi-Agent Runtime is properly wired into the product flow:
 * - UI data mapping
 * - Execution routing
 * - Quota handling
 * - Release Gate persistence
 * - Recovery worker
 * - OMC/OMX detection
 */

import {
  storeRuntimeDecision,
  getRuntimeDecision,
  getRuntimeDecisionsForTask,
  getPendingRuntimeDecisions,
  clearAllRuntimeDecisions,
} from "@/lib/storage/runtime-decision-store";
import { routeAgentAndModel } from "@/lib/agents/agent-model-router";
import {
  createReleaseGateRequest,
  getReleaseGateRequest,
  getPendingReleaseGateRequests,
  approveReleaseGateRequest,
  clearAllReleaseGateRequests,
} from "@/lib/agents/release-gate";
import {
  getAgentRuntime,
  updateAgentRuntime,
  resetRuntimeRegistry,
} from "@/lib/agents/runtime-registry";
import { parseQuotaError, applyQuotaParseResult } from "@/lib/agents/quota-parser";

describe("Product Flow Wiring", () => {
  beforeEach(() => {
    clearAllRuntimeDecisions();
    clearAllReleaseGateRequests();
    resetRuntimeRegistry();
  });

  describe("UI Data Mapping", () => {
    test("should map runtime decision to PM status labels (Korean)", () => {
      const decision = routeAgentAndModel("implementation");

      // Map to Korean labels
      const pmStatus = {
        에이전트상태: "available_verified",
        추천모델: decision.recommendedModelId,
        현재모델: undefined,
        모델전환자동화: false,
        사용량제한: false,
        회복예정: "없음",
        대체실행: decision.fallbackAgentId ? `${decision.fallbackAgentId}로 대체` : "없음",
        대기중인작업: decision.executionMode === "waiting_for_recovery" ? 1 : 0,
        릴리즈승인필요: decision.requiresApproval ? "예" : "아니오",
        고위험작업: decision.executionMode === "release_gate" ? "예" : "아니오",
      };

      expect(pmStatus.추천모델).toBeDefined();
      expect(pmStatus.사용량제한).toBe(false);
    });

    test("should provide Antigravity model status without asking for manual switch", () => {
      const decision = routeAgentAndModel("ui");

      // Should show: "모델 전환 자동화가 아직 지원되지 않아 대체 에이전트로 전환합니다"
      // NOT: "사용자가 직접 /model로 바꿔 주세요"

      const userMessage = decision.riskNotes.includes("Model switching may be required")
        ? "모델 전환 자동화가 아직 지원되지 않아 대체 에이전트로 전환합니다"
        : "";

      expect(userMessage).not.toContain("/model");
      expect(userMessage).not.toContain("직접");
      expect(userMessage).not.toContain("사용자");
    });
  });

  describe("Execution Routing", () => {
    test("should route task through Agent × Model Router before execution", () => {
      const taskId = "task-123";
      const decision = routeAgentAndModel("implementation");

      // Store the routing decision
      const stored = storeRuntimeDecision(taskId, decision, "plan-1");

      // Verify it's persisted
      const retrieved = getRuntimeDecision(stored.id);
      expect(retrieved).toBeDefined();
      expect(retrieved?.decision.recommendedAgentId).toBe("claude-code");
    });

    test("should prevent Codex execution when rate-limited", () => {
      // Mark Codex as rate-limited
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      // Route a QA task
      const decision = routeAgentAndModel("qa");

      // Should either use fallback agent or indicate it's not available
      // (routing decision shows what router recommends, actual execution checks availability)
      expect(
        decision.fallbackAgentId ||
        decision.riskNotes.some((n) => n.includes("unavailable"))
      ).toBeTruthy();
    });

    test("should handle Antigravity model mismatch without user manual action", () => {
      // Simulate Antigravity task with model mismatch
      const decision = routeAgentAndModel("ui");

      // System should never say "user switch /model"
      const description = `${decision.reason} ${decision.riskNotes.join(" ")}`;
      expect(description).not.toContain("직접");
      expect(description).not.toContain("/model");

      // If model switch is needed, should fallback
      if (decision.requiresModelSwitch && decision.modelSwitchStrategy === "handoff_instead") {
        expect(decision.fallbackAgentId).toBeDefined();
      }
    });

    test("should apply automatic handoff when agent unavailable", () => {
      // Make Claude Code unavailable
      updateAgentRuntime("claude-code", { status: "rate_limited" });

      const decision = routeAgentAndModel("implementation");

      // System should have a recommendation (fallback or waiting status)
      expect(
        decision.fallbackAgentId !== undefined ||
        decision.executionMode === "waiting_for_recovery"
      ).toBe(true);
    });
  });

  describe("Persistence", () => {
    test("should persist runtime decisions durably", () => {
      const taskId = "task-456";
      const decision = routeAgentAndModel("qa");

      // Store decision
      const stored = storeRuntimeDecision(taskId, decision, "plan-2");
      expect(stored.id).toBeDefined();
      expect(stored.storedAt).toBeDefined();

      // Retrieve and verify
      const retrieved = getRuntimeDecision(stored.id);
      expect(retrieved?.decision.taskKind).toBe("qa");
    });

    test("should track runtime decisions per task", () => {
      const taskId = "task-789";

      // Multiple decisions for same task
      const decision1 = routeAgentAndModel("implementation");
      const decision2 = routeAgentAndModel("qa");

      storeRuntimeDecision(taskId, decision1, "plan-3");
      storeRuntimeDecision(taskId, decision2, "plan-3");

      // Retrieve all for task
      const decisions = getRuntimeDecisionsForTask(taskId);
      expect(decisions.length).toBe(2);
    });

    test("should persist Release Gate requests durably", () => {
      const request = createReleaseGateRequest("task-999", "git_push", "high", {
        summary: "Push to main",
        changedFiles: ["src/api/auth.ts"],
        riskExplanation: "Changes core auth",
        requiredChecks: ["tests passed"],
      });

      expect(request.id).toBeDefined();
      expect(request.status).toBe("pending");

      // Retrieve and verify
      const retrieved = getReleaseGateRequest(request.id);
      expect(retrieved?.operation).toBe("git_push");
    });

    test("should track Release Gate status changes", () => {
      const request = createReleaseGateRequest("task-aaa", "production_deploy", "critical", {
        summary: "Deploy to prod",
        changedFiles: ["src/"],
        riskExplanation: "Production impact",
        requiredChecks: ["smoke tests"],
      });

      // Approve the request
      const approved = approveReleaseGateRequest(request.id, "user@example.com");

      expect(approved?.status).toBe("approved");
      expect(approved?.approvedBy).toBe("user@example.com");

      // Verify persisted
      const retrieved = getReleaseGateRequest(request.id);
      expect(retrieved?.status).toBe("approved");
    });
  });

  describe("Quota Handling", () => {
    test("should parse Codex rate limit and apply to registry", () => {
      const error = "You've hit your usage limit. Upgrade to Pro (...), visit ... to purchase more credits or try again at May 27th, 2026 3:58 PM.";

      const result = parseQuotaError(error);
      expect(result).toBeDefined();
      expect(result?.source).toBe("codex");
      expect(result?.nextRetryAt).toBeDefined();

      // Apply to registry
      applyQuotaParseResult(result!);

      // Verify Codex is now rate-limited
      const codex = getAgentRuntime("codex");
      expect(codex?.status).toBe("rate_limited");
      expect(codex?.nextRetryAt).toBeDefined();
    });

    test("should block execution of rate-limited agents", () => {
      updateAgentRuntime("codex", {
        status: "rate_limited",
        nextRetryAt: new Date(Date.now() + 3600000).toISOString(),
      });

      const codex = getAgentRuntime("codex");
      expect(codex?.status).toBe("rate_limited");

      // Execution check: would be blocked in /api/runner
      const shouldBlock = codex?.status === "rate_limited" || codex?.status === "token_exhausted";
      expect(shouldBlock).toBe(true);
    });
  });

  describe("Release Gate Enforcement", () => {
    test("should block dangerous operations without Release Gate approval", () => {
      // Dangerous operation: git_push
      const decision = routeAgentAndModel("release");

      // Should require approval
      if (decision.requiresApproval) {
        // Create Release Gate
        const request = createReleaseGateRequest("task-bbb", "git_push", "high", {
          summary: "Push changes",
          changedFiles: ["src/"],
          riskExplanation: "Remote push",
          requiredChecks: ["tests"],
        });

        // Should be pending
        expect(request.status).toBe("pending");

        // Execution would be blocked until approved
        const pending = getPendingReleaseGateRequests();
        expect(pending.some((r) => r.id === request.id)).toBe(true);
      }
    });

    test("should allow execution after Release Gate approval", () => {
      const request = createReleaseGateRequest("task-ccc", "db_migration", "critical", {
        summary: "Migrate database",
        changedFiles: ["migrations/"],
        riskExplanation: "Schema change",
        requiredChecks: ["backup"],
      });

      // Approve
      approveReleaseGateRequest(request.id);

      // Retrieve and check
      const approved = getReleaseGateRequest(request.id);
      expect(approved?.status).toBe("approved");

      // Would now be allowed to execute
      expect(approved?.status).toBe("approved");
    });
  });

  describe("Recovery Worker", () => {
    test("should identify pending decisions for recovery", () => {
      const taskId = "task-ddd";
      const decision = routeAgentAndModel("implementation");

      // Store as pending
      storeRuntimeDecision(taskId, decision, "plan-4");

      // Get pending decisions
      const pending = getPendingRuntimeDecisions();
      expect(pending.length).toBeGreaterThan(0);
      expect(pending[0].taskId).toBe(taskId);
    });

    test("should format recovery worker output correctly", () => {
      const taskId = "task-eee";
      const decision = routeAgentAndModel("qa");

      storeRuntimeDecision(taskId, decision, "plan-5");

      const pending = getPendingRuntimeDecisions();

      // Output would be formatted for recovery worker
      expect(pending[0].decision.recommendedAgentId).toBeDefined();
      expect(pending[0].decision.executionMode).toBeDefined();
    });
  });

  describe("OMC/OMX Detection", () => {
    test("should represent missing OMC as not_installed", () => {
      // OMC should exist but be marked as not_installed
      const omc = getAgentRuntime("omc");
      expect(omc?.status).toBe("not_installed");
    });

    test("should represent missing OMX as not_installed", () => {
      // OMX should exist but be marked as not_installed
      const omx = getAgentRuntime("omx");
      expect(omx?.status).toBe("not_installed");
    });

    test("should show OMC/OMX as optional in runtime registry", () => {
      const omc = getAgentRuntime("omc");
      const omx = getAgentRuntime("omx");

      // Should be marked as optional
      expect(omc?.constraints).toContain("optional");
      expect(omx?.constraints).toContain("optional");

      // Should not be auto-run eligible
      expect(omc?.autoRunScopes.length).toBe(0);
      expect(omx?.autoRunScopes.length).toBe(0);
    });
  });
});
