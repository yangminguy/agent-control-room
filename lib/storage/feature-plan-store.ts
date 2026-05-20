import { promises as fs } from "fs";
import path from "path";
import type { FeaturePlan, PlanTask, PlanTaskStatus } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const FEATURE_PLANS_FILE = "feature-plans.json";

async function readJson<T>(fileName: string): Promise<T> {
  const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
  return JSON.parse(file) as T;
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

/** 모든 FeaturePlan 목록을 반환한다 */
export function getFeaturePlans(): Promise<FeaturePlan[]> {
  return readJson<FeaturePlan[]>(FEATURE_PLANS_FILE);
}

/** 특정 id의 FeaturePlan을 반환한다. 없으면 undefined */
export async function getFeaturePlanById(
  id: string,
): Promise<FeaturePlan | undefined> {
  const plans = await getFeaturePlans();
  return plans.find((p) => p.id === id);
}

/** 새 FeaturePlan을 추가하고 저장된 객체를 반환한다 */
export async function addFeaturePlan(
  plan: Omit<FeaturePlan, "id" | "createdAt" | "updatedAt">,
): Promise<FeaturePlan> {
  const plans = await getFeaturePlans();
  const now = new Date().toISOString();
  const newPlan: FeaturePlan = {
    ...plan,
    id: `plan-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson(FEATURE_PLANS_FILE, [newPlan, ...plans]);
  return newPlan;
}

/**
 * 특정 plan 내 태스크의 상태를 업데이트한다.
 * T017 "수동 완료 표시" 버튼에서 직접 사용된다.
 */
export async function updatePlanTaskStatus(
  planId: string,
  taskId: string,
  status: PlanTaskStatus,
): Promise<FeaturePlan> {
  const plans = await getFeaturePlans();
  const planIndex = plans.findIndex((p) => p.id === planId);

  if (planIndex === -1) {
    throw new Error(`FeaturePlan not found: ${planId}`);
  }

  const plan = plans[planIndex];
  const now = new Date().toISOString();

  const updatedTasks: PlanTask[] = plan.tasks.map((task) =>
    task.id === taskId ? { ...task, status, updatedAt: now } : task,
  );

  // 전체 plan 상태 자동 계산
  const allDone = updatedTasks.every((t) => t.status === "done");
  const anyBlocked = updatedTasks.some((t) => t.status === "blocked");
  const anyRunning = updatedTasks.some((t) => t.status === "running");
  const anyPartial = updatedTasks.some((t) => t.status === "partial");

  let planStatus: PlanTaskStatus = plan.status;
  if (allDone) planStatus = "done";
  else if (anyBlocked) planStatus = "blocked";
  else if (anyRunning) planStatus = "running";
  else if (anyPartial) planStatus = "partial";

  const updatedPlan: FeaturePlan = {
    ...plan,
    tasks: updatedTasks,
    status: planStatus,
    updatedAt: now,
  };

  plans[planIndex] = updatedPlan;
  await writeJson(FEATURE_PLANS_FILE, plans);
  return updatedPlan;
}

/**
 * KanbanCard 필드(변경파일, diff요약, 완료판정, 다음프롬프트)를 업데이트한다.
 * T019 Diff Analyzer에서 실행 후 자동 호출된다.
 */
export async function updateKanbanCardResult(
  planId: string,
  taskId: string,
  result: {
    changedFiles?: string[];
    diffSummary?: string;
    completionJudgment?: import("@/lib/types").CompletionJudgment;
    nextPrompt?: string;
    status?: PlanTaskStatus;
  },
): Promise<FeaturePlan> {
  const plans = await getFeaturePlans();
  const planIndex = plans.findIndex((p) => p.id === planId);

  if (planIndex === -1) {
    throw new Error(`FeaturePlan not found: ${planId}`);
  }

  const plan = plans[planIndex];
  const now = new Date().toISOString();

  const updatedTasks: PlanTask[] = plan.tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      ...(result.changedFiles !== undefined && {
        changedFiles: result.changedFiles,
      }),
      ...(result.diffSummary !== undefined && {
        diffSummary: result.diffSummary,
      }),
      ...(result.completionJudgment !== undefined && {
        completionJudgment: result.completionJudgment,
      }),
      ...(result.nextPrompt !== undefined && { nextPrompt: result.nextPrompt }),
      ...(result.status !== undefined && { status: result.status }),
      updatedAt: now,
    };
  });

  const updatedPlan: FeaturePlan = {
    ...plan,
    tasks: updatedTasks,
    updatedAt: now,
  };

  plans[planIndex] = updatedPlan;
  await writeJson(FEATURE_PLANS_FILE, plans);
  return updatedPlan;
}
