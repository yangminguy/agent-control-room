/**
 * packet-builder.test.ts
 *
 * Tests for lib/hermes/packet-builder.ts — buildHermesPacket()
 * Covers: required fields, Korean pm_summary, decision field, determinism.
 */

import { describe, it, expect } from "@jest/globals";
import { buildHermesPacket } from "@/lib/hermes/packet-builder";
import type { HermesExecutionInput } from "@/lib/types";

// Minimal valid input factory
function makeInput(overrides: Partial<HermesExecutionInput> = {}): HermesExecutionInput {
  return {
    taskId: "task-abc",
    phaseId: "phase-1",
    planId: "plan-1",
    assignedAgent: "claude-code",
    executionStatus: "success",
    logSummary: "Execution completed.",
    changedFiles: ["src/app.ts"],
    checksResult: { typecheck: "pass", lint: "pass" },
    riskLevel: "low",
    exitCode: 0,
    errorMessages: [],
    allowedFiles: ["src/**"],
    doNotTouchFiles: [],
    changesExpected: true,
    ...overrides,
  };
}

// Fixed options for deterministic output
const FIXED_OPTIONS = {
  packetIdGenerator: () => "hermes-test-packet-001",
  createdAt: "2026-05-23T00:00:00.000Z",
};

describe("buildHermesPacket", () => {
  it("returns a HermesPacket with all required fields for success", () => {
    const packet = buildHermesPacket(makeInput(), FIXED_OPTIONS);

    expect(packet.packet_type).toBe("phase_success_packet");
    expect(packet.source).toBe("hermes");
    expect(packet.packet_id).toBe("hermes-test-packet-001");
    expect(packet.task_id).toBe("task-abc");
    expect(packet.phase_id).toBe("phase-1");
    expect(packet.plan_id).toBe("plan-1");
    expect(packet.assigned_agent).toBe("claude-code");
    expect(packet.execution_status).toBe("success");
    expect(packet.pm_summary).toBeDefined();
    expect(packet.recommended_next_action).toBeDefined();
    expect(packet.created_at).toBe("2026-05-23T00:00:00.000Z");
  });

  it("pm_summary is in Korean (contains Korean characters)", () => {
    const packet = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    // Korean characters are in the range 가-힣 (Hangul syllables)
    const hasKorean = /[가-힣]/.test(packet.pm_summary);
    expect(hasKorean).toBe(true);
  });

  it("decision field is present and is a valid DecisionLabel", () => {
    const packet = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    const validLabels = ["pass", "fail", "qa_needed", "retry_needed", "blocked", "drift_detected", "manual_review"];
    expect(validLabels).toContain(packet.decision);
  });

  it("decision matches classifier output for a clean success", () => {
    const packet = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    expect(packet.decision).toBe("pass");
  });

  it("decision_reason is defined and non-empty", () => {
    const packet = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    expect(packet.decision_reason).toBeTruthy();
  });

  it("confidence is a number between 0 and 100", () => {
    const packet = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    expect(typeof packet.confidence).toBe("number");
    expect(packet.confidence).toBeGreaterThanOrEqual(0);
    expect(packet.confidence).toBeLessThanOrEqual(100);
  });

  it("packet is deterministic given the same input and fixed options", () => {
    const packet1 = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    const packet2 = buildHermesPacket(makeInput(), FIXED_OPTIONS);
    expect(packet1).toEqual(packet2);
  });

  it("failure input → phase_failure_packet with decision field", () => {
    const input = makeInput({
      executionStatus: "failure",
      failureReason: "Tests failed",
      exitCode: 1,
      errorMessages: ["Tests failed with exit 1"],
    });
    const packet = buildHermesPacket(input, {
      ...FIXED_OPTIONS,
      packetIdGenerator: () => "hermes-failure-001",
    });

    expect(packet.packet_type).toBe("phase_failure_packet");
    expect(packet.decision).toBeDefined();
    expect(packet.pm_summary).toBeTruthy();
    const hasKorean = /[가-힣]/.test(packet.pm_summary);
    expect(hasKorean).toBe(true);
  });

  it("drift input → drift_detection_packet", () => {
    const input = makeInput({
      executionStatus: "drift",
      driftFiles: ["lib/unauthorized.ts"],
    });
    const packet = buildHermesPacket(input, FIXED_OPTIONS);

    expect(packet.packet_type).toBe("drift_detection_packet");
    if (packet.packet_type === "drift_detection_packet") {
      expect(packet.drift_files).toContain("lib/unauthorized.ts");
    }
  });

  it("needs_approval input → approval_request_packet", () => {
    const input = makeInput({
      executionStatus: "needs_approval",
      approvalReason: "High risk change",
    });
    const packet = buildHermesPacket(input, FIXED_OPTIONS);

    expect(packet.packet_type).toBe("approval_request_packet");
    if (packet.packet_type === "approval_request_packet") {
      expect(packet.approval_reason).toContain("High risk change");
    }
  });
});
