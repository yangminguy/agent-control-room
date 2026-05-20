import type { AgentStatusValue, AgentType } from "@/lib/types";

const FALLBACKS: Record<AgentType, AgentType> = {
  "claude-code": "codex",
  codex: "claude-code",
  antigravity: "codex",
};

export interface RoutingResult {
  recommendedAgent: AgentType;
  primaryReason: string;
  fallbackAgent?: AgentType;
  statusReason?: string;
  handoffRequired: boolean;
  handoffPrompt?: string;
}

export function routeAgent(
  workText: string,
  preferredAgentStatus: AgentStatusValue = "available",
): RoutingResult {
  const text = workText.toLowerCase();
  let recommendedAgent: AgentType = "claude-code";
  let primaryReason =
    "요구사항이 아직 넓거나 모호하므로 Claude Code가 먼저 구조와 작업 경계를 잡는 것이 적합합니다.";

  if (/(ui|화면|카드|레이아웃|프로토타입|visual|component)/i.test(text)) {
    recommendedAgent = "antigravity";
    primaryReason =
      "화면 구조와 시각적 구현이 중심이므로 Antigravity가 UI 흐름을 빠르게 만드는 데 적합합니다.";
  }

  if (/(bug|버그|test|type|타입|구현|api|storage|json|form|validation)/i.test(text)) {
    recommendedAgent = "codex";
    primaryReason =
      "요구사항이 구현, 테스트, 타입 안정성 중심이라 Codex에 맡기기 좋은 bounded task입니다.";
  }

  if (/(architecture|설계|prd|문서|판단|리팩토링|ambiguous|모호)/i.test(text)) {
    recommendedAgent = "claude-code";
    primaryReason =
      "문서 기반 판단과 설계 정리가 필요하므로 Claude Code가 먼저 방향을 정하는 것이 안전합니다.";
  }

  // Handle unavailable agents
  if (preferredAgentStatus === "cooling_down" || preferredAgentStatus === "blocked" || preferredAgentStatus === "limited") {
    const fallbackAgent = FALLBACKS[recommendedAgent];
    const statusReasonMap: Record<AgentStatusValue, string> = {
      available: "",
      limited: `${recommendedAgent}가 제한된 상태이므로`,
      cooling_down: `${recommendedAgent}가 쿨링다운 상태이므로`,
      blocked: `${recommendedAgent}가 차단된 상태이므로`,
      manual_only: `${recommendedAgent}가 수동 전용 상태이므로`,
    };

    const statusReason = statusReasonMap[preferredAgentStatus];
    const handoffPrompt = generateAgentSwitchHandoffPrompt(
      recommendedAgent,
      fallbackAgent,
      statusReason,
    );

    return {
      recommendedAgent: fallbackAgent,
      primaryReason,
      fallbackAgent: recommendedAgent,
      statusReason: `${statusReason} 대체 에이전트를 추천합니다.`,
      handoffRequired: true,
      handoffPrompt,
    };
  }

  return {
    recommendedAgent,
    primaryReason,
    fallbackAgent: undefined,
    statusReason: undefined,
    handoffRequired: false,
  };
}

export function generateAgentSwitchHandoffPrompt(
  originalAgent: AgentType,
  newAgent: AgentType,
  reason: string,
): string {
  const agentLabels: Record<AgentType, string> = {
    "claude-code": "Claude Code",
    codex: "Codex",
    antigravity: "Antigravity",
  };

  return `# Agent Handoff: ${agentLabels[originalAgent]} → ${agentLabels[newAgent]}

**이유:** ${reason}

${agentLabels[newAgent]}가 현재 작업을 이어받아 진행해주세요.

## 이전 에이전트 상태
- 원래 추천된 에이전트: ${agentLabels[originalAgent]}
- 현재 상태: unavailable

## 작업 진행
1. 프로젝트의 현재 상태 파악
2. 이전 에이전트의 작업 내용 검토
3. 작업을 이어서 계속 진행

## 주의사항
- 이 작업은 에이전트 전환으로 인해 할당된 것입니다
- 컨텍스트 손실을 최소화하기 위해 프로젝트 문서를 먼저 읽으세요
- 필요시 세션 리포트에서 이전 에이전트의 작업 내용을 참고하세요`;
}
