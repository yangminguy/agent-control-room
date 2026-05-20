/**
 * T025: Agent Composition Executor
 *
 * intelligent router의 결과를 바탕으로:
 * 1. 멀티-에이전트 작업 계획 생성
 * 2. 의존성 기반 execution order 계산
 * 3. Kanban에서 시각화 가능한 SubAgentTrack[] 생성
 */

import type { PlanTask, SubAgentTrack, AgentType } from "@/lib/types";
import type { IntelligentRoutingResult, AgentRecommendation } from "./intelligent-router";
import { mapToExternalAgent } from "./intelligent-router";

export interface CompositionPlan {
  primaryTask: PlanTask;
  subTracks: SubAgentTrack[];
  totalEstimatedTokens: number;
  totalEstimatedTime: number;
  executionSequence: string[];
}

/**
 * intelligent router의 결과를 PlanTask + SubAgentTrack으로 변환
 *
 * @param routing Intelligent routing 결과
 * @param taskTitle 작업 제목
 * @param taskDescription 작업 설명
 * @param planId 소속 plan ID
 * @returns CompositionPlan with primary task and sub-agent tracks
 */
export function createCompositionPlan(
  routing: IntelligentRoutingResult,
  taskTitle: string,
  taskDescription: string,
  planId: string,
): CompositionPlan {
  const now = new Date().toISOString();

  // Primary task: 최종 외부 에이전트로 매핑
  const externalAgent = mapToExternalAgent(routing.primary.agent_id);

  const primaryTask: PlanTask = {
    id: `task-${Date.now()}`,
    planId,
    title: taskTitle,
    description: taskDescription,
    status: "ready",
    assignedAgent: externalAgent,
    priority: "P1",
    acceptanceCriteria: [
      `Primary agent (${routing.primary.agent_id})가 멀티-에이전트 composition 완료`,
      `모든 Sub-agent tracks 완료 (total: ${routing.composition.length + 1}개)`,
      `Git diff 분석 통과`,
    ],
    subAgentTracks: [],
    createdAt: now,
    updatedAt: now,
  };

  // SubAgentTracks 생성
  const allAgents: (AgentRecommendation & { type: "primary" | "secondary" | "composition" })[] = [
    { ...routing.primary, type: "primary" },
    ...routing.secondary.map((a) => ({ ...a, type: "secondary" as const })),
    ...routing.composition.map((a) => ({ ...a, type: "composition" as const })),
  ];

  const subTracks: SubAgentTrack[] = allAgents.map((agent, idx) => ({
    id: `track-${agent.agent_id}-${Date.now()}`,
    role: getAgentRole(agent.agent_id, agent.type),
    agentId: agent.agent_id,
    externalAgent: externalAgent,
    status: "planned",
    executionOrder: routing.executionOrder.indexOf(agent.agent_id),
    estimatedTokens: agent.estimated_tokens,
    estimatedMinutes: agent.estimated_time_minutes,
    summary: undefined,
  }));

  primaryTask.subAgentTracks = subTracks;

  return {
    primaryTask,
    subTracks,
    totalEstimatedTokens: routing.totalEstimatedTokens,
    totalEstimatedTime: routing.totalEstimatedTime,
    executionSequence: routing.executionOrder,
  };
}

/**
 * 에이전트별 역할 이름 생성
 *
 * @param agentId 에이전트 ID
 * @param type Agent recommendation type
 * @returns Role name
 */
function getAgentRole(
  agentId: string,
  type: "primary" | "secondary" | "composition",
): string {
  const roleMap: Record<string, Record<string, string>> = {
    "ui-designer": {
      primary: "UI 디자인 (Primary)",
      secondary: "UI 디자인 검토",
      composition: "UI 디자인 협업",
    },
    "frontend-developer": {
      primary: "프론트엔드 구현 (Primary)",
      secondary: "프론트엔드 구현 지원",
      composition: "프론트엔드 구현",
    },
    "backend-developer": {
      primary: "백엔드 구현 (Primary)",
      secondary: "백엔드 구현 지원",
      composition: "백엔드 구현",
    },
    "code-reviewer": {
      primary: "코드 검수 (Primary)",
      secondary: "코드 검수",
      composition: "코드 품질 검수",
    },
    "qa-expert": {
      primary: "QA (Primary)",
      secondary: "QA 지원",
      composition: "자동화된 QA",
    },
    "accessibility-tester": {
      primary: "접근성 테스트 (Primary)",
      secondary: "접근성 검수",
      composition: "WCAG 검사",
    },
    "documentation-engineer": {
      primary: "문서 생성 (Primary)",
      secondary: "문서 작성",
      composition: "자동 문서화",
    },
    "knowledge-synthesizer": {
      primary: "지식 합성 (Primary)",
      secondary: "패턴 분석",
      composition: "인사이트 생성",
    },
    "typescript-pro": {
      primary: "타입스크립트 (Primary)",
      secondary: "타입 검수",
      composition: "타입 안정성",
    },
  };

  if (roleMap[agentId]) {
    return roleMap[agentId][type] || `${agentId} (${type})`;
  }

  return `${agentId} (${type})`;
}

/**
 * SubAgentTrack를 실행 순서대로 정렬
 *
 * @param tracks SubAgentTracks
 * @returns Sorted tracks
 */
export function sortByExecutionOrder(tracks: SubAgentTrack[]): SubAgentTrack[] {
  return [...tracks].sort((a, b) => (a.executionOrder || 0) - (b.executionOrder || 0));
}

/**
 * Multi-agent composition 제작용 프롬프트 생성
 *
 * @param composition CompositionPlan
 * @param projectName 프로젝트 이름
 * @param projectContext 프로젝트 컨텍스트
 * @returns Copy-ready prompt
 */
export function generateCompositionPrompt(
  composition: CompositionPlan,
  projectName: string,
  projectContext: string,
): string {
  const sortedTracks = sortByExecutionOrder(composition.subTracks);
  const tracksDescription = sortedTracks
    .map(
      (track, idx) =>
        `${idx + 1}. **${track.role}** (${track.agentId})\n   - 예상 시간: ${track.estimatedMinutes}분\n   - 예상 토큰: ${track.estimatedTokens}`,
    )
    .join("\n");

  return `# 멀티-에이전트 Composition Task

## 프로젝트
- **이름**: ${projectName}
- **컨텍스트**: ${projectContext}

## 작업명
${composition.primaryTask.title}

## 설명
${composition.primaryTask.description}

## 멀티-에이전트 실행 계획

### 실행 순서 (${composition.executionSequence.length}개 에이전트)
${tracksDescription}

### 전체 예상값
- **총 소요 시간**: ${composition.totalEstimatedTime}분
- **총 토큰 수**: ${composition.totalEstimatedTokens.toLocaleString()}

## 수용 기준
${composition.primaryTask.acceptanceCriteria.map((c) => `- ${c}`).join("\n")}

## 실행 흐름

각 단계별로 지정된 에이전트가 작업을 수행합니다:
1. 각 에이전트는 이전 단계의 결과를 바탕으로 작업 진행
2. 각 단계 완료 후 결과 요약 제공
3. 최종 단계 완료 후 git diff 분석 자동 실행
4. 완료 판정 기반으로 다음 단계 결정

## 주의사항
- 각 에이전트는 지정된 역할에만 집중
- 의존성 있는 작업은 순서대로 진행
- 병렬 실행 가능한 작업은 동시 진행 권장
- 에러 발생 시 해당 단계 롤백`;
}

/**
 * Kanban에서 표시할 composition summary
 *
 * @param composition CompositionPlan
 * @returns Human-readable summary
 */
export function getCompositionSummary(composition: CompositionPlan): string {
  const agents = composition.subTracks
    .map((t) => t.agentId)
    .filter((v, i, a) => a.indexOf(v) === i)
    .join(", ");

  return `멀티-에이전트 작업: ${agents} (${composition.totalEstimatedTime}분 소요 예상)`;
}
