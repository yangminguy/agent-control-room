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
  allowedFiles?: string[];             // 실행 경계: 수정 허용 파일/패턴
  doNotTouchFiles?: string[];          // 실행 경계: 수정 금지 파일/패턴
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
  status: "running" | "done" | "failed" | "review_blocked" | "boundary_violation";
};

// ─────────────────────────────────────────────────────────
// T027 — Roadmap-First Control Tower UX
// ─────────────────────────────────────────────────────────

/** 로드맵 단계의 상태 */
export type RoadmapStatus =
  | "completed"           // 완료
  | "active"              // 활성화 (현재 진행 중)
  | "waiting"             // 대기 중 (이전 단계 완료 대기)
  | "blocked"             // 차단됨 (특정 이유로 진행 불가)
  | "user_input_required" // 사용자 입력 필요
  | "failed"              // 실패
  | "handoff_needed";     // 핸드오프 필요

/** 로드맵 단계가 차단된 이유 */
export type RoadmapBlocker = {
  id: string;
  title: string;          // e.g. "Token limit exceeded"
  description: string;
  blockedAgent?: AgentType;
  blockedSince: string;
  requiredAction?: string; // 차단 해제를 위한 필요 액션
};

/** 사용자 결정이 필요한 지점 */
export type RoadmapUserDecision = {
  id: string;
  question: string;       // e.g. "Should we use Supabase or SQLite?"
  options: string[];      // ["Supabase", "SQLite"]
  selectedOption?: string; // 사용자가 선택한 옵션
  decidedAt?: string;
};

/** 로드맵 단계 (보통은 한 개의 Phase) */
export type RoadmapStage = {
  id: string;
  number: number;          // Phase 번호 (1, 2, 3...)
  title: string;           // e.g. "Phase 2: Structured Planning"
  description?: string;
  goal: string;            // 단계의 목표
  status: RoadmapStatus;

  // ── 현재 상태 ──
  responsibleAgent?: AgentType;           // 담당 에이전트
  currentTaskId?: string;                 // 현재 진행 중인 task ID
  completionPercentage: number;           // 0-100

  // ── 구성 요소 ──
  tasks: PlanTask[];       // 이 단계의 모든 태스크
  acceptanceCriteria: string[]; // 단계 완료 기준

  // ── 차단/결정 ──
  blockers?: RoadmapBlocker[];
  userDecisions?: RoadmapUserDecision[];

  // ── 다음 단계 ──
  nextAction?: string;     // 구체적인 다음 액션
  nextAgentRecommendation?: AgentType;

  // ── 메타 ──
  estimatedDays?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** 전체 로드맵 (프로젝트 개발 수명 주기) */
export type Roadmap = {
  id: string;
  projectId: string;
  title: string;          // e.g. "Agent Control Room Development Roadmap"
  version: string;        // e.g. "1.0.0"
  productVision: string;  // 제품의 장기 비전
  stages: RoadmapStage[];

  // ── 로드맵 메트릭 ──
  overallProgress: number; // 0-100 (모든 stage의 completionPercentage 평균)
  completedStageCount: number;
  activeStageCount: number;
  blockedStageCount: number;

  createdAt: string;
  updatedAt: string;
};

// ─────────────────────────────────────────────────────────
// Phase 12-16 — Core Autonomous Orchestration Loop
// ─────────────────────────────────────────────────────────

/** Phase 12: Risk classification level */
export type RiskLevel = "safe" | "low" | "medium" | "high" | "critical";

/** Phase 12: Dispatch job status state machine */
export type DispatchJobStatus =
  | "queued"               // 디스패치 대기 중
  | "running"              // 에이전트 실행 중
  | "approved"             // 승인됨 (risky 작업)
  | "skipped_due_to_risk"  // 위험으로 인해 스킵됨 (타임아웃)
  | "completed"            // 완료
  | "failed";              // 실패

/** Phase 12: Dispatch job for autonomous execution */
export type DispatchJob = {
  id: string;
  taskId: string;                    // 원본 task ID
  agentId: AgentType;                // 할당된 에이전트
  riskLevel: RiskLevel;              // 위험도
  status: DispatchJobStatus;         // 현재 상태

  // ── 타임스탬프 ──
  createdAt: string;                 // 생성 시간
  approvedAt?: string;               // 승인 시간 (risky 작업만)
  timeoutAt?: string;                // 타임아웃 시간
  completedAt?: string;              // 완료 시간

  // ── 재시도 ──
  retryCount: number;                // 재시도 횟수
  maxRetries?: number;               // 최대 재시도 횟수 (기본값: 3)

  // ── 메타 ──
  prompt?: string;                   // 실행할 프롬프트
  resultId?: string;                 // 연결된 결과 ID
};

/** Phase 13: Normalized result status from any agent */
export type ResultStatus =
  | "pass"              // 성공
  | "minor_fix"         // 경미한 수정 필요
  | "qa_needed"         // QA 필요
  | "blocked"           // 차단됨
  | "safety_violation"; // 보안 위반

/** Phase 13: Normalized agent result */
export type AgentResult = {
  id: string;
  dispatchJobId: string;             // 원본 dispatch job
  taskId: string;                    // 원본 task ID
  agentId: AgentType;                // 실행한 에이전트

  // ── 결과 데이터 ──
  rawOutput: string;                 // 원본 출력 (pasted/JSON/import)
  resultStatus: ResultStatus;        // 자동 분류된 상태
  changedFiles?: string[];           // 변경된 파일 목록

  // ── 메타 ──
  extractedSummary?: string;         // 요약 추출
  timestamp: string;                 // 수집 시간
};

/** Phase 14: Approval request for risky tasks */
export type ApprovalRequestStatus =
  | "pending"    // 대기 중
  | "approved"   // 승인됨
  | "rejected"   // 거부됨
  | "timed_out"; // 타임아웃됨

export type ApprovalRequest = {
  id: string;
  dispatchJobId: string;             // 연결된 dispatch job

  // ── 상태 ──
  status: ApprovalRequestStatus;

  // ── 타임스탬프 ──
  createdAt: string;
  resolvedAt?: string;               // 승인/거부 시간

  // ── Discord 정보 ──
  discordMessageId?: string;         // Discord 메시지 ID (실제 전송 시)
  discordMessagePreview?: string;    // 메시지 미리보기 (로컬)

  // ── T-AUTO-010: Destructive pattern detection ──
  destructivePatterns?: string[];    // 감지된 destructive 패턴 목록
  approverNote?: string;             // 승인/거부 사유
};

/** Phase 15: Safe vs risky task split result */
export type ProgressSplitResult = {
  safeTasks: DispatchJob[];          // 즉시 진행할 작업
  riskyTasks: DispatchJob[];         // 승인 대기 작업
  pendingApprovals: ApprovalRequest[]; // 대기 중인 승인
};

/** Phase 16: Feedback loop decision for next action */
export type FeedbackDecision =
  | "redispatch"         // 재시도 (minor_fix 시)
  | "create_qa_task"     // QA 작업 생성
  | "create_blocked_decision" // 사용자 결정 필요
  | "halt_safety_violation";  // 보안 위반으로 중단

export type FeedbackLoopOutput = {
  decision: FeedbackDecision;
  reason: string;
  nextDispatchJob?: DispatchJob;      // redispatch 시
  blockedDecision?: {                 // create_blocked_decision 시
    question: string;
    options: string[];
  };
  qaTask?: PlanTask;                  // create_qa_task 시
};

// ─────────────────────────────────────────────────────────
// Phase 26 — Hermes LLM Analysis (Gemma 4 via Ollama)
// ─────────────────────────────────────────────────────────

export type HermesAnalysis = {
  insights: string[];
  recommendations: string[];
  riskFlags: string[];
  analyzedAt: string;
};

// ─────────────────────────────────────────────────────────
// Phase 23 — Orchestration Metrics
// ─────────────────────────────────────────────────────────

export type AgentMetricBreakdown = {
  agentId: string;
  totalJobs: number;
  successCount: number;
  failedCount: number;
  avgDurationMs: number | null;
};

export type OrchestrationMetrics = {
  totalJobs: number;
  successCount: number;
  failedCount: number;
  skippedCount: number;
  retryCount: number;
  timeoutCount: number;
  avgDurationMs: number | null;
  perAgent: AgentMetricBreakdown[];
  computedAt: string;
};

// ─────────────────────────────────────────────────────────
// Phase 22 — Orchestration Log Event
// ─────────────────────────────────────────────────────────

/** Structured event logged by the orchestration system */
export type OrchestrationLogEvent = {
  event:
    | "job_dispatched"
    | "job_started"
    | "job_completed"
    | "approval_timeout"
    | "approval_resolved"
    | "feedback_generated"
    | "result_collected"
    | "status_changed";
  jobId: string;
  agentId?: AgentType;
  riskLevel?: RiskLevel;
  timestamp: string;
  detail?: string; // first 200 chars of relevant data
};

// ─────────────────────────────────────────────────────────
// T-AUTO-011 — Context Budget Tracking
// ─────────────────────────────────────────────────────────

/** Agent context budget: tracks cumulative token usage per session */
export type ContextBudget = {
  agentId: AgentType;
  promptChars: number; // cumulative prompt character count
  outputChars: number; // cumulative output character count
  jobCount: number; // number of jobs processed
  estimatedTokens: number; // (promptChars + outputChars) / 4
};

// ─────────────────────────────────────────────────────────
// Phase 33 — Production Hardening & Error Recovery
// ─────────────────────────────────────────────────────────

/** Retry policy configuration for job recovery */
export type RetryPolicy = {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number; // exponential backoff (default: 2.0)
};

/** Error recovery attempt log */
export type ErrorRecoveryLog = {
  id: string;
  jobId: string;
  errorMessage: string;
  errorCode?: string;
  attemptNumber: number;
  nextRetryAt?: string;
  recoveryAction: string; // "retry", "escalate", "manual_review"
  timestamp: string;
  resolvedAt?: string;
};

/** Data integrity checkpoint for recovery */
export type DataIntegrityCheckpoint = {
  id: string;
  jobId: string;
  checksum: string;
  changedFiles: string[];
  timestamp: string;
  status: "valid" | "corrupted" | "unknown";
};

// ─────────────────────────────────────────────────────────
// Phase 34 — Hermes LLM Validation & Auto-Decision Layer
// ─────────────────────────────────────────────────────────

/** Hermes LLM validation request */
export type HermesValidationRequest = {
  id: string;
  planId: string;
  stageIndex: number;
  stageName: string;
  acceptanceCriteria: string[];
  completedWork: string[];
  contextSummary: string;
  riskFlags?: string[];
  timestamp: string;
};

/** Hermes LLM validation result */
export type HermesValidationResult = {
  validationId: string;
  requestId: string;
  isValid: boolean;
  confidenceScore: number; // 0-100
  reasoning: string;
  suggestedAction: "approve" | "reject" | "manual_review";
  risks?: string[];
  recommendations?: string[];
  timestamp: string;
};

/** Auto-decision log (user-approved or manual review) */
export type AutoDecisionLog = {
  id: string;
  validationId: string;
  decision: "auto_approved" | "auto_rejected" | "user_confirmation_required";
  decisionMaker?: string; // "hermes", "user", "system"
  userApproval?: boolean;
  userNote?: string;
  approvalTimestamp?: string;
  timestamp: string;
};

/** Validation configuration */
export type ValidationConfig = {
  enableHermesValidation: boolean;
  confidenceThreshold: number; // 0-100 (default: 75)
  autoApproveAboveThreshold: boolean; // if true, auto-approve high-confidence validations
  requiresUserConfirmationForRejects: boolean;
  loggingLevel: "minimal" | "standard" | "verbose";
};

// ─────────────────────────────────────────────────────────
// Phase 35 — Multi-Project Management
// ─────────────────────────────────────────────────────────

/** 프로젝트별 오케스트레이션 런 상태 */
export type ProjectRunStatus =
  | "idle"       // 실행 대기
  | "active"     // 실행 중 (에이전트 할당됨)
  | "paused"     // 승인 대기로 일시 정지
  | "completed"  // 모든 작업 완료
  | "blocked";   // 차단됨

/** 에이전트 슬롯 할당 정보 */
export type AgentSlotAllocation = {
  projectId: string;
  agentId: AgentType;
  allocatedAt: string;
  releaseAt?: string;     // 예상 해제 시간 (선택)
};

/** 프로젝트별 오케스트레이션 큐 */
export type ProjectOrchestrationQueue = {
  projectId: string;
  projectName: string;
  status: ProjectRunStatus;
  activeJobs: DispatchJob[];       // 현재 실행 중인 작업
  pendingJobs: DispatchJob[];      // 대기 중인 작업
  completedJobIds: string[];       // 완료된 작업 ID 목록
  blockedJobIds: string[];         // 차단된 작업 ID 목록
  agentAllocations: AgentSlotAllocation[];
  createdAt: string;
  updatedAt: string;
};

/** 멀티-프로젝트 오케스트레이터 상태 */
export type MultiProjectOrchestratorState = {
  activeProjectIds: string[];          // 현재 활성 프로젝트 (최대 2개)
  maxConcurrentProjects: number;       // 동시 활성 프로젝트 제한 (기본: 2)
  queues: Record<string, ProjectOrchestrationQueue>;
  agentSlots: AgentSlotAllocation[];   // 전체 에이전트 슬롯 목록
};

// ─────────────────────────────────────────────────────────
// Phase 36 — Dashboard & Monitoring
// ─────────────────────────────────────────────────────────

/** KPI 집계 데이터 */
export type DashboardKPI = {
  totalJobs: number;
  completedJobs: number;
  blockedJobs: number;
  failedJobs: number;
  pendingApprovals: number;
  activeProjects: number;
  safetyViolations: number;
  avgRetryCount: number;         // 전체 작업 평균 재시도 횟수
  completionRate: number;        // 0~100 (%)
};

/** 활동 타임라인 이벤트 (대시보드 표시용) */
export type DashboardActivityEvent = {
  id: string;
  timestamp: string;
  eventType: "job_completed" | "job_blocked" | "approval_required" | "safety_violation" | "project_activated" | "agent_switched";
  projectId?: string;
  projectName?: string;
  agentId?: AgentType;
  detail: string;               // 사람이 읽기 좋은 설명
  riskLevel?: RiskLevel;
};

/** 에이전트 상태 요약 (대시보드 표시용) */
export type DashboardAgentSummary = {
  agentId: AgentType;
  status: AgentStatusValue;
  activeProjectIds: string[];   // 현재 이 에이전트가 할당된 프로젝트
  completedJobsToday: number;
  blockedJobsToday: number;
};

/** 대시보드 전체 응답 */
export type DashboardSnapshot = {
  kpi: DashboardKPI;
  agentSummaries: DashboardAgentSummary[];
  recentActivity: DashboardActivityEvent[];  // 최신 20개
  blockedItems: {
    jobs: DispatchJob[];
    approvalRequests: ApprovalRequest[];
  };
  generatedAt: string;
};
