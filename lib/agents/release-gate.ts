/**
 * Release Gate
 *
 * Scaffolding for handling dangerous operations:
 * - git push / force push
 * - production deployment
 * - database migration / Supabase production write
 * - Telegram approval authority
 * - high/critical risk file changes
 *
 * No release operation should run without explicit Release Gate approval.
 */

export type DangerousOperation =
  | "git_push"
  | "git_force_push"
  | "production_deploy"
  | "db_migration"
  | "supabase_write"
  | "telegram_approval_authority"
  | "dangerous_file_change";

export type RiskLevel = "high" | "critical";

export type ReleaseGateStatus = "pending" | "approved" | "rejected" | "expired";

export type ReleaseGateRequest = {
  id: string;
  taskId: string;
  riskLevel: RiskLevel;
  operation: DangerousOperation;
  summary: string;
  changedFiles: string[];
  riskExplanation: string;
  rollbackPlan?: string;
  requiredChecks: string[];
  status: ReleaseGateStatus;
  createdAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
  expiresAt: string;
};

// In-memory storage for release gate requests (can be persisted to file)
const releaseGateRequests: Map<string, ReleaseGateRequest> = new Map();

/**
 * Create a new release gate request
 */
export function createReleaseGateRequest(
  taskId: string,
  operation: DangerousOperation,
  riskLevel: RiskLevel,
  options: {
    summary: string;
    changedFiles: string[];
    riskExplanation: string;
    rollbackPlan?: string;
    requiredChecks: string[];
  }
): ReleaseGateRequest {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24-hour expiry

  const request: ReleaseGateRequest = {
    id: `rg-${Date.now()}`,
    taskId,
    riskLevel,
    operation,
    summary: options.summary,
    changedFiles: options.changedFiles,
    riskExplanation: options.riskExplanation,
    rollbackPlan: options.rollbackPlan,
    requiredChecks: options.requiredChecks,
    status: "pending",
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  releaseGateRequests.set(request.id, request);
  return request;
}

/**
 * Get a release gate request
 */
export function getReleaseGateRequest(id: string): ReleaseGateRequest | null {
  return releaseGateRequests.get(id) || null;
}

/**
 * Get all pending release gate requests
 */
export function getPendingReleaseGateRequests(): ReleaseGateRequest[] {
  return Array.from(releaseGateRequests.values()).filter(
    (r) => r.status === "pending"
  );
}

/**
 * Approve a release gate request
 */
export function approveReleaseGateRequest(
  id: string,
  approvedBy: string = "system"
): ReleaseGateRequest | null {
  const request = releaseGateRequests.get(id);
  if (!request) return null;

  request.status = "approved";
  request.approvedAt = new Date().toISOString();
  request.approvedBy = approvedBy;

  releaseGateRequests.set(id, request);
  return request;
}

/**
 * Reject a release gate request
 */
export function rejectReleaseGateRequest(
  id: string,
  reason: string
): ReleaseGateRequest | null {
  const request = releaseGateRequests.get(id);
  if (!request) return null;

  request.status = "rejected";
  request.rejectionReason = reason;

  releaseGateRequests.set(id, request);
  return request;
}

/**
 * Check if an operation requires release gate approval
 */
export function requiresReleaseGate(operation: DangerousOperation): boolean {
  const dangerousOps: DangerousOperation[] = [
    "git_push",
    "git_force_push",
    "production_deploy",
    "db_migration",
    "supabase_write",
    "telegram_approval_authority",
  ];
  return dangerousOps.includes(operation);
}

/**
 * Check if a file path change is dangerous
 */
export function isDangerousFilePath(filePath: string): boolean {
  const dangerousPatterns = [
    /\.env/,
    /secrets/i,
    /credentials/i,
    /config\.prod/i,
    /database\/migrations/,
    /package\.json/, // Package.json changes can be risky
    /tsconfig\.json/, // TypeScript config changes affect all builds
  ];

  return dangerousPatterns.some((pattern) => pattern.test(filePath));
}

/**
 * Determine risk level based on operation type
 */
export function determineRiskLevel(operation: DangerousOperation): RiskLevel {
  const criticalOps: DangerousOperation[] = [
    "git_force_push",
    "production_deploy",
    "db_migration",
    "supabase_write",
    "telegram_approval_authority",
  ];

  return criticalOps.includes(operation) ? "critical" : "high";
}

/**
 * Build risk explanation
 */
export function buildRiskExplanation(
  operation: DangerousOperation,
  changedFiles: string[]
): string {
  const explanations: Record<DangerousOperation, string> = {
    git_push: "코드 변경사항이 원격 저장소에 영구적으로 저장됩니다.",
    git_force_push: "기존 커밋이 덮어씌워질 수 있습니다. 팀과 협력하는 경우 위험합니다.",
    production_deploy: "프로덕션 환경에 즉시 영향을 미칩니다.",
    db_migration: "데이터베이스 스키마가 변경되어 데이터 손실 위험이 있을 수 있습니다.",
    supabase_write: "프로덕션 데이터베이스에 데이터가 기록됩니다.",
    telegram_approval_authority: "Telegram을 통한 자동 승인이 활성화됩니다.",
    dangerous_file_change: `민감한 파일이 변경됩니다: ${changedFiles.join(", ")}`,
  };

  return explanations[operation] || "위험한 작업입니다.";
}

/**
 * Build required checks for an operation
 */
export function buildRequiredChecks(
  operation: DangerousOperation
): string[] {
  const checks: Record<DangerousOperation, string[]> = {
    git_push: [
      "typecheck passed",
      "tests passed",
      "lint passed",
      "code review completed",
    ],
    git_force_push: [
      "team notified",
      "backup branch created",
      "code review completed",
    ],
    production_deploy: [
      "smoke tests passed",
      "staging deployment verified",
      "rollback plan confirmed",
      "oncall notified",
    ],
    db_migration: [
      "backup created",
      "migration tested on staging",
      "rollback script verified",
      "data loss risk assessed",
    ],
    supabase_write: [
      "data validated",
      "backup created",
      "schema compatible",
    ],
    telegram_approval_authority: [
      "token verified",
      "user whitelist configured",
      "approval workflow documented",
    ],
    dangerous_file_change: [
      "file review completed",
      "impact assessment done",
      "alternative considered",
    ],
  };

  return checks[operation] || [];
}

/**
 * Check if a release gate request has passed all checks
 */
export function hasPassedAllChecks(request: ReleaseGateRequest): boolean {
  // In production, would verify each check
  // For now, just check that required checks exist
  return request.requiredChecks.length > 0;
}

/**
 * Export for testing
 */
export function clearAllReleaseGateRequests(): void {
  releaseGateRequests.clear();
}

/**
 * Get all release gate requests (for testing/admin)
 */
export function getAllReleaseGateRequests(): ReleaseGateRequest[] {
  return Array.from(releaseGateRequests.values());
}
