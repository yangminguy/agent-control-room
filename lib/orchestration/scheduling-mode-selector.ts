/**
 * Scheduling Mode Selector
 *
 * Evaluates task risk, file conflicts, and agent status to recommend
 * one of four execution modes: single, sequential, parallel, token_relay.
 *
 * Based on docs/AGENT_SCHEDULING_POLICY.md
 */

export type SchedulingMode = "single" | "sequential" | "parallel" | "token_relay";

export interface SchedulingModeDecision {
  mode: SchedulingMode;
  primaryAgent: string;
  secondaryAgents?: string[];
  reason: string;
  pmFriendlyDescription: string;
  isParallelSafe: boolean;
  conflictWarnings?: string[];
  allowedParallelization?: boolean;
}

interface SelectSchedulingModeInput {
  taskRiskLevel: "low" | "medium" | "high" | "critical";
  primaryAgent: string;
  primaryAgentStatus: string;
  filePaths: string[];
  requiresVerification: boolean;
  secondaryAgents?: string[];
}

const TOKEN_LIMITED_STATUSES = ["token_limited", "context_overloaded", "cooling_down"];

/**
 * Detects whether the provided file paths have a conflict risk.
 *
 * Conflict is defined as:
 * - Any exact duplicate path
 * - Two or more files sharing the same directory (siblings in the same folder
 *   are treated as potentially conflicting because agents may touch shared
 *   imports, barrel exports, or layout files in that directory)
 */
export function detectFileConflict(filePaths: string[]): boolean {
  if (filePaths.length <= 1) return false;

  // Exact duplicate paths
  const unique = new Set(filePaths);
  if (unique.size < filePaths.length) return true;

  // Same-directory siblings
  const dirs = filePaths.map((p) => {
    const parts = p.replace(/\\/g, "/").split("/");
    return parts.slice(0, -1).join("/");
  });
  const uniqueDirs = new Set(dirs);
  if (uniqueDirs.size < dirs.length) return true;

  return false;
}

export function selectSchedulingMode(input: SelectSchedulingModeInput): SchedulingModeDecision {
  const {
    taskRiskLevel,
    primaryAgent,
    primaryAgentStatus,
    filePaths,
    requiresVerification,
    secondaryAgents,
  } = input;

  const hasFileConflict = detectFileConflict(filePaths);

  // 1. Critical or high risk → Single Agent Mode (regardless of agent status)
  if (taskRiskLevel === "critical" || taskRiskLevel === "high") {
    const warnings = hasFileConflict
      ? ["파일 충돌 위험 감지됨 — 단일 에이전트 실행으로 충돌 방지"]
      : undefined;
    return {
      mode: "single",
      primaryAgent,
      secondaryAgents: undefined,
      reason: `위험도(${taskRiskLevel})가 높아 단일 에이전트 모드로 실행합니다.`,
      pmFriendlyDescription:
        "위험도가 높아서 한 에이전트가 처음부터 끝까지 작업합니다. QA 검토가 필요합니다.",
      isParallelSafe: false,
      conflictWarnings: warnings,
      allowedParallelization: false,
    };
  }

  // 2. Agent status requires relay → Token Relay Mode
  if (TOKEN_LIMITED_STATUSES.includes(primaryAgentStatus)) {
    const relay = secondaryAgents?.[0];
    return {
      mode: "token_relay",
      primaryAgent,
      secondaryAgents: relay ? [relay] : undefined,
      reason: `기본 에이전트 상태(${primaryAgentStatus})로 인해 Context Pack을 통해 다음 에이전트에게 인수인계합니다.`,
      pmFriendlyDescription:
        "첫 번째 에이전트가 토큰 한계에 도달하면 작업을 Context Pack과 함께 다음 에이전트에게 인수인계합니다.",
      isParallelSafe: false,
      conflictWarnings: undefined,
      allowedParallelization: false,
    };
  }

  // 3. Medium risk with file conflict → Sequential Mode
  if (hasFileConflict && taskRiskLevel === "medium") {
    const warnings = filePaths.length > 0
      ? [`파일 충돌 가능성: ${filePaths.join(", ")}`]
      : undefined;
    return {
      mode: "sequential",
      primaryAgent,
      secondaryAgents,
      reason: "파일 경로가 겹쳐 쓰기 순서가 중요합니다. 순차 실행으로 충돌을 방지합니다.",
      pmFriendlyDescription:
        "여러 에이전트가 차례대로 작업합니다. 파일 충돌 방지를 위해 순서를 보장합니다.",
      isParallelSafe: false,
      conflictWarnings: warnings,
      allowedParallelization: false,
    };
  }

  // 4. Parallel Safe — no conflict, low/medium risk, verification manageable
  const isParallelSafe = !hasFileConflict && !requiresVerification;
  if (isParallelSafe && (taskRiskLevel === "low" || taskRiskLevel === "medium")) {
    return {
      mode: "parallel",
      primaryAgent,
      secondaryAgents,
      reason: "파일 경로가 분리되어 있고 검증 단계가 필요하지 않아 병렬 실행이 안전합니다.",
      pmFriendlyDescription:
        "여러 에이전트가 동시에 다른 파일을 작업합니다. 빠르고 안전합니다.",
      isParallelSafe: true,
      conflictWarnings: undefined,
      allowedParallelization: true,
    };
  }

  // 5. Default fallback → Sequential (safe for remaining medium/low cases)
  const fallbackWarnings = hasFileConflict
    ? [`파일 충돌 가능성: ${filePaths.join(", ")}`]
    : undefined;
  return {
    mode: "sequential",
    primaryAgent,
    secondaryAgents,
    reason: "기본 안전 모드: 순차 실행으로 작업 순서를 보장합니다.",
    pmFriendlyDescription:
      "여러 에이전트가 차례대로 작업합니다. 파일 충돌 방지를 위해 순서를 보장합니다.",
    isParallelSafe: false,
    conflictWarnings: fallbackWarnings,
    allowedParallelization: false,
  };
}

interface ModeDescription {
  label: string;
  pmDescription: string;
  whenToUse: string[];
  forbidden: string[];
}

const MODE_DESCRIPTIONS: Record<SchedulingMode, ModeDescription> = {
  single: {
    label: "단일 실행",
    pmDescription:
      "한 에이전트가 처음부터 끝까지 작업합니다. 가장 안전하지만 느립니다.",
    whenToUse: [
      "높은 위험도(high/critical) 작업",
      "복합 리팩토링",
      "인증/보안 로직 변경",
      "DB 마이그레이션",
      "패키지 또는 배포 설정 변경",
    ],
    forbidden: [
      "프로덕션 배포 (사용자 수동 승인 필요)",
      "자동화된 DB 마이그레이션 (검토 없이)",
    ],
  },
  sequential: {
    label: "순차 실행",
    pmDescription:
      "여러 에이전트가 차례대로 작업합니다. 파일 충돌을 방지하고 작업 순서를 보장합니다.",
    whenToUse: [
      "파일 경로 겹침이 감지된 중간 위험도 작업",
      "타입 정의 → 구현 → 테스트 순서가 중요한 작업",
      "한 에이전트의 결과물이 다음 에이전트의 입력인 작업",
    ],
    forbidden: ["같은 파일을 두 에이전트가 동시에 편집하는 경우"],
  },
  parallel: {
    label: "병렬 실행 가능",
    pmDescription:
      "여러 에이전트가 동시에 다른 파일을 작업합니다. 빠르고 안전합니다.",
    whenToUse: [
      "파일 경로가 완전히 분리된 작업",
      "한 에이전트는 구현, 다른 에이전트는 별도 컴포넌트 작업",
      "Hermes가 모니터링만 담당하는 경우",
    ],
    forbidden: [
      "같은 파일을 두 에이전트가 동시에 편집하는 경우",
      "공유 데이터 모델 동시 수정",
      "승인 게이트 없는 고위험 작업",
    ],
  },
  token_relay: {
    label: "Token Relay (토큰 릴레이)",
    pmDescription:
      "첫 번째 에이전트가 토큰 한계에 도달하면 Context Pack과 함께 다음 에이전트에게 작업을 인수인계합니다.",
    whenToUse: [
      "기본 에이전트가 token_limited 또는 context_overloaded 상태일 때",
      "남은 작업이 다른 에이전트에게 더 적합할 때",
      "전체 재시작보다 인수인계가 효율적일 때",
    ],
    forbidden: ["Context Pack 없이 인수인계하는 경우", "승인 게이트 없이 자동 전환하는 경우"],
  },
};

export function getSchedulingModeDescription(mode: SchedulingMode): ModeDescription {
  return MODE_DESCRIPTIONS[mode];
}
