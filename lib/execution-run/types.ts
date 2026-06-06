/**
 * ExecutionRun types — ACR Kernel
 *
 * Canonical type definitions for the ACR Kernel execution-runs layer.
 * Mirrors the FINAL pulk CTO × ACR Kernel PRD §8.2 (ExecutionRun) and §16
 * (ExecutionResultPacket) exactly. pulk CTO is the source of truth; ACR only
 * records execution attempts (runs) against a task.
 *
 *   Task = 해야 할 일
 *   Run  = 그 일을 해결하기 위한 실행 시도
 */

// ─── PRD §8.2 ────────────────────────────────────────────────────────────────

export type ExecutionRunStatus =
  | "queued"
  | "running"
  | "needs_approval"
  | "verifying"
  | "passed"
  | "failed"
  | "blocked"
  | "cancelled"
  | "boundary_violation";

export type ExecutionAgent =
  | "claude-code"
  | "codex"
  | "antigravity"
  | "hermes";

export type ExecutionComplexity = "C0" | "C1" | "C2" | "C3" | "C4" | "C5";

export type ExecutionMode =
  | "safe_solo"
  | "implement_verify"
  | "strict_sandbox"
  | "parallel_patch_queue";

/**
 * Risk level (D0-D4). §8.2 정본 타입에는 없지만 §9.1 요청 계약 예시에
 * risk_level이 포함되어 있어, 거버넌스 데이터 유실을 막기 위해 optional로 보존한다.
 */
export type ExecutionRiskLevel = "D0" | "D1" | "D2" | "D3" | "D4";

export type ExecutionCheckResult = "pass" | "fail" | "skipped";

export type ExecutionChecks = {
  typecheck?: ExecutionCheckResult;
  lint?: ExecutionCheckResult;
  test?: ExecutionCheckResult;
  build?: ExecutionCheckResult;
  playwright?: ExecutionCheckResult;
  boundary?: ExecutionCheckResult;
};

export type ExecutionRun = {
  id: string;
  taskId: string;
  source: "pulk-cto";

  agent: ExecutionAgent;
  status: ExecutionRunStatus;

  repoPath: string;
  baseBranch: string;
  worktreePath?: string;
  runBranch?: string;

  prompt: string;
  acceptanceCriteria: string[];

  allowedFiles: string[];
  blockedFiles: string[];

  complexity: ExecutionComplexity;
  mode: ExecutionMode;

  /** §9.1 요청 계약에 포함되는 risk level. §8.2 정본 외 optional 보존 필드. */
  riskLevel?: ExecutionRiskLevel;

  checks: ExecutionChecks;

  /** §9.2 응답 계약의 current_phase. 실행 runner가 갱신하는 optional 필드. */
  currentPhase?: string;

  changedFiles: string[];
  diffStat?: string;
  logTail?: string;

  resultSummary?: string;
  nextAction?: string;

  createdAt: string;
  updatedAt: string;
};

// ─── PRD §16 — Result Packet ─────────────────────────────────────────────────

export type ExecutionRecommendation =
  | "merge_ready"
  | "human_review"
  | "retry_same_agent"
  | "retry_with_verifier"
  | "blocked"
  | "discard_patch";

export type ExecutionResultPacket = {
  runId: string;
  taskId: string;
  status: ExecutionRunStatus;
  agent: ExecutionAgent;

  summary: string;
  changedFiles: string[];
  diffStat: string;

  checks: ExecutionChecks;

  artifacts: {
    logPath?: string;
    diffPath?: string;
    screenshotPath?: string;
    handoffPath?: string;
  };

  recommendation: ExecutionRecommendation;

  nextAction: string;
};
