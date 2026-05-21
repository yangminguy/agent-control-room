// Hermes Monitoring Layer
// Pure functions only — no fetch, spawn, exec, or writeFile.
// Hermes does not execute code; it monitors and summarizes.

import type { RoadmapStage } from "@/lib/types";

// ─── Enriched execution log view for Hermes monitoring ────────────────────────
// The base ExecutionLog in lib/types.ts tracks raw runner state.
// HermesExecutionLog is a higher-level view produced after result analysis.
export interface HermesExecutionLog {
  taskId: string;
  taskTitle: string;
  agentType: string;
  completionJudgment: "completed" | "partial" | "not_completed" | "pending";
  completedAt: string;          // ISO timestamp
  agentOutput?: string;         // Captured stdout/summary
  changedFiles?: string[];
  failureReason?: string;
  agentStatus?: string;         // e.g. "token_limited", "blocked"
}

// ─── Public types ──────────────────────────────────────────────────────────────

export interface ExecutionMonitorSummary {
  recentExecutions: {
    taskId: string;
    taskTitle: string;
    agent: string;
    status: "done" | "failed" | "partial";
    completedAt: string;
    judgment: string;
  }[];
  blockedIssues: {
    taskId: string;
    reason: string;
    blockedSince: string;
    requiredAction: string;
  }[];
  riskSignals: string[];
  recommendedActions: string[];
  lastUpdated: string;
}

// ─── Internal helpers ──────────────────────────────────────────────────────────

function toStatus(
  judgment: HermesExecutionLog["completionJudgment"],
): "done" | "failed" | "partial" {
  if (judgment === "completed") return "done";
  if (judgment === "partial") return "partial";
  return "failed";
}

function detectRiskSignals(logs: HermesExecutionLog[]): string[] {
  const signals: string[] = [];

  // Consecutive failure detection — look at last 5 entries
  const last5 = logs.slice(-5);
  const failedCount = last5.filter(
    (l) => l.completionJudgment === "not_completed",
  ).length;
  if (failedCount >= 2) {
    signals.push(`${failedCount}회 연속 실패 — 디버그 필요`);
  }

  // Token limit detection
  const tokenLimited = logs.find((l) =>
    l.agentStatus?.includes("token_limited"),
  );
  if (tokenLimited) {
    signals.push("토큰 한계 도달 — Context Pack 권장");
  }

  return signals;
}

function generateRecommendedActions(
  recentExecutions: ExecutionMonitorSummary["recentExecutions"],
  blockedIssues: ExecutionMonitorSummary["blockedIssues"],
  riskSignals: string[],
): string[] {
  const actions: string[] = [];

  if (blockedIssues.length > 0) {
    actions.push("차단 이슈 해제 후 다음 단계 진행");
  }

  const hasConsecutiveFail = riskSignals.some((s) => s.includes("연속 실패"));
  if (hasConsecutiveFail) {
    actions.push("Claude Code로 실패 원인 분석");
    actions.push("Retry Candidate 등록");
  }

  const hasTokenLimit = riskSignals.some((s) => s.includes("토큰 한계"));
  if (hasTokenLimit) {
    actions.push("Handoff Pack 생성 후 다음 에이전트로 전환");
    actions.push("Context Pack 생성 — 세션 리셋");
  }

  const lastExec = recentExecutions[0];
  if (lastExec?.status === "done" && actions.length === 0) {
    actions.push("다음 태스크로 진행");
    actions.push("인사이트 저장 (Obsidian)");
  }

  if (actions.length === 0) {
    actions.push("현재 상태 검토 후 다음 태스크 선택");
  }

  return actions;
}

// ─── Public exports ────────────────────────────────────────────────────────────

export function generateMonitorSummary(params: {
  executionLogs: HermesExecutionLog[];
  roadmapStages: RoadmapStage[];
  currentPhase: number;
}): ExecutionMonitorSummary {
  const { executionLogs, roadmapStages } = params;

  // 1. Most recent 5 executions, newest first
  const recentExecutions = [...executionLogs]
    .sort(
      (a, b) =>
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime(),
    )
    .slice(0, 5)
    .map((log) => ({
      taskId: log.taskId,
      taskTitle: log.taskTitle,
      agent: log.agentType,
      status: toStatus(log.completionJudgment),
      completedAt: log.completedAt,
      judgment: log.completionJudgment,
    }));

  // 2. Blocked issues from the active stage
  const activeStage = roadmapStages.find((s) => s.status === "active");
  const blockedIssues =
    activeStage?.blockers?.map((blocker) => ({
      taskId: activeStage.id,
      reason: blocker.description,
      blockedSince: blocker.blockedSince,
      requiredAction: blocker.requiredAction ?? "미지정",
    })) ?? [];

  // 3. Risk signals
  const riskSignals = detectRiskSignals(executionLogs);

  // 4. Recommended actions
  const recommendedActions = generateRecommendedActions(
    recentExecutions,
    blockedIssues,
    riskSignals,
  );

  return {
    recentExecutions,
    blockedIssues,
    riskSignals,
    recommendedActions,
    lastUpdated: new Date().toISOString(),
  };
}

export function generateMonitorMarkdown(
  summary: ExecutionMonitorSummary,
): string {
  const lines: string[] = [
    "# Hermes Monitor Summary",
    "",
    `_Last updated: ${new Date(summary.lastUpdated).toLocaleString()}_`,
    "",
    "---",
    "",
    "## 최근 실행",
    "",
  ];

  if (summary.recentExecutions.length === 0) {
    lines.push("실행 기록 없음.");
  } else {
    for (const exec of summary.recentExecutions) {
      const icon =
        exec.status === "done" ? "✅" : exec.status === "partial" ? "⏳" : "❌";
      lines.push(
        `${icon} **${exec.taskTitle}** (${exec.agent}) — ${exec.status} [${exec.completedAt}]`,
      );
    }
  }

  lines.push("", "## 차단 이슈", "");

  if (summary.blockedIssues.length === 0) {
    lines.push("차단 이슈 없음.");
  } else {
    for (const issue of summary.blockedIssues) {
      lines.push(`- **${issue.reason}** (since ${issue.blockedSince})`);
      lines.push(`  권장: ${issue.requiredAction}`);
    }
  }

  lines.push("", "## 리스크 신호", "");

  if (summary.riskSignals.length === 0) {
    lines.push("리스크 신호 없음.");
  } else {
    for (const signal of summary.riskSignals) {
      lines.push(`- ${signal}`);
    }
  }

  lines.push("", "## 권장 행동", "");

  for (const action of summary.recommendedActions) {
    lines.push(`- ${action}`);
  }

  return lines.join("\n");
}
