/**
 * Orchestration System Types
 * Phase 40: Full Orchestration Layer
 *
 * 기존 lib/types.ts의 AgentType("claude-code"|"codex"|"antigravity")을 확장하는
 * ExtendedAgentType을 정의하고, 오케스트레이션 레이어 전체 타입 시스템을 제공한다.
 */

import type { RiskLevel } from "../types";

export type { RiskLevel };

/** 에이전트 타입 - 기존 3개에 hermes/vibe-kanban/manual-user 추가 */
export type ExtendedAgentType =
  | "claude-code"
  | "codex"
  | "antigravity"
  | "hermes"
  | "vibe-kanban"
  | "manual-user";

/** 실행 모드 - 7가지 */
export type ExecutionMode =
  | "single_agent"
  | "sequential_multi_agent"
  | "parallel_safe"
  | "token_relay"
  | "manual_handoff"
  | "workbench_handoff"
  | "blocked_user_decision";

/** 실행 경계 - 에이전트에게 허용/금지 파일 및 명령어를 명시 */
export type FileBoundary = {
  filesToInspect: string[];
  filesAllowedToEdit: string[];
  filesBlockedFromEditing: string[];
  commandsAllowed: string[];
  commandsBlocked: string[];
  doNotDoRules: string[];
};

/** 승인 게이트 - 실행 전 사용자가 확인해야 할 사항 */
export type ApprovalGate = {
  required: boolean;
  reason: string;
  checklist: string[];
  reviewAfterCompletion: boolean;
  stopConditions: string[];
};

/** 오케스트레이션 판단 결과 - decision-engine의 최종 출력 */
export type OrchestrationDecision = {
  taskId?: string;
  planId?: string;
  title: string;
  summary: string;
  taskType: string;
  riskLevel: RiskLevel;
  executionMode: ExecutionMode;
  primaryAgent: ExtendedAgentType;
  secondaryAgent?: ExtendedAgentType;
  parallelAllowed: boolean;
  parallelBlockReason?: string;
  fileBoundary: FileBoundary;
  approvalGate: ApprovalGate;
  contextPackRecommended: boolean;
  contextPackReason?: string;
  hermesMemoryRecommended: boolean;
  vibeKanbanRecommended: boolean;
  nextAction: string;
  reasoning: string[];
  createdAt: string;
};

/** decision-engine의 입력 */
export type OrchestrationDecisionInput = {
  title: string;
  description: string;
  filePaths?: string[];
  taskType?: string;
  currentAgent?: ExtendedAgentType;
  currentAgentStatus?: string;
  sessionContext?: string;
  planId?: string;
  taskId?: string;
};

/** Context Pack - 에이전트 간 인수인계 패킷 */
export type ContextPack = {
  id: string;
  title: string;
  goal: string;
  completedWork: string[];
  changedFiles: string[];
  currentState: string;
  keyDecisions: string[];
  importantConstraints: string[];
  currentBlockers: string[];
  remainingWork: string[];
  acceptanceCriteria: string[];
  filesAllowedToEdit: string[];
  filesBlockedFromEditing: string[];
  doNotDoRules: string[];
  nextPrompt: string;
  requestedAgent: ExtendedAgentType;
  reasonForRelay: string;
  sessionHistory: string[];
  createdAt: string;
};

/** Context Pack 빌더 입력 */
export type ContextPackBuilderInput = {
  title: string;
  goal: string;
  completedWork?: string[];
  changedFiles?: string[];
  currentState?: string;
  keyDecisions?: string[];
  importantConstraints?: string[];
  currentBlockers?: string[];
  remainingWork?: string[];
  acceptanceCriteria?: string[];
  filesAllowedToEdit?: string[];
  filesBlockedFromEditing?: string[];
  doNotDoRules?: string[];
  nextPrompt?: string;
  requestedAgent: ExtendedAgentType;
  reasonForRelay: string;
  sessionHistory?: string[];
};

/** Hermes Memory Note - Obsidian-compatible 장기 기억 노트 */
export type MonitorMemoryNote = {
  id: string;
  type:
    | "session_summary"
    | "decision"
    | "failure"
    | "prompt_pattern"
    | "agent_performance"
    | "context_pack"
    | "blocker";
  title: string;
  content: string;
  tags: string[];
  relatedTaskIds: string[];
  relatedFiles: string[];
  obsidianPath: string;
  createdAt: string;
};

/** Hermes Memory Note 빌더 입력 */
export type MonitorMemoryNoteInput = {
  type?: MonitorMemoryNote["type"];
  title: string;
  content: string;
  tags?: string[];
  relatedTaskIds?: string[];
  relatedFiles?: string[];
  taskId?: string;
};

/** Agent 라우팅 결과 */
export type AgentRoutingResult = {
  primaryAgent: ExtendedAgentType;
  secondaryAgent?: ExtendedAgentType;
  reasoning: string;
  agentRole: string;
};

/** 실행 모드 선택 결과 */
export type ExecutionModeResult = {
  mode: ExecutionMode;
  parallelAllowed: boolean;
  parallelBlockReason?: string;
  reasoning: string;
};
