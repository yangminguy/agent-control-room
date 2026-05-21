// Hermes Insight Extractor
// Pure functions only — no fetch, spawn, exec, or writeFile.
// Hermes does not execute code; it extracts and classifies insights.

import type { DiffAnalysisOutput, CompletionJudgment } from "@/lib/types";
import type { HermesExecutionLog } from "./monitoring-layer";

// ─── Public types ──────────────────────────────────────────────────────────────

export type InsightType = "decision" | "change" | "pass" | "fail" | "risk" | "pattern";

export interface ExtractedInsight {
  type: InsightType;
  title: string;
  description: string;
  evidence: string;     // Log excerpt or file path
  extractedAt: string;  // ISO timestamp
}

export type ResultOutcome = "Pass" | "MinorFix" | "QA" | "Blocked";

// ─── Public exports ────────────────────────────────────────────────────────────

export function extractInsightsFromExecutionLog(
  log: HermesExecutionLog,
): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];
  const now = log.completedAt;

  // 1. Decision insight — agent output contains decision keywords
  if (
    log.agentOutput &&
    (log.agentOutput.includes("decided") || log.agentOutput.includes("chose"))
  ) {
    insights.push({
      type: "decision",
      title: "에이전트 결정",
      description: log.agentOutput.substring(0, 200),
      evidence: log.agentOutput.substring(0, 100),
      extractedAt: now,
    });
  }

  // 2. Change insight — files were modified
  if (log.changedFiles && log.changedFiles.length > 0) {
    insights.push({
      type: "change",
      title: `${log.changedFiles.length}개 파일 수정`,
      description: log.changedFiles.join(", "),
      evidence: log.changedFiles[0],
      extractedAt: now,
    });
  }

  // 3. Pass / Fail insights
  if (log.completionJudgment === "completed") {
    insights.push({
      type: "pass",
      title: "작업 완료",
      description: `${log.taskTitle} 완료`,
      evidence: `Judgment: ${log.completionJudgment}`,
      extractedAt: now,
    });
  } else if (log.completionJudgment === "not_completed") {
    insights.push({
      type: "fail",
      title: "작업 실패",
      description: `${log.taskTitle} 미완료`,
      evidence: log.failureReason ?? "미지정",
      extractedAt: now,
    });
  }

  // 4. Risk insight — partial completion
  if (log.completionJudgment === "partial") {
    insights.push({
      type: "risk",
      title: "부분 완료 리스크",
      description: "작업이 부분적으로만 완료됨",
      evidence: log.taskTitle,
      extractedAt: now,
    });
  }

  return insights;
}

export function extractInsightsFromDiffAnalysis(
  diff: DiffAnalysisOutput,
): ExtractedInsight[] {
  const insights: ExtractedInsight[] = [];
  const now = new Date().toISOString();

  // Changed files insight
  if (diff.changedFiles.length > 0) {
    insights.push({
      type: "change",
      title: `${diff.changedFiles.length}개 파일 변경 (${diff.addedLines}+ / ${diff.removedLines}-)`,
      description: diff.diffSummary,
      evidence: diff.changedFiles[0],
      extractedAt: now,
    });
  }

  // Completion judgment insight
  if (diff.completionJudgment === "completed") {
    insights.push({
      type: "pass",
      title: "Diff 분석: 완료 판정",
      description: diff.diffSummary,
      evidence: `Judgment: ${diff.completionJudgment}`,
      extractedAt: now,
    });
  } else if (diff.completionJudgment === "not_completed") {
    insights.push({
      type: "fail",
      title: "Diff 분석: 미완료 판정",
      description: diff.diffSummary,
      evidence: `Judgment: ${diff.completionJudgment}`,
      extractedAt: now,
    });
  } else if (diff.completionJudgment === "partial") {
    insights.push({
      type: "risk",
      title: "Diff 분석: 부분 완료",
      description: diff.diffSummary,
      evidence: `Partial task IDs: ${diff.partialTaskIds.join(", ") || "없음"}`,
      extractedAt: now,
    });
  }

  // Pattern insight — blocked tasks detected
  if (diff.blockedTaskIds.length > 0) {
    insights.push({
      type: "pattern",
      title: `${diff.blockedTaskIds.length}개 태스크 차단됨`,
      description: "Diff 분석 결과 차단된 태스크가 감지됨",
      evidence: `Blocked IDs: ${diff.blockedTaskIds.join(", ")}`,
      extractedAt: now,
    });
  }

  return insights;
}

export function classifyResultOutcome(judgment: CompletionJudgment): ResultOutcome {
  switch (judgment) {
    case "completed":
      return "Pass";
    case "partial":
      return "MinorFix";
    case "not_completed":
      return "Blocked";
    case "pending":
    default:
      return "QA";
  }
}

export function recommendNextAction(
  outcome: ResultOutcome,
  context?: string,
): string[] {
  const actions: string[] = [];

  switch (outcome) {
    case "Pass":
      actions.push("작업 완료. 다음 태스크로 진행.");
      actions.push("인사이트 저장 (Obsidian)");
      if (context) actions.push(`컨텍스트: ${context}`);
      break;

    case "MinorFix":
      actions.push("Codex로 QA 실행");
      actions.push("또는 Claude Code로 수정");
      break;

    case "QA":
      actions.push("Codex 코드 리뷰");
      actions.push("테스트 결과 확인");
      break;

    case "Blocked":
      actions.push("실패 원인 분석 (Claude Code)");
      actions.push("Retry Candidate 등록");
      actions.push("Context Pack 생성");
      break;
  }

  return actions;
}
