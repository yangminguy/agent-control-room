export type AgentType = "claude-code" | "codex" | "antigravity";

// T028: Internal agent type for UI/composition
export type InternalAgentId = string; // e.g. "ui-designer", "backend-developer", etc.

export type AgentStatusValue =
  | "available"
  | "limited"
  | "cooling_down"
  | "blocked"
  | "manual_only";

export type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
  baseTool?: "vibe-kanban" | "openhands" | "custom" | "none";
  defaultAgent: AgentType;
  docs: ProjectDoc[];
  createdAt: string;
  updatedAt: string;
};

export type ProjectDoc = {
  id: string;
  projectId: string;
  path: string;
  title: string;
  content?: string;
  summary?: string;
  updatedAt: string;
};

export type AgentStatus = {
  agent: AgentType;
  status: AgentStatusValue;
  reason?: string;
  lastUsedAt?: string;
  nextAvailableAt?: string;
};

export type TaskStatus =
  | "draft"
  | "planned"
  | "in_progress"
  | "blocked"
  | "completed";

export type Task = {
  id: string;
  projectId: string;
  baseToolTaskId?: string;
  title: string;
  userIntent: string;
  technicalSummary: string;
  status: TaskStatus;
  recommendedAgent: AgentType;
  priority: "P0" | "P1" | "P2";
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt: string;
};

export type Handoff = {
  id: string;
  projectId: string;
  taskId: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  completedWork: string[];
  remainingWork: string[];
  changedFiles: string[];
  forbiddenFiles: string[];
  nextPrompt: string;
  createdAt: string;
};

export type SessionReport = {
  // Identifiers
  id: string;
  projectId: string;
  taskId: string;
  agent: AgentType;

  // Execution Details
  summary: string;
  executionTimeMinutes: number;
  tokensUsed: number;
  errors: string[];

  // Code Quality Metrics
  changedFiles: string[];
  testsRun: string[];
  codeReviewScore: number; // 0-100
  accessibilityScore: number; // 0-100
  performanceMetrics?: {
    bundleSize?: number; // KB
    loadTime?: number; // ms
    coreWebVitals?: Record<string, number>;
  };

  // Session Notes
  manualNotes: string; // User manual notes/observations
  remainingIssues: string[];

  // Completion & Next Steps
  completionJudgment: CompletionJudgment;
  completionReason: string;
  nextTask: string; // Next task to perform
  nextPrompt: string; // Structured prompt for next agent
  recommendedAgent: AgentType | "manual"; // Which agent should take next task

  // Validation
  prdAlignmentScore: number; // 0-100: How well does output match PRD
  risks: string[]; // Potential issues or technical debt introduced

  // Metadata
  createdAt: string;
  updatedAt: string;
};

export type GeneratedTask = {
  title: string;
  userIntent: string;
  technicalSummary: string;
  priority: "P0" | "P1" | "P2";
  recommendedAgent: AgentType;
  acceptanceCriteria: string[];
};

export type OrchestrationResult = {
  technicalTranslation: {
    productIntent: string;
    technicalInterpretation: string;
    requiredData: string[];
    requiredUi: string[];
    requiredLogic: string[];
  };
  tasks: GeneratedTask[];
  recommendedAgent: AgentType;
  fallbackAgent?: AgentType | null;
  agentReason: string;
  statusReason?: string;
  handoffRequired?: boolean;
  handoffPrompt?: string;
  copyReadyPrompt: string;
  acceptanceCriteria: string[];
  assumptions: string[];
  risks: string[];
  followUpQuestions: string[];
};

export type DirectionInput = {
  projectName: string;
  projectContext: string;
  direction: string;
  preferredAgentStatus?: AgentStatusValue;
};

export type OpenSourceBase = {
  id: string;
  name: "vibe-kanban" | "openhands" | "claude-squad" | "metaswarm" | "custom";
  status: "evaluating" | "selected" | "rejected" | "reference_only";
  strengths: string[];
  limitations: string[];
  integrationNotes: string[];
};

export type AdvisorInput = {
  question: string;
  projectContext?: string;
};

export type AdvisorResponse = {
  problemSummary: string;
  likelyCauses: string[];
  options: string[];
  recommendation: string;
  risks: string[];
  nextPrompt: string;
};

// ─────────────────────────────────────────────────────────
// T016 — Plan & Kanban Data Model
// ─────────────────────────────────────────────────────────

/**
 * 태스크 상태 머신:
 * planned → ready → running → done
 *                           ↘ partial → running (retry)
 *                           ↘ blocked → (Advisor Mode 트리거)
 *                                     ↘ needs_review → done | blocked
 */
export type PlanTaskStatus =
  | "planned"       // 계획됨, 아직 실행 안 함
  | "ready"         // 프롬프트 생성 완료, 실행 가능
  | "running"       // 에이전트 실행 중
  | "done"          // 완료
  | "partial"       // 일부 완료 (diff 분석 기반)
  | "blocked"       // 에러/불확실성 발생
  | "needs_review"; // 사용자 확인 필요

/** 태스크 내 논리적 역할 단위 (MVP에서는 실제 병렬 프로세스가 아닌 논리적 구분) */
export type SubAgentTrack = {
  id: string;
  role: string; // e.g. "Architecture Reviewer", "Backend Implementer", "Type Definer"
  agentId?: string; // T025: 내부 에이전트 ID (44개 내부 에이전트 지원)
  externalAgent?: AgentType; // T025: 외부 에이전트 (fallback)
  status: PlanTaskStatus;
  summary?: string; // 이 트랙이 완료한 내용 요약
  executionOrder?: number; // T025: multi-agent composition에서의 실행 순서
  estimatedTokens?: number; // T025: 예상 토큰 수
  estimatedMinutes?: number; // T025: 예상 소요 시간
};

/** 실행 단위: FeaturePlan 내 하나의 작업 */
export type PlanTask = {
  id: string;
  planId: string;
  title: string;
  description: string;
  status: PlanTaskStatus;
  assignedAgent: AgentType;
  priority: "P0" | "P1" | "P2" | "P3";
  acceptanceCriteria: string[];
  subAgentTracks: SubAgentTrack[];
  generatedPrompt?: string;           // copy-ready 프롬프트
  lastSessionReportId?: string | null; // 실행 결과 링크
  branchName?: string | null;          // 이 태스크용 git branch

  // ── 실행 후 채워지는 KanbanCard 필드 ──
  changedFiles?: string[] | null;                // 변경 파일
  diffSummary?: string | null;                   // Diff 요약
  completionJudgment?: CompletionJudgment | null; // 완료 판정
  nextPrompt?: string | null;                    // 다음 프롬프트

  createdAt: string;
  updatedAt: string;
};

/** 여러 PlanTask를 묶는 기능 단위 계획 */
export type FeaturePlan = {
  id: string;
  projectId: string;
  title: string;       // e.g. "Phase 2: Structured Planning"
  userGoal: string;    // 원본 사용자 입력
  status: PlanTaskStatus; // 전체 계획 상태
  tasks: PlanTask[];
  createdAt: string;
  updatedAt: string;
};

/** T019 Diff Analyzer가 자동 판정하는 완료 판정 값 */
export type CompletionJudgment =
  | "completed"     // 모든 acceptance criteria 충족
  | "partial"       // 일부만 충족
  | "not_completed" // 미충족
  | "pending";      // 아직 판정 전

/**
 * KanbanCard: PlanTask의 실행 추적 단위.
 * 실행 전(generatedPrompt)부터 실행 후(changedFiles, diffSummary, completionJudgment)까지 포함.
 */
export type KanbanCard = {
  id: string;      // = planTask.id
  planId: string;

  // ── 기본 정보 ────────────────────────────────────────
  title: string;                         // 작업명
  assignedAgent: AgentType;              // 담당 에이전트
  goal: string;                          // 목표
  status: PlanTaskStatus;                // 실행 상태

  // ── 실행 전 ──────────────────────────────────────────
  generatedPrompt?: string;              // 생성된 프롬프트 (ready 단계에서 채워짐)

  // ── 실행 후 ──────────────────────────────────────────
  changedFiles?: string[];               // 변경 파일
  diffSummary?: string;                  // Diff 요약 (LLM 생성 plain text)
  completionJudgment?: CompletionJudgment; // 완료 판정
  nextPrompt?: string;                   // 다음 프롬프트

  // ── 메타 ────────────────────────────────────────────
  subAgentTracks: SubAgentTrack[];
  branchName?: string;
};

/** T019용: git diff 분석 결과 */
export type DiffAnalysisOutput = {
  changedFiles: string[];
  addedLines: number;
  removedLines: number;
  diffSummary: string;                    // Plain-language diff 요약
  completionJudgment: CompletionJudgment; // 완료 판정
  nextPrompt: string;                     // 다음 프롬프트
  completedTaskIds: string[];             // done 판정된 planTask ids
  partialTaskIds: string[];               // partial 판정된 planTask ids
  blockedTaskIds: string[];               // blocked/needs_review 판정된 planTask ids
};

export type DiffSummary = DiffAnalysisOutput;

/** T018용: 에이전트 실행 로그 */
export type ExecutionLog = {
  id: string;
  planTaskId: string;
  agent: AgentType;
  branchName: string;
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  logLines: string[];           // 캡처된 stdout/stderr
  status: "running" | "done" | "failed";
};
