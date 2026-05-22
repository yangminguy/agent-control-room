import type { ExecutionLog } from "@/lib/types";

export interface SessionRunSummary {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  totalTasks: number;
  passCount: number;
  failCount: number;
  partialCount: number;
  agentsUsed: string[];
  keyDecisions: string[];
  changedFiles: string[];
  highlights: string[];
  nextRecommendation?: string;
}

// ─── Pure functions ───────────────────────────────────────────────────────────

export function summarizeSession(logs: ExecutionLog[]): SessionRunSummary {
  if (logs.length === 0) {
    const now = new Date().toISOString();
    return {
      sessionId: `session-empty-${Date.now()}`,
      startedAt: now,
      completedAt: now,
      totalTasks: 0,
      passCount: 0,
      failCount: 0,
      partialCount: 0,
      agentsUsed: [],
      keyDecisions: [],
      changedFiles: [],
      highlights: [],
    };
  }

  const sorted = [...logs].sort(
    (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime(),
  );

  const startedAt = sorted[0].startedAt;
  const lastLog = sorted[sorted.length - 1];
  const completedAt = lastLog.completedAt ?? new Date().toISOString();

  const passCount = logs.filter((l) => l.status === "done").length;
  const failCount = logs.filter((l) => l.status === "failed").length;
  // Logs with exit code 0 but not explicitly "done" treated as partial
  const partialCount = logs.length - passCount - failCount;

  const agentsUsed = [...new Set(logs.map((l) => l.agent))];

  const highlights: string[] = [];

  // First success
  const firstDone = sorted.find((l) => l.status === "done");
  if (firstDone) {
    highlights.push(`최초 성공: planTaskId ${firstDone.planTaskId}`);
  }

  // Most log lines (proxy for heaviest task)
  const heaviest = logs.reduce(
    (max, l) => (l.logLines.length > max.logLines.length ? l : max),
    logs[0],
  );
  if (heaviest.logLines.length > 0) {
    highlights.push(
      `최대 로그: planTaskId ${heaviest.planTaskId} (${heaviest.logLines.length}줄)`,
    );
  }

  // Any failures
  if (failCount > 0) {
    highlights.push(`실패한 태스크 ${failCount}개 — 검토 필요`);
  }

  return {
    sessionId: `session-${sorted[0].id}`,
    startedAt,
    completedAt,
    totalTasks: logs.length,
    passCount,
    failCount,
    partialCount,
    agentsUsed,
    keyDecisions: [],
    changedFiles: [],
    highlights,
  };
}

export function generateSessionMarkdown(summary: SessionRunSummary): string {
  const lines: string[] = [
    `# 세션 요약: ${summary.sessionId}`,
    "",
    `**시작:** ${summary.startedAt}`,
    `**종료:** ${summary.completedAt}`,
    "",
    "## 태스크 현황",
    "",
    `- 전체: ${summary.totalTasks}`,
    `- 성공: ${summary.passCount}`,
    `- 실패: ${summary.failCount}`,
    `- 부분 완료: ${summary.partialCount}`,
    "",
    "## 사용된 에이전트",
    "",
    ...summary.agentsUsed.map((a) => `- ${a}`),
    "",
  ];

  if (summary.highlights.length > 0) {
    lines.push("## 주요 사항", "");
    summary.highlights.forEach((h) => lines.push(`- ${h}`));
    lines.push("");
  }

  if (summary.keyDecisions.length > 0) {
    lines.push("## 주요 결정사항", "");
    summary.keyDecisions.forEach((d) => lines.push(`- ${d}`));
    lines.push("");
  }

  if (summary.changedFiles.length > 0) {
    lines.push("## 변경된 파일", "");
    summary.changedFiles.forEach((f) => lines.push(`- \`${f}\``));
    lines.push("");
  }

  if (summary.nextRecommendation) {
    lines.push("## 다음 권장사항", "", summary.nextRecommendation, "");
  }

  return lines.join("\n");
}
