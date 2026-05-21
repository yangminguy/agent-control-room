/**
 * Roadmap UI Adapter
 *
 * Claude's lib/types.ts RoadmapStage → Antigravity's RoadmapStageCard RoadmapStage
 *
 * This adapter converts the rich domain model into UI-friendly props without
 * weakening the data model itself.
 */

import type { RoadmapStage as DomainRoadmapStage } from "@/lib/types";
import type { RoadmapStage as UIRoadmapStage } from "@/components/roadmap/RoadmapStageCard";

/**
 * 도메인 RoadmapStage를 UI RoadmapStage로 변환
 *
 * 매핑:
 * - number → phaseNumber
 * - responsibleAgent (AgentType) → assignedAgent (string)
 * - blockers[0].description|requiredAction → blockerReason
 * - blockers[0].requiredAction → blockerUnlockAction
 * - blockers[0].blockedAgent → blockerResponsible
 * - userDecisions[0].question → userQuestion
 * - userDecisions[0].options → userDecisionOptions
 * - currentTaskId → currentTask (task 제목으로 변환)
 * - description/goal → description
 */
export function adaptRoadmapStageForUI(
  domainStage: DomainRoadmapStage,
): UIRoadmapStage {
  // currentTaskId로부터 실제 task 제목 찾기
  const safeTasks = domainStage.tasks ?? [];
  let currentTask: string | undefined;
  if (domainStage.currentTaskId && safeTasks.length > 0) {
    const task = safeTasks.find(
      (t) => t.id === domainStage.currentTaskId,
    );
    if (task) {
      currentTask = task.title;
    }
  }

  // 첫 번째 blocker 상세 정보 추출
  let blockerReason: string | undefined;
  let blockerUnlockAction: string | undefined;
  let blockerResponsible: string | undefined;
  if (domainStage.blockers && domainStage.blockers.length > 0) {
    const blocker = domainStage.blockers[0];
    blockerReason = blocker.description;
    blockerUnlockAction = blocker.requiredAction;
    blockerResponsible = blocker.blockedAgent ?? undefined;
  }

  // 첫 번째 사용자 결정 추출
  let userQuestion: string | undefined;
  let userDecisionOptions: string[] | undefined;
  if (domainStage.userDecisions && domainStage.userDecisions.length > 0) {
    userQuestion = domainStage.userDecisions[0].question;
    userDecisionOptions = domainStage.userDecisions[0].options;
  }

  // description 또는 goal 사용 (description 우선)
  const description = domainStage.description || domainStage.goal;

  return {
    id: domainStage.id,
    phaseNumber: domainStage.number,
    title: domainStage.title,
    description,
    status: domainStage.status,
    assignedAgent: domainStage.responsibleAgent,
    currentTask,
    nextAction: domainStage.nextAction,
    blockerReason,
    blockerUnlockAction,
    blockerResponsible,
    userQuestion,
    userDecisionOptions,
    acceptanceCriteria: domainStage.acceptanceCriteria,
  };
}

/**
 * 여러 도메인 stage들을 UI stage들로 변환
 */
export function adaptRoadmapStagesForUI(
  domainStages: DomainRoadmapStage[],
): UIRoadmapStage[] {
  return domainStages.map(adaptRoadmapStageForUI);
}
