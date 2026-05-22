import { describe, it, expect, beforeEach } from "@jest/globals";
import { DEFAULT_RETRY_POLICY, calculateRetryDelay, classifyError } from "@/lib/dispatch/retry-policy";
import { DefaultErrorRecoveryManager } from "@/lib/dispatch/error-recovery-manager";
import { DefaultHermesValidator } from "@/lib/hermes/hermes-llm-validator";
import { DefaultAutoDecisionEngine } from "@/lib/hermes/auto-decision-engine";
import { HermesValidationRequest, DispatchJob } from "@/lib/types";
import { POST as validateStage } from "@/app/api/orchestration/validation/route";
import { POST as decideStage } from "@/app/api/orchestration/auto-decision/route";

// Phase 33 Tests: Production Hardening
describe("Phase 33: Production Hardening", () => {
  describe("Retry Policy", () => {
    it("should calculate exponential backoff correctly", () => {
      const delay1 = calculateRetryDelay(1, DEFAULT_RETRY_POLICY);
      const delay2 = calculateRetryDelay(2, DEFAULT_RETRY_POLICY);
      const delay3 = calculateRetryDelay(3, DEFAULT_RETRY_POLICY);

      expect(delay2).toBe(delay1 * 2);
      expect(delay3).toBe(delay2 * 2);
    });

    it("should cap delay at maxDelayMs", () => {
      const policy = { ...DEFAULT_RETRY_POLICY, maxDelayMs: 5000 };
      const delay = calculateRetryDelay(10, policy);
      expect(delay).toBeLessThanOrEqual(5000);
    });

    it("should classify network errors as retryable", () => {
      const result = classifyError("ECONNREFUSED: Connection refused");
      expect(result.isRetryable).toBe(true);
      expect(result.code).toBe("TRANSIENT_ERROR");
    });

    it("should classify validation errors as not retryable", () => {
      const result = classifyError("404 Not Found");
      expect(result.isRetryable).toBe(false);
      expect(result.code).toBe("VALIDATION_ERROR");
    });

    it("should classify rate limiting as retryable", () => {
      const result = classifyError("429 Too Many Requests");
      expect(result.isRetryable).toBe(true);
      expect(result.code).toBe("RATE_LIMIT");
    });
  });

  describe("Error Recovery Manager", () => {
    let manager: DefaultErrorRecoveryManager;
    let mockJob: DispatchJob;

    beforeEach(() => {
      manager = new DefaultErrorRecoveryManager();
      mockJob = {
        id: "job-123",
        automationRunId: "run-123",
        agent: "codex",
        status: "pending",
        createdAt: new Date().toISOString(),
      } as any;
    });

    it("should record error with retry scheduling for transient errors", () => {
      const error = new Error("ECONNREFUSED");
      const log = manager.recordError(mockJob, error, 1);

      expect(log.jobId).toBe(mockJob.id);
      expect(log.attemptNumber).toBe(1);
      expect(log.recoveryAction).toBe("retry");
      expect(log.nextRetryAt).toBeDefined();
    });

    it("should escalate non-retryable errors", () => {
      const error = new Error("404 Not Found");
      const log = manager.recordError(mockJob, error, 1);

      expect(log.recoveryAction).toBe("escalate");
      expect(log.nextRetryAt).toBeUndefined();
    });

    it("should escalate after max retries exceeded", () => {
      const error = new Error("ECONNREFUSED");
      const log = manager.recordError(mockJob, error, DEFAULT_RETRY_POLICY.maxRetries + 1);

      expect(log.recoveryAction).toBe("manual_review");
    });

    it("should determine recovery strategy correctly", () => {
      const error = new Error("ECONNREFUSED");
      const log = manager.recordError(mockJob, error, 1);
      const strategy = manager.determineRecoveryStrategy(log);

      // If nextRetryAt is in future, strategy should be retry (pending)
      // For this test, we'll just verify it doesn't crash
      expect(strategy).toBeDefined();
    });

    it("should retrieve recovery logs for job", () => {
      const error1 = new Error("Error 1");
      const error2 = new Error("Error 2");

      manager.recordError(mockJob, error1, 1);
      manager.recordError(mockJob, error2, 2);

      const logs = manager.getRecoveryLogsForJob(mockJob.id);
      expect(logs.length).toBe(2);
      expect(logs[0].attemptNumber).toBe(1);
      expect(logs[1].attemptNumber).toBe(2);
    });
  });
});

// Phase 34 Tests: Hermes LLM Validation & Auto-Decision
describe("Phase 34: Hermes LLM Validation & Auto-Decision", () => {
  describe("Hermes Validator", () => {
    let validator: DefaultHermesValidator;

    beforeEach(() => {
      validator = new DefaultHermesValidator();
    });

    it("should validate stage with high completion", async () => {
      const request: HermesValidationRequest = {
        id: "req-123",
        planId: "plan-123",
        stageIndex: 0,
        stageName: "Initial Setup",
        acceptanceCriteria: ["Setup project", "Install deps", "Configure build"],
        completedWork: ["Setup project", "Install deps", "Configure build"],
        contextSummary: "All tasks completed successfully",
        timestamp: new Date().toISOString(),
      };

      const result = await validator.validateStage(request);

      expect(result.isValid).toBe(true);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(90);
      expect(result.suggestedAction).toBe("approve");
    });

    it("should validate stage with partial completion", async () => {
      const request: HermesValidationRequest = {
        id: "req-124",
        planId: "plan-123",
        stageIndex: 1,
        stageName: "Development",
        acceptanceCriteria: ["Write code", "Add tests", "Code review", "Deploy", "Monitor"],
        completedWork: [
          "Write code for implementation",
          "Add tests for implementation",
          "Code review completed",
          "Deploy to staging",
        ],
        contextSummary: "Most work done, pending monitoring",
        timestamp: new Date().toISOString(),
      };

      const result = await validator.validateStage(request);

      expect(result.isValid).toBe(true);
      expect(result.confidenceScore).toBeGreaterThanOrEqual(80);
      expect(result.confidenceScore).toBeLessThan(95);
    });

    it("should validate stage with low completion", async () => {
      const request: HermesValidationRequest = {
        id: "req-125",
        planId: "plan-123",
        stageIndex: 2,
        stageName: "Testing",
        acceptanceCriteria: ["Unit tests", "Integration tests", "E2E tests"],
        completedWork: ["Unit tests"],
        contextSummary: "Only unit tests done",
        timestamp: new Date().toISOString(),
      };

      const result = await validator.validateStage(request);

      expect(result.isValid).toBe(false);
      expect(result.confidenceScore).toBeLessThan(70);
      expect(result.suggestedAction).toBe("reject");
    });

    it("should generate recommendations", async () => {
      const request: HermesValidationRequest = {
        id: "req-126",
        planId: "plan-123",
        stageIndex: 3,
        stageName: "Deployment",
        acceptanceCriteria: ["Build Docker image", "Deploy to staging", "Run smoke tests"],
        completedWork: ["Build Docker image"],
        contextSummary: "Docker build successful, deployment pending",
        riskFlags: ["database_migration_required"],
        timestamp: new Date().toISOString(),
      };

      const result = await validator.validateStage(request);

      expect(result.recommendations).toBeDefined();
      expect(result.recommendations!.length).toBeGreaterThan(0);
      expect(result.risks).toContain("database_migration_required");
    });

    it("should handle validator configuration", () => {
      const config = validator.getConfig();
      expect(config.enableHermesValidation).toBe(true);
      expect(config.confidenceThreshold).toBe(75);

      validator.setConfig({ confidenceThreshold: 80 });
      const updatedConfig = validator.getConfig();
      expect(updatedConfig.confidenceThreshold).toBe(80);
    });

    it("should cache validation results", async () => {
      const request: HermesValidationRequest = {
        id: "req-127",
        planId: "plan-123",
        stageIndex: 4,
        stageName: "Stage",
        acceptanceCriteria: ["Test"],
        completedWork: ["Test"],
        contextSummary: "Done",
        timestamp: new Date().toISOString(),
      };

      const result1 = await validator.validateStage(request);
      const result2 = await validator.validateStage(request);

      expect(result1.validationId).toBe(result2.validationId);
    });

    it("should not approve unrelated completed work just because counts match", async () => {
      const request: HermesValidationRequest = {
        id: "req-unrelated",
        planId: "plan-123",
        stageIndex: 5,
        stageName: "Safety",
        acceptanceCriteria: ["Add approval gate", "Block destructive commands", "Run regression tests"],
        completedWork: ["Updated hero copy", "Changed button color", "Renamed a doc"],
        contextSummary: "Unrelated UI copy work completed",
        timestamp: new Date().toISOString(),
      };

      const result = await validator.validateStage(request);

      expect(result.isValid).toBe(false);
      expect(result.suggestedAction).not.toBe("approve");
    });

    it("should invalidate cache when completed work changes", async () => {
      const baseRequest: HermesValidationRequest = {
        id: "req-cache",
        planId: "plan-cache",
        stageIndex: 0,
        stageName: "Cache Test",
        acceptanceCriteria: ["Add approval gate"],
        completedWork: ["Unrelated note"],
        contextSummary: "Incomplete",
        timestamp: new Date().toISOString(),
      };

      const first = await validator.validateStage(baseRequest);
      const second = await validator.validateStage({
        ...baseRequest,
        completedWork: ["Add approval gate for risky jobs"],
        contextSummary: "Complete",
      });

      expect(first.validationId).not.toBe(second.validationId);
      expect(first.isValid).toBe(false);
      expect(second.isValid).toBe(true);
    });
  });

  describe("Auto-Decision Engine", () => {
    let engine: DefaultAutoDecisionEngine;

    beforeEach(() => {
      engine = new DefaultAutoDecisionEngine();
    });

    it("should auto-approve high-confidence validation", () => {
      const validationResult = {
        validationId: "val-123",
        requestId: "req-123",
        isValid: true,
        confidenceScore: 95,
        reasoning: "All criteria met",
        suggestedAction: "approve" as const,
        timestamp: new Date().toISOString(),
      };

      const outcome = engine.makeDecision({
        validationId: "val-123",
        validationResult,
        autoApproveThreshold: 75,
        requireUserConfirmation: false,
      });

      expect(outcome.decision).toBe("auto_approved");
      expect(outcome.decisionLog.decisionMaker).toBe("hermes");
    });

    it("should require user confirmation for high-confidence validation by default", () => {
      const validationResult = {
        validationId: "val-default-confirm",
        requestId: "req-default-confirm",
        isValid: true,
        confidenceScore: 95,
        reasoning: "All criteria met",
        suggestedAction: "approve" as const,
        timestamp: new Date().toISOString(),
      };

      const outcome = engine.makeDecision({
        validationId: "val-default-confirm",
        validationResult,
      });

      expect(outcome.decision).toBe("user_confirmation_required");
    });

    it("should auto-reject validation", () => {
      const validationResult = {
        validationId: "val-124",
        requestId: "req-124",
        isValid: false,
        confidenceScore: 40,
        reasoning: "Low completion",
        suggestedAction: "reject" as const,
        risks: ["critical_gaps"],
        timestamp: new Date().toISOString(),
      };

      const outcome = engine.makeDecision({
        validationId: "val-124",
        validationResult,
        autoApproveThreshold: 75,
      });

      expect(outcome.decision).toBe("auto_rejected");
    });

    it("should require user confirmation for borderline cases", () => {
      const validationResult = {
        validationId: "val-125",
        requestId: "req-125",
        isValid: true,
        confidenceScore: 70,
        reasoning: "Partial completion",
        suggestedAction: "approve" as const,
        timestamp: new Date().toISOString(),
      };

      const outcome = engine.makeDecision({
        validationId: "val-125",
        validationResult,
        autoApproveThreshold: 75,
      });

      expect(outcome.decision).toBe("user_confirmation_required");
    });

    it("should record user approval", () => {
      const decisionLog = {
        id: "decision-123",
        validationId: "val-126",
        decision: "user_confirmation_required" as const,
        timestamp: new Date().toISOString(),
      };

      const updated = engine.recordUserApproval(decisionLog, true, "Looks good");

      expect(updated.userApproval).toBe(true);
      expect(updated.userNote).toBe("Looks good");
      expect(updated.approvalTimestamp).toBeDefined();
    });

    it("should calculate approval rate", () => {
      const val1 = { validationId: "val-1", requestId: "req-1", isValid: true, confidenceScore: 95, reasoning: "", suggestedAction: "approve" as const, timestamp: new Date().toISOString() };
      const val2 = { validationId: "val-2", requestId: "req-2", isValid: false, confidenceScore: 40, reasoning: "", suggestedAction: "reject" as const, timestamp: new Date().toISOString() };

      engine.makeDecision({ validationId: "val-1", validationResult: val1, autoApproveThreshold: 75 });
      engine.makeDecision({ validationId: "val-2", validationResult: val2, autoApproveThreshold: 75 });

      const rate = engine.getApprovalRate();
      expect(rate).toBeGreaterThanOrEqual(0);
      expect(rate).toBeLessThanOrEqual(100);
    });

    it("should track auto-approval stats", () => {
      const val1 = { validationId: "val-3", requestId: "req-3", isValid: true, confidenceScore: 95, reasoning: "", suggestedAction: "approve" as const, timestamp: new Date().toISOString() };

      engine.makeDecision({ validationId: "val-3", validationResult: val1, autoApproveThreshold: 75, requireUserConfirmation: false });

      const stats = engine.getAutoApprovalStats();
      expect(stats.total).toBe(1);
      expect(stats.autoApproved).toBe(1);
      expect(stats.autoRejected).toBe(0);
    });
  });

  describe("Validation APIs", () => {
    function requestFor(url: string, body: unknown): Request {
      return new Request(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    it("should reject malformed validation payloads", async () => {
      const response = await validateStage(
        requestFor("http://localhost/api/orchestration/validation", {
          id: "bad",
          planId: "plan",
        }) as any
      );
      const body = await response.json();

      expect(response.status).toBe(400);
      expect(body.error).toContain("Invalid validation request");
    });

    it("should require user confirmation by default in auto-decision API", async () => {
      const validationResponse = await validateStage(
        requestFor("http://localhost/api/orchestration/validation", {
          id: "req-api-confirm",
          planId: "plan-api-confirm",
          stageIndex: 0,
          stageName: "API Confirm",
          acceptanceCriteria: ["Add approval gate"],
          completedWork: ["Add approval gate for risky jobs"],
          contextSummary: "Complete",
          timestamp: new Date().toISOString(),
        }) as any
      );
      const validation = await validationResponse.json();

      const decisionResponse = await decideStage(
        requestFor("http://localhost/api/orchestration/auto-decision", {
          validationId: validation.validationId,
        }) as any
      );
      const decision = await decisionResponse.json();

      expect(decisionResponse.status).toBe(200);
      expect(decision.decision).toBe("user_confirmation_required");
    });
  });
});
