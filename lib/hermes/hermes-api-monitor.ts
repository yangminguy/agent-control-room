import { getGeminiClient } from "./gemini-client";

type ApiAlert = {
  type: "api_failure" | "consecutive_failures" | "recovery";
  severity: "warning" | "critical";
  message: string;
  timestamp: string;
  failureCount: number;
};

class HermesApiMonitor {
  private alerts: ApiAlert[] = [];
  private lastAlertTime: number = 0;
  private alertThrottleMs = 5000; // 5초마다 최대 1회 알림

  checkHealth(): { isHealthy: boolean; status: string; alert?: ApiAlert } {
    const client = getGeminiClient();
    const status = client.getStatus();

    // 연속 실패가 3회 이상이면 critical
    if (status.consecutiveFailures >= 3) {
      const now = Date.now();
      if (now - this.lastAlertTime > this.alertThrottleMs) {
        const alert: ApiAlert = {
          type: "consecutive_failures",
          severity: "critical",
          message: `⚠️ Hermes API ${status.consecutiveFailures}회 연속 실패 - Primary/Secondary 모두 응답 없음`,
          timestamp: new Date().toISOString(),
          failureCount: status.failureCount,
        };
        this.alerts.push(alert);
        this.lastAlertTime = now;
        return {
          isHealthy: false,
          status: "critical",
          alert,
        };
      }
    }

    // 1회 이상 실패하면 warning
    if (status.consecutiveFailures > 0) {
      return {
        isHealthy: false,
        status: "degraded",
      };
    }

    // 정상
    if (status.failureCount > 0 && status.consecutiveFailures === 0) {
      // 이전 실패에서 복구됨
      const alert: ApiAlert = {
        type: "recovery",
        severity: "warning",
        message: "✅ Hermes API 정상화됨",
        timestamp: new Date().toISOString(),
        failureCount: status.failureCount,
      };
      this.alerts.push(alert);
    }

    return {
      isHealthy: true,
      status: "healthy",
    };
  }

  getAlerts(): ApiAlert[] {
    return this.alerts.slice(-10); // 최근 10개
  }

  getStatus() {
    const client = getGeminiClient();
    return client.getStatus();
  }

  reset() {
    const client = getGeminiClient();
    client.resetStatus();
    this.alerts = [];
    this.lastAlertTime = 0;
  }
}

let monitor: HermesApiMonitor | null = null;

export function getHermesMonitor(): HermesApiMonitor {
  if (!monitor) {
    monitor = new HermesApiMonitor();
  }
  return monitor;
}
