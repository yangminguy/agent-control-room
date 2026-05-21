import { ErrorRecoveryLog, DispatchJob } from "@/lib/types";
import { classifyError, calculateRetryDelay, DEFAULT_RETRY_POLICY } from "./retry-policy";

export type RecoveryStrategy = "retry" | "escalate" | "manual_review" | "skip";

export interface ErrorRecoveryManager {
  recordError(job: DispatchJob, error: Error, attemptNumber: number): ErrorRecoveryLog;
  determineRecoveryStrategy(recoveryLog: ErrorRecoveryLog): RecoveryStrategy;
  scheduleRetry(recoveryLog: ErrorRecoveryLog, job: DispatchJob): Promise<void>;
}

export class DefaultErrorRecoveryManager implements ErrorRecoveryManager {
  private recoveryLogs: ErrorRecoveryLog[] = [];

  recordError(job: DispatchJob, error: Error, attemptNumber: number): ErrorRecoveryLog {
    const classification = classifyError(error.message, error.name);
    const policy = DEFAULT_RETRY_POLICY;

    const recoveryLog: ErrorRecoveryLog = {
      id: `recovery-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      jobId: job.id,
      errorMessage: error.message,
      errorCode: error.name,
      attemptNumber,
      recoveryAction: "retry",
      timestamp: new Date().toISOString(),
    };

    // If retryable and attempts remain
    if (classification.isRetryable && attemptNumber < policy.maxRetries) {
      const delayMs = calculateRetryDelay(attemptNumber, policy);
      recoveryLog.nextRetryAt = new Date(
        Date.now() + delayMs
      ).toISOString();
      recoveryLog.recoveryAction = "retry";
    } else if (!classification.isRetryable) {
      recoveryLog.recoveryAction = "escalate";
    } else {
      recoveryLog.recoveryAction = "manual_review";
    }

    this.recoveryLogs.push(recoveryLog);
    return recoveryLog;
  }

  determineRecoveryStrategy(recoveryLog: ErrorRecoveryLog): RecoveryStrategy {
    const action = recoveryLog.recoveryAction;
    if (action === "retry" && recoveryLog.nextRetryAt) {
      const nextTime = new Date(recoveryLog.nextRetryAt).getTime();
      const now = Date.now();
      if (nextTime <= now) {
        return "retry";
      }
    }
    if (action === "escalate") return "escalate";
    if (action === "manual_review") return "manual_review";
    return "skip";
  }

  async scheduleRetry(recoveryLog: ErrorRecoveryLog, job: DispatchJob): Promise<void> {
    if (!recoveryLog.nextRetryAt) {
      throw new Error("Recovery log has no nextRetryAt scheduled");
    }

    const delayMs =
      new Date(recoveryLog.nextRetryAt).getTime() - Date.now();
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    // Mark as resolved
    recoveryLog.resolvedAt = new Date().toISOString();
  }

  getRecoveryLogs(): ErrorRecoveryLog[] {
    return [...this.recoveryLogs];
  }

  getRecoveryLogsForJob(jobId: string): ErrorRecoveryLog[] {
    return this.recoveryLogs.filter((log) => log.jobId === jobId);
  }
}

let globalRecoveryManager: ErrorRecoveryManager | null = null;

export function getErrorRecoveryManager(): ErrorRecoveryManager {
  if (!globalRecoveryManager) {
    globalRecoveryManager = new DefaultErrorRecoveryManager();
  }
  return globalRecoveryManager;
}

export function setErrorRecoveryManager(manager: ErrorRecoveryManager): void {
  globalRecoveryManager = manager;
}
