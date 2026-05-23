/**
 * T002: Next Task Router Enhancement
 * Phase 2: Multi-Agent Orchestration
 *
 * 역할: NextTaskRecommendation에 대해 에이전트를 라우팅하고
 *       자세한 선택 이유, 능력, 제약사항을 제공한다.
 *
 * 핵심 원칙:
 * - Codex와 Antigravity는 자동 실행 불가 (canAutoRun = false)
 * - Claude Code만 특정 저위험 작업에서 자동 실행 가능
 * - Hermes는 코딩 에이전트가 아님 (감시자, 기록자만)
 */

import type { AgentType } from "@/lib/types";
import type { NextTaskRecommendation } from "./next-task-generator";

/**
 * 에이전트별 상세 라우팅 정보
 */
export type AgentRoutingDetail = {
  agent: AgentType;
  capabilities: string[];              // "테스트 작성", "UI 개선" 등
  restrictions: string[];              // "자동 실행 불가", "코드 변경 불가" 등
  canAutoRun: boolean;                // 자동 실행 가능 여부
  reason: string;                      // 한국어 선택 이유 (1-2 문장)
  suggestedFileFocus?: string;         // 주요 수정 대상 파일/디렉토리
};

/**
 * NextTaskRecommendation 기반 에이전트 라우팅
 * 에이전트별 능력, 제약, 자동 실행 가능 여부를 함께 반환한다.
 */
export function routeNextTask(task: NextTaskRecommendation): AgentRoutingDetail {
  const taskTitle = task.title.toLowerCase();
  const description = (task.description ?? "").toLowerCase();

  // Claude Code 라우팅
  if (isClaudeCodeTask(taskTitle, description, task)) {
    return {
      agent: "claude-code",
      capabilities: [
        "복잡한 구현 및 아키텍처 변경",
        "통합 및 연동",
        "고위험 구현",
        "로드맵 분석",
        "드리프트 분석",
      ],
      restrictions: [
        "데이터베이스 마이그레이션 불가",
        "프로덕션 배포 불가",
        "의존성 변경 제약",
      ],
      canAutoRun: task.riskLevel === "low" && task.executionMode === "single",
      reason: task.recommendationReason,
      suggestedFileFocus: task.allowedFiles?.[0],
    };
  }

  // Codex 라우팅 (자동 실행 불가)
  if (isCodexTask(taskTitle, description, task)) {
    return {
      agent: "codex",
      capabilities: [
        "테스트 작성 및 실행",
        "QA 및 회귀 검증",
        "타입 오류 수정",
        "버그 격리 및 수정",
        "린트 및 포맷 검증",
      ],
      restrictions: ["자동 실행 불가", "구조적 변경 불가", "새 기능 추가 불가"],
      canAutoRun: false,
      reason: task.recommendationReason,
    };
  }

  // Antigravity 라우팅 (자동 실행 불가)
  if (isAntigravityTask(taskTitle, description, task)) {
    return {
      agent: "antigravity",
      capabilities: [
        "UI/UX 개선",
        "레이아웃 및 스타일",
        "시각적 QA",
        "한국어 문구 정리",
        "반응형 디자인",
      ],
      restrictions: [
        "자동 실행 불가",
        "비즈니스 로직 변경 불가",
        "데이터 모델 변경 불가",
      ],
      canAutoRun: false,
      reason: task.recommendationReason,
    };
  }

  // 기본값: Claude Code
  return {
    agent: "claude-code",
    capabilities: [
      "복잡한 구현",
      "아키텍처 검토",
      "통합",
      "로드맵 분석",
    ],
    restrictions: [
      "데이터베이스 마이그레이션 불가",
      "프로덕션 배포 불가",
    ],
    canAutoRun: false,
    reason: task.recommendationReason,
  };
}

/**
 * Claude Code 작업인지 판단
 * - 아키텍처, 통합, 드리프트, 구현 문제
 * - 고위험 작업
 */
function isClaudeCodeTask(
  taskTitle: string,
  description: string,
  task: NextTaskRecommendation,
): boolean {
  const combined = `${taskTitle} ${description}`;

  const indicators = [
    /architecture|architect|설계/i,
    /integration|통합|drift|일탈/i,
    /implement|구현|fix|수정/i,
    /refactor|리팩토링/i,
    /로드맵|roadmap/i,
    /분석|analysis/i,
  ];

  if (indicators.some((p) => p.test(combined))) {
    return true;
  }

  // 고위험 작업은 Claude Code
  if (["high", "critical"].includes(task.riskLevel)) {
    return true;
  }

  // 드리프트 분석은 Claude Code
  if (task.title.includes("드리프트") || task.title.includes("일탈")) {
    return true;
  }

  return false;
}

/**
 * Codex 작업인지 판단
 * - QA, 테스트, 버그 수정, 타입 에러
 */
function isCodexTask(
  taskTitle: string,
  description: string,
  task: NextTaskRecommendation,
): boolean {
  const combined = `${taskTitle} ${description}`;

  const indicators = [
    /qa|quality|assurance/i,
    /test|테스트/i,
    /regression|회귀/i,
    /bug|버그|fix|수정/i,
    /type.*error|타입|lint/i,
    /validate|검증/i,
  ];

  if (indicators.some((p) => p.test(combined))) {
    return true;
  }

  // 명시적으로 qa_needed 또는 retry
  if (task.title.includes("QA") || task.title.includes("회귀")) {
    return true;
  }

  return false;
}

/**
 * Antigravity 작업인지 판단
 * - UI, 레이아웃, 시각, 컴포넌트
 */
function isAntigravityTask(
  taskTitle: string,
  description: string,
  task: NextTaskRecommendation,
): boolean {
  const combined = `${taskTitle} ${description}`;

  const indicators = [
    /ui|ux|화면|screen|component|컴포넌트/i,
    /layout|레이아웃|style|스타일/i,
    /visual|시각|design|디자인/i,
    /frontend|프론트/i,
    /responsive|animation|애니메이션/i,
  ];

  return indicators.some((p) => p.test(combined));
}

/**
 * 에이전트의 능력을 한국어로 설명하는 헬퍼
 */
export function describeAgentCapabilities(agent: AgentType): string {
  const descriptions: Record<AgentType, string> = {
    "claude-code":
      "Claude Code는 복잡한 구현, 아키텍처 변경, 고위험 작업을 담당합니다. 로드맵 분석과 드리프트 감지도 수행합니다.",
    codex: "Codex는 테스트 작성, QA, 버그 수정, 타입 에러 해결을 전문으로 합니다. 자동 실행은 불가합니다.",
    antigravity:
      "Antigravity는 UI/UX 개선, 레이아웃, 시각 디자인을 담당합니다. 한국어 문구 정리도 수행합니다. 자동 실행은 불가합니다.",
  };

  return descriptions[agent] || "알 수 없는 에이전트";
}

/**
 * Codex와 Antigravity는 자동 실행이 불가능하다는 것을 강조하는 메시지
 */
export function getAutoRunDisabledReason(agent: AgentType): string | null {
  if (agent === "codex") {
    return "Codex는 테스트/QA 전문이므로 자동 실행이 불가합니다. 사용자 승인 후 실행하세요.";
  }
  if (agent === "antigravity") {
    return "Antigravity는 UI/디자인 작업이므로 자동 실행이 불가합니다. 시각적 검토 후 실행하세요.";
  }
  return null;
}
