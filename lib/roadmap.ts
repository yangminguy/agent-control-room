import type { Roadmap, RoadmapStage, FeaturePlan, PlanTask } from "@/lib/types";

/**
 * 로드맵 진행률 계산 (0-100)
 * 모든 stage의 completionPercentage 평균
 */
export function getRoadmapProgress(roadmap: Roadmap): number {
  if (roadmap.stages.length === 0) return 0;
  const total = roadmap.stages.reduce((sum, stage) => sum + stage.completionPercentage, 0);
  return Math.round(total / roadmap.stages.length);
}

/**
 * 현재 활성화된 로드맵 단계 찾기
 * status === "active"인 첫 번째 stage
 */
export function getActiveRoadmapStage(roadmap: Roadmap): RoadmapStage | undefined {
  return roadmap.stages.find((stage) => stage.status === "active");
}

/**
 * 모든 차단된 단계 반환
 */
export function getBlockedStages(roadmap: Roadmap): RoadmapStage[] {
  return roadmap.stages.filter((stage) => stage.status === "blocked");
}

/**
 * 사용자 입력이 필요한 모든 단계 반환
 */
export function getUserInputRequiredStages(roadmap: Roadmap): RoadmapStage[] {
  return roadmap.stages.filter((stage) => stage.status === "user_input_required");
}

/**
 * 다음으로 진행할 단계 추천
 * - 현재 활성화된 단계가 있으면 그 단계
 * - 없으면 status === "waiting"인 첫 단계
 * - 차단되지 않은 첫 미완료 단계
 */
export function getNextAction(roadmap: Roadmap): {
  stage?: RoadmapStage;
  action: string;
} {
  const active = getActiveRoadmapStage(roadmap);
  if (active && active.nextAction) {
    return {
      stage: active,
      action: active.nextAction,
    };
  }

  const userInputNeeded = getUserInputRequiredStages(roadmap)[0];
  if (userInputNeeded) {
    return {
      stage: userInputNeeded,
      action: `사용자 결정 필요: ${userInputNeeded.userDecisions?.[0]?.question || ""}`,
    };
  }

  const blocked = getBlockedStages(roadmap)[0];
  if (blocked) {
    return {
      stage: blocked,
      action: `차단됨: ${blocked.blockers?.[0]?.title || ""}`,
    };
  }

  const nextWaiting = roadmap.stages.find((stage) => stage.status === "waiting");
  if (nextWaiting) {
    return {
      stage: nextWaiting,
      action: `다음 단계 대기: ${nextWaiting.title}`,
    };
  }

  return {
    action: "모든 단계 완료됨",
  };
}

/**
 * FeaturePlan을 RoadmapStage로 변환
 * 기존 feature-plans.json과의 호환성을 위한 어댑터
 */
export function convertFeaturePlanToStage(
  plan: FeaturePlan,
  stageNumber: number,
): RoadmapStage {
  const doneCount = plan.tasks.filter((t) => t.status === "done").length;
  const completionPercentage = Math.round((doneCount / plan.tasks.length) * 100);

  // FeaturePlan의 status를 RoadmapStatus로 매핑
  let roadmapStatus: "completed" | "active" | "waiting" | "blocked" | "user_input_required" | "failed" | "handoff_needed" =
    "waiting";
  if (plan.status === "done") {
    roadmapStatus = "completed";
  } else if (plan.status === "running") {
    roadmapStatus = "active";
  } else if (plan.status === "blocked") {
    roadmapStatus = "blocked";
  }

  return {
    id: plan.id,
    number: stageNumber,
    title: plan.title,
    goal: plan.userGoal,
    status: roadmapStatus,
    completionPercentage,
    tasks: plan.tasks,
    acceptanceCriteria: plan.tasks.flatMap((t) => t.acceptanceCriteria),
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
  };
}

/**
 * 여러 FeaturePlan을 Roadmap으로 변환
 */
export function convertFeaturePlansToRoadmap(
  projectId: string,
  plans: FeaturePlan[],
  productVision: string = "AI Development Control Tower",
): Roadmap {
  const stages = plans.map((plan, index) =>
    convertFeaturePlanToStage(plan, index + 1)
  );

  const completedCount = stages.filter((s) => s.status === "completed").length;
  const activeCount = stages.filter((s) => s.status === "active").length;
  const blockedCount = stages.filter((s) => s.status === "blocked").length;
  const overallProgress = Math.round(
    stages.reduce((sum, s) => sum + s.completionPercentage, 0) / stages.length || 0
  );

  return {
    id: `roadmap-${projectId}`,
    projectId,
    title: "Agent Control Room Development Roadmap",
    version: "1.0.0",
    productVision,
    stages,
    overallProgress,
    completedStageCount: completedCount,
    activeStageCount: activeCount,
    blockedStageCount: blockedCount,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * 로드맵 단계별 요약 생성
 * UI 렌더링용 간단한 텍스트
 */
export function summarizeRoadmapStage(stage: RoadmapStage): string {
  let summary = `${stage.title}: ${stage.completionPercentage}% 완료`;

  if (stage.status === "active") {
    summary += ` (진행 중)`;
  } else if (stage.status === "completed") {
    summary += ` ✓`;
  } else if (stage.status === "blocked") {
    summary += ` (차단됨)`;
  } else if (stage.status === "user_input_required") {
    summary += ` (입력 필요)`;
  }

  if (stage.responsibleAgent) {
    summary += ` - ${stage.responsibleAgent}`;
  }

  if (stage.nextAction) {
    summary += `\n다음: ${stage.nextAction}`;
  }

  return summary;
}
