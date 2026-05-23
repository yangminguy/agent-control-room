export type InsightCategory =
  | "failure-pattern"
  | "recovery-rule"
  | "agent-routing"
  | "approval-policy"
  | "workflow-lesson"
  | "risk-pattern"
  | "user-preference"
  | "system-improvement";

export type InsightSeverity = "low" | "medium" | "high";
export type InsightConfidence = "low" | "medium" | "high";
export type InsightStatus = "active" | "archived" | "needs-review";
export type RelatedAgent = "claude" | "codex" | "antigravity" | "hermes" | "control-room" | "unknown";

export interface HermesInsight {
  id: string;
  title: string;
  summary: string;
  category: InsightCategory;
  severity: InsightSeverity;
  confidence: InsightConfidence;
  sourcePacketIds: string[];
  relatedPhase?: string;
  relatedAgent?: RelatedAgent;
  evidence: string[];
  recommendation: string;
  status: InsightStatus;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
  occurrenceCount: number;
  tags: string[];
}

export interface InsightStore {
  insights: HermesInsight[];
  lastUpdated: string;
}

export const INSIGHT_CATEGORY_LABELS: Record<InsightCategory, string> = {
  "failure-pattern": "반복 실패 패턴",
  "recovery-rule": "복구 규칙",
  "agent-routing": "에이전트 배정",
  "approval-policy": "승인 정책",
  "workflow-lesson": "워크플로우 개선",
  "risk-pattern": "위험 패턴",
  "user-preference": "사용자 선호도",
  "system-improvement": "시스템 개선",
};

export const INSIGHT_SEVERITY_LABELS: Record<InsightSeverity, string> = {
  low: "낮음",
  medium: "중간",
  high: "높음",
};

export const INSIGHT_CONFIDENCE_LABELS: Record<InsightConfidence, string> = {
  low: "낮음",
  medium: "보통",
  high: "높음",
};

export const INSIGHT_STATUS_LABELS: Record<InsightStatus, string> = {
  active: "활성",
  archived: "보관",
  "needs-review": "검토 필요",
};
