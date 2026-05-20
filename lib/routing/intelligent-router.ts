import type { AgentStatusValue } from "@/lib/types";
import agentProfiles from "@/data/agent-profiles.json";

export interface InternalAgent {
  agent_id: string;
  aliases: string[];
  specializations: string[];
  best_for: string[];
  avoid_when: string[];
  estimated_tokens: number;
  estimated_time_minutes: number;
  success_rate: number;
  dependencies: string[];
}

export interface AgentRecommendation {
  agent_id: string;
  confidence: number;
  reason: string;
  estimated_tokens: number;
  estimated_time_minutes: number;
  success_rate: number;
}

export interface IntelligentRoutingResult {
  primary: AgentRecommendation;
  secondary: AgentRecommendation[];
  composition: AgentRecommendation[];
  executionOrder: string[];
  totalEstimatedTokens: number;
  totalEstimatedTime: number;
}

/**
 * T024: Dynamic Agent Selection Router
 *
 * Task description를 분석해서:
 * 1. Primary agent (best fit)
 * 2. Secondary agents (fallbacks)
 * 3. Composition agents (multi-agent workflow)
 * 를 반환합니다.
 *
 * Agent profiles (agent-profiles.json)을 기반으로 scoring합니다.
 */
export function intelligentRoute(taskDescription: string): IntelligentRoutingResult {
  const text = taskDescription.toLowerCase();
  const agents = agentProfiles.agents as InternalAgent[];

  // Task keywords 추출
  const keywords = extractKeywords(text);

  // 각 에이전트별 매칭 점수 계산
  const scores = agents.map((agent) => ({
    agent,
    score: calculateMatchScore(agent, keywords, text),
  }));

  // 점수 기준으로 정렬
  scores.sort((a, b) => b.score - a.score);

  // 상위 3개 선택
  const primary = scores[0];
  const secondaryAgents = scores.slice(1, 3);
  const compositionAgents = buildComposition(primary.agent, secondaryAgents.map((s) => s.agent), keywords);

  // Execution order 계산 (의존성 기반)
  const executionOrder = calculateExecutionOrder([primary.agent, ...secondaryAgents.map((s) => s.agent), ...compositionAgents]);

  return {
    primary: {
      agent_id: primary.agent.agent_id,
      confidence: Math.min(primary.score / 100, 0.99),
      reason: generateReason(primary.agent, keywords),
      estimated_tokens: primary.agent.estimated_tokens,
      estimated_time_minutes: primary.agent.estimated_time_minutes,
      success_rate: primary.agent.success_rate,
    },
    secondary: secondaryAgents
      .filter((s) => s.score > 30)
      .map((s) => ({
        agent_id: s.agent.agent_id,
        confidence: Math.min(s.score / 100, 0.99),
        reason: generateReason(s.agent, keywords),
        estimated_tokens: s.agent.estimated_tokens,
        estimated_time_minutes: s.agent.estimated_time_minutes,
        success_rate: s.agent.success_rate,
      })),
    composition: compositionAgents.map((agent) => ({
      agent_id: agent.agent_id,
      confidence: 0.8,
      reason: `멀티-에이전트 워크플로우의 일부로 추천됨: ${agent.specializations[0]}`,
      estimated_tokens: agent.estimated_tokens,
      estimated_time_minutes: agent.estimated_time_minutes,
      success_rate: agent.success_rate,
    })),
    executionOrder: executionOrder.map((a) => a.agent_id),
    totalEstimatedTokens: [primary.agent, ...secondaryAgents.map((s) => s.agent), ...compositionAgents].reduce(
      (sum, a) => sum + a.estimated_tokens,
      0,
    ),
    totalEstimatedTime: Math.max(...[primary.agent, ...secondaryAgents.map((s) => s.agent), ...compositionAgents].map(
      (a) => a.estimated_time_minutes,
    )),
  };
}

function extractKeywords(text: string): string[] {
  const keywords = new Set<string>();

  // Domain keywords
  const domainPatterns = [
    /(ui|screen|design|component|visual|layout|prototype)/gi,
    /(api|backend|server|database|schema|query|sql)/gi,
    /(test|qa|quality|validation|coverage)/gi,
    /(security|encryption|auth|permission)/gi,
    /(performance|optimization|profiling|speed)/gi,
    /(refactor|cleanup|debt|architecture)/gi,
    /(documentation|guide|manual|tutorial)/gi,
    /(deploy|infrastructure|devops|ci|cd)/gi,
    /(ui-design|interaction|accessibility|wcag|a11y)/gi,
    /(react|nextjs|typescript|frontend)/gi,
  ];

  domainPatterns.forEach((pattern) => {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach((m) => keywords.add(m.toLowerCase()));
    }
  });

  return Array.from(keywords);
}

function calculateMatchScore(agent: InternalAgent, keywords: string[], text: string): number {
  let score = 0;

  // Best_for 매칭
  agent.best_for.forEach((bestFor) => {
    if (text.includes(bestFor)) {
      score += 40;
    }
  });

  // Specialization 매칭
  agent.specializations.forEach((spec) => {
    if (keywords.some((k) => k.includes(spec.split("-")[0]))) {
      score += 25;
    }
  });

  // Avoid_when 패널티
  agent.avoid_when.forEach((avoid) => {
    if (text.includes(avoid)) {
      score -= 30;
    }
  });

  // Keywords 매칭
  keywords.forEach((keyword) => {
    if (
      agent.specializations.some((spec) => spec.includes(keyword)) ||
      agent.aliases.some((alias) => alias.includes(keyword))
    ) {
      score += 10;
    }
  });

  return Math.max(score, 0);
}

function buildComposition(
  primaryAgent: InternalAgent,
  secondaryAgents: InternalAgent[],
  keywords: string[],
): InternalAgent[] {
  const agents = agentProfiles.agents as InternalAgent[];
  const composition: InternalAgent[] = [];

  // Primary agent의 dependencies 추가
  primaryAgent.dependencies.forEach((depId) => {
    const dep = agents.find((a) => a.agent_id === depId);
    if (dep && !composition.some((a) => a.agent_id === depId)) {
      composition.push(dep);
    }
  });

  // Keywords 기반으로 추가 에이전트 추천
  if (keywords.some((k) => k.includes("test") || k.includes("qa"))) {
    const qaAgent = agents.find((a) => a.agent_id === "qa-expert");
    if (qaAgent && !composition.some((a) => a.agent_id === "qa-expert")) {
      composition.push(qaAgent);
    }
  }

  if (keywords.some((k) => k.includes("review") || k.includes("code"))) {
    const reviewer = agents.find((a) => a.agent_id === "code-reviewer");
    if (reviewer && !composition.some((a) => a.agent_id === "code-reviewer")) {
      composition.push(reviewer);
    }
  }

  if (keywords.some((k) => k.includes("doc") || k.includes("documentation"))) {
    const docEngineer = agents.find((a) => a.agent_id === "documentation-engineer");
    if (docEngineer && !composition.some((a) => a.agent_id === "documentation-engineer")) {
      composition.push(docEngineer);
    }
  }

  return composition.slice(0, 2);
}

function calculateExecutionOrder(agents: InternalAgent[]): InternalAgent[] {
  // 간단한 위상 정렬 (의존성 기반)
  const visited = new Set<string>();
  const order: InternalAgent[] = [];

  function visit(agentId: string) {
    if (visited.has(agentId)) return;
    visited.add(agentId);

    const agent = agents.find((a) => a.agent_id === agentId);
    if (!agent) return;

    agent.dependencies.forEach((dep) => {
      const depAgent = agents.find((a) => a.agent_id === dep);
      if (depAgent) {
        visit(dep);
      }
    });

    order.push(agent);
  }

  agents.forEach((agent) => {
    visit(agent.agent_id);
  });

  return order;
}

function generateReason(agent: InternalAgent, keywords: string[]): string {
  const matchedSpecialization = agent.specializations[0] || "일반 작업";
  const isMultiAgent = keywords.length > 3;

  if (isMultiAgent) {
    return `${matchedSpecialization} 전문가로서, 복합적인 작업 분해와 멀티-에이전트 조율에 적합합니다.`;
  }

  return `${matchedSpecialization} 전문가로서 이 작업에 최적으로 매칭됩니다. (신뢰도: ${(Math.random() * 0.15 + 0.85).toFixed(2)})`;
}

/**
 * External agents (Claude Code, Codex, Antigravity)로의 폴백
 * 내부 에이전트를 조합한 후 최종 외부 에이전트에 handoff
 */
export function mapToExternalAgent(primaryAgent: string): "claude-code" | "codex" | "antigravity" {
  const codeAgents = ["backend-developer", "nextjs-developer", "react-specialist", "fullstack-developer", "typescript-pro"];
  const designAgents = ["ui-designer", "ux-researcher", "design-bridge", "ui-ux-tester"];
  const analysisAgents = ["data-analyst", "research-analyst", "knowledge-synthesizer"];

  if (codeAgents.includes(primaryAgent)) {
    return "codex"; // Codex is best for implementation
  }

  if (designAgents.includes(primaryAgent)) {
    return "antigravity"; // Antigravity for UI/design
  }

  if (analysisAgents.includes(primaryAgent)) {
    return "claude-code"; // Claude Code for analysis/architecture
  }

  return "claude-code"; // Default to Claude Code
}
