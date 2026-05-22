import { AutoDecisionLog, MonitorValidationResult } from "@/lib/types";

export type AutoDecisionInput = {
  validationId: string;
  validationResult: MonitorValidationResult;
  autoApproveThreshold?: number;
  requireUserConfirmation?: boolean;
};

export type AutoDecisionOutcome = {
  decision: "auto_approved" | "auto_rejected" | "user_confirmation_required";
  reasoning: string;
  decisionLog: AutoDecisionLog;
};

export interface AutoDecisionEngine {
  makeDecision(input: AutoDecisionInput): AutoDecisionOutcome;
  recordUserApproval(
    decisionLog: AutoDecisionLog,
    approved: boolean,
    note?: string
  ): AutoDecisionLog;
  getAutoApprovalStats(): {
    total: number;
    autoApproved: number;
    autoRejected: number;
    userConfirmed: number;
  };
}

export class DefaultAutoDecisionEngine implements AutoDecisionEngine {
  private decisionLogs: AutoDecisionLog[] = [];
  private readonly DEFAULT_THRESHOLD = 75;

  makeDecision(input: AutoDecisionInput): AutoDecisionOutcome {
    const { validationResult, autoApproveThreshold = this.DEFAULT_THRESHOLD, requireUserConfirmation = true } = input;

    let decision: "auto_approved" | "auto_rejected" | "user_confirmation_required";
    let reasoning: string;

    // Decision logic
    if (validationResult.suggestedAction === "approve") {
      if (validationResult.confidenceScore >= autoApproveThreshold && !requireUserConfirmation) {
        decision = "auto_approved";
        reasoning = `High confidence (${validationResult.confidenceScore}/100) and no user confirmation required. Auto-approved.`;
      } else {
        decision = "user_confirmation_required";
        reasoning =
          validationResult.confidenceScore < autoApproveThreshold
            ? `Confidence (${validationResult.confidenceScore}) below threshold (${autoApproveThreshold}). Requires user confirmation.`
            : "User confirmation policy requires explicit approval.";
      }
    } else if (validationResult.suggestedAction === "reject") {
      decision = "auto_rejected";
      reasoning = `Validation rejected (confidence: ${validationResult.confidenceScore}/100). Auto-rejected without proceeding.`;
    } else {
      decision = "user_confirmation_required";
      reasoning = "Validation recommends manual review. Awaiting user confirmation.";
    }

    const decisionLog: AutoDecisionLog = {
      id: `decision-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      validationId: input.validationId,
      decision,
      decisionMaker: decision.startsWith("auto_") ? "hermes" : "user",
      timestamp: new Date().toISOString(),
    };

    this.decisionLogs.push(decisionLog);

    return {
      decision,
      reasoning,
      decisionLog,
    };
  }

  recordUserApproval(
    decisionLog: AutoDecisionLog,
    approved: boolean,
    note?: string
  ): AutoDecisionLog {
    const updated: AutoDecisionLog = {
      ...decisionLog,
      userApproval: approved,
      userNote: note,
      approvalTimestamp: new Date().toISOString(),
      decision: "user_confirmation_required", // Mark as user-confirmed
      decisionMaker: "user",
    };

    const index = this.decisionLogs.findIndex((log) => log.id === decisionLog.id);
    if (index >= 0) {
      this.decisionLogs[index] = updated;
    } else {
      this.decisionLogs.push(updated);
    }

    return updated;
  }

  getDecisionLogs(): AutoDecisionLog[] {
    return [...this.decisionLogs];
  }

  getDecisionLogsForValidation(validationId: string): AutoDecisionLog[] {
    return this.decisionLogs.filter((log) => log.validationId === validationId);
  }

  getApprovalRate(): number {
    if (this.decisionLogs.length === 0) return 0;

    const approved = this.decisionLogs.filter(
      (log) => log.decision === "auto_approved" || log.userApproval === true
    ).length;

    return (approved / this.decisionLogs.length) * 100;
  }

  getAutoApprovalStats(): {
    total: number;
    autoApproved: number;
    autoRejected: number;
    userConfirmed: number;
  } {
    const total = this.decisionLogs.length;
    const autoApproved = this.decisionLogs.filter(
      (log) => log.decision === "auto_approved"
    ).length;
    const autoRejected = this.decisionLogs.filter(
      (log) => log.decision === "auto_rejected"
    ).length;
    const userConfirmed = this.decisionLogs.filter(
      (log) => log.decision === "user_confirmation_required"
    ).length;

    return {
      total,
      autoApproved,
      autoRejected,
      userConfirmed,
    };
  }
}

let globalDecisionEngine: AutoDecisionEngine | null = null;

export function getAutoDecisionEngine(): AutoDecisionEngine {
  if (!globalDecisionEngine) {
    globalDecisionEngine = new DefaultAutoDecisionEngine();
  }
  return globalDecisionEngine;
}

export function setAutoDecisionEngine(engine: AutoDecisionEngine): void {
  globalDecisionEngine = engine;
}
