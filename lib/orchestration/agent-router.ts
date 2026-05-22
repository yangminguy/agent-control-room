/**
 * Agent Router - Rule-based 에이전트 라우팅
 * Phase 40: Full Orchestration Layer
 *
 * 작업 설명과 위험도를 분석하여 적합한 에이전트를 추천한다.
 * LLM 호출 없이 키워드 기반 rule-based 판단을 사용한다.
 */

import type { RiskLevel } from "../types";
import type { ExtendedAgentType, AgentRoutingResult } from "./types";

type AgentRole = {
  label: string;
  description: string;
};

const AGENT_ROLES: Record<ExtendedAgentType, AgentRole> = {
  "claude-code": {
    label: "Claude Code",
    description: "아키텍처, 복잡한 구현, 통합, 고위험 변경을 담당합니다.",
  },
  codex: {
    label: "Codex",
    description: "테스트, QA, 타입 에러, 제한된 구현, 회귀 검증을 담당합니다.",
  },
  antigravity: {
    label: "Antigravity",
    description: "UI, 화면, 시각적 QA, 프론트엔드 개선을 담당합니다.",
  },
  hermes: {
    label: "Hermes",
    description:
      "감시자, 기록자, 요약자, Context Pack 압축자, Obsidian memory worker 역할입니다. 코드 변경은 하지 않습니다.",
  },
  "vibe-kanban": {
    label: "Vibe Kanban",
    description:
      "장시간 실행, 워크스페이스, 세션, diff/preview가 필요한 작업의 실행 워크벤치입니다.",
  },
  "manual-user": {
    label: "Manual/User",
    description:
      "비즈니스 결정, 방향 설정, 외부 시스템 접근이 필요한 경우 사용자가 직접 판단합니다.",
  },
};

// 위험한 패턴 - critical 위험도 지시자
const CRITICAL_PATTERNS = [
  /runner/i,
  /approval[\s_-]token/i,
  /child_process/i,
  /\.env/i,
  /deploy/i,
  /migration/i,
  /git[\s_-]push/i,
  /auto[\s_-]merge/i,
  /auth(?:entication|orization)/i,
  /database/i,
  /package\.json/i,
  /package-lock/i,
  /yarn\.lock/i,
  /production/i,
  /secret/i,
  /credential/i,
];

// 고위험 패턴 - Claude Code 지시자
const HIGH_RISK_PATTERNS = [
  /architect/i,
  /refactor/i,
  /integration/i,
  /api[\s_-]contract/i,
  /data[\s_-]model/i,
  /schema/i,
  /type[\s_-]system/i,
  /middleware/i,
  /orchestrat/i,
  /security/i,
  /permission/i,
];

// Codex 지시자
const CODEX_PATTERNS = [
  /test/i,
  /spec/i,
  /qa/i,
  /type[\s_-]error/i,
  /regression/i,
  /bug[\s_-]fix/i,
  /fix$/i,
  /lint/i,
  /typecheck/i,
  /unit[\s_-]test/i,
  /integration[\s_-]test/i,
];

// Antigravity 지시자
const ANTIGRAVITY_PATTERNS = [
  /ui/i,
  /layout/i,
  /visual/i,
  /screen/i,
  /component/i,
  /design/i,
  /style/i,
  /tailwind/i,
  /css/i,
  /frontend/i,
  /responsive/i,
  /animation/i,
];

// Hermes 지시자 (항상 secondary 또는 memory/summary 전용)
const HERMES_PATTERNS = [
  /summary/i,
  /memory/i,
  /obsidian/i,
  /context[\s_-]pack/i,
  /compress/i,
  /monitor/i,
  /log/i,
  /note/i,
  /insight/i,
];

// Vibe Kanban 지시자
const VIBE_KANBAN_PATTERNS = [
  /workspace/i,
  /session/i,
  /diff/i,
  /preview/i,
  /long[\s_-]running/i,
  /workbench/i,
  /kanban/i,
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

export function routeAgent(
  title: string,
  description: string,
  riskLevel: RiskLevel,
  filePaths?: string[]
): AgentRoutingResult {
  const combined = `${title} ${description} ${(filePaths ?? []).join(" ")}`;

  // critical → Claude Code (단일, 수동 승인 필수)
  if (riskLevel === "critical" || matchesAny(combined, CRITICAL_PATTERNS)) {
    return {
      primaryAgent: "claude-code",
      secondaryAgent: undefined,
      reasoning:
        "위험도 critical 또는 위험한 패턴(runner/auth/deploy/migration) 감지. Claude Code 단일 에이전트 필수.",
      agentRole: AGENT_ROLES["claude-code"].description,
    };
  }

  // high → Claude Code
  if (riskLevel === "high" || matchesAny(combined, HIGH_RISK_PATTERNS)) {
    return {
      primaryAgent: "claude-code",
      secondaryAgent: "codex",
      reasoning:
        "위험도 high 또는 아키텍처/통합 패턴 감지. Claude Code 주도, Codex QA 보조.",
      agentRole: AGENT_ROLES["claude-code"].description,
    };
  }

  // Hermes 전용 작업 (primary로는 never, summary/memory 작업일 때만)
  if (matchesAny(combined, HERMES_PATTERNS)) {
    const isHermesOnly =
      countMatches(combined, CODEX_PATTERNS) === 0 &&
      countMatches(combined, ANTIGRAVITY_PATTERNS) === 0;
    if (isHermesOnly) {
      return {
        primaryAgent: "hermes",
        secondaryAgent: undefined,
        reasoning:
          "메모리/요약/컨텍스트 압축 작업. Hermes는 코드 변경 없이 기록/요약만 수행.",
        agentRole: AGENT_ROLES["hermes"].description,
      };
    }
  }

  // Vibe Kanban 작업
  if (matchesAny(combined, VIBE_KANBAN_PATTERNS)) {
    return {
      primaryAgent: "vibe-kanban",
      secondaryAgent: undefined,
      reasoning:
        "장시간 실행/워크스페이스/diff 작업. Vibe Kanban 실행 워크벤치로 연결.",
      agentRole: AGENT_ROLES["vibe-kanban"].description,
    };
  }

  // Antigravity 작업
  const antigravityScore = countMatches(combined, ANTIGRAVITY_PATTERNS);
  const codexScore = countMatches(combined, CODEX_PATTERNS);

  if (antigravityScore > codexScore && antigravityScore > 0) {
    return {
      primaryAgent: "antigravity",
      secondaryAgent: "codex",
      reasoning:
        "UI/시각 작업 패턴 감지. Antigravity 주도, Codex 타입 검증 보조.",
      agentRole: AGENT_ROLES["antigravity"].description,
    };
  }

  // Codex 작업
  if (codexScore > 0) {
    return {
      primaryAgent: "codex",
      secondaryAgent: undefined,
      reasoning:
        "테스트/QA/타입 에러/버그 수정 패턴 감지. Codex로 제한된 구현 수행.",
      agentRole: AGENT_ROLES["codex"].description,
    };
  }

  // 기본값: medium 위험도는 Claude Code (안전 우선)
  if (riskLevel === "medium") {
    return {
      primaryAgent: "claude-code",
      secondaryAgent: "codex",
      reasoning:
        "중간 위험도 작업. Claude Code 구현 후 Codex QA 검증 권장.",
      agentRole: AGENT_ROLES["claude-code"].description,
    };
  }

  // low 위험도 기본값: Codex
  return {
    primaryAgent: "codex",
    secondaryAgent: undefined,
    reasoning:
      "낮은 위험도, 명확한 작업 유형 미감지. Codex로 구현 시도.",
    agentRole: AGENT_ROLES["codex"].description,
  };
}

export function getAgentRole(agent: ExtendedAgentType): AgentRole {
  return AGENT_ROLES[agent];
}

export function isHermesAllowedAsPrimary(taskType: string): boolean {
  return matchesAny(taskType, HERMES_PATTERNS);
}
