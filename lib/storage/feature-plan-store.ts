import { promises as fs } from "fs";
import path from "path";
import type { FeaturePlan, PlanTask, PlanTaskStatus } from "@/lib/types";
import { getSupabaseClient } from "./supabase-client";

// Support DATA_DIR override via environment for test isolation
const DATA_DIR = process.env.FEATURE_PLANS_DATA_DIR || path.join(process.cwd(), "data");
const FEATURE_PLANS_FILE = "feature-plans.json";

type DbRow = Record<string, string | number | boolean | null | unknown[] | object>;

const globalWithFeaturePlans = globalThis as typeof globalThis & {
  __featurePlanMemoryStore?: FeaturePlan[];
};

function memoryPlans(): FeaturePlan[] {
  if (!globalWithFeaturePlans.__featurePlanMemoryStore) {
    globalWithFeaturePlans.__featurePlanMemoryStore = [];
  }
  return globalWithFeaturePlans.__featurePlanMemoryStore;
}

// ─── JSON helpers (fallback) ────────────────────────────────────────────────

async function readJson<T>(fileName: string): Promise<T> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    const parsed = JSON.parse(file) as T;
    if (fileName === FEATURE_PLANS_FILE) {
      globalWithFeaturePlans.__featurePlanMemoryStore = parsed as FeaturePlan[];
    }
    return parsed;
  } catch {
    if (fileName === FEATURE_PLANS_FILE) return memoryPlans() as T;
    throw new Error(`Unable to read ${fileName}`);
  }
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  if (fileName === FEATURE_PLANS_FILE) {
    globalWithFeaturePlans.__featurePlanMemoryStore = value as FeaturePlan[];
  }
  try {
    await fs.writeFile(
      path.join(DATA_DIR, fileName),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn(`[feature-plan-store] disk write unavailable for ${fileName}; using volatile memory fallback`);
      return;
    }
    throw error;
  }
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function rowToFeaturePlan(row: DbRow): FeaturePlan {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    title: row.title as string,
    userGoal: row.user_goal as string,
    status: row.status as PlanTaskStatus,
    tasks: (row.tasks as PlanTask[]) ?? [],
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function featurePlanToRow(plan: FeaturePlan) {
  return {
    id: plan.id,
    project_id: plan.projectId,
    title: plan.title,
    user_goal: plan.userGoal,
    status: plan.status,
    tasks: plan.tasks,
    created_at: plan.createdAt,
    updated_at: plan.updatedAt,
  };
}

// ─── JSON-only helpers for local mutation ───────────────────────────────────

async function readPlansJson(): Promise<FeaturePlan[]> {
  return readJson<FeaturePlan[]>(FEATURE_PLANS_FILE);
}

async function writePlansJson(plans: FeaturePlan[]): Promise<void> {
  await writeJson(FEATURE_PLANS_FILE, plans);
}

// ─── Public API ─────────────────────────────────────────────────────────────

/** 모든 FeaturePlan 목록을 반환한다 */
export async function getFeaturePlans(): Promise<FeaturePlan[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("feature_plans")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return (data as DbRow[]).map(rowToFeaturePlan);
  }
  return readPlansJson();
}

/** 특정 id의 FeaturePlan을 반환한다. 없으면 undefined */
export async function getFeaturePlanById(
  id: string,
): Promise<FeaturePlan | undefined> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("feature_plans")
      .select("*")
      .eq("id", id)
      .single();
    if (!error && data) return rowToFeaturePlan(data as DbRow);
  }
  const plans = await readPlansJson();
  return plans.find((p) => p.id === id);
}

/** 새 FeaturePlan을 추가하고 저장된 객체를 반환한다 */
export async function addFeaturePlan(
  plan: Omit<FeaturePlan, "id" | "createdAt" | "updatedAt">,
): Promise<FeaturePlan> {
  const now = new Date().toISOString();
  const newPlan: FeaturePlan = {
    ...plan,
    id: `plan-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  const db = getSupabaseClient();
  if (db) {
    const { error } = await db
      .from("feature_plans")
      .insert(featurePlanToRow(newPlan));
    if (!error) return newPlan;
  }

  const plans = await readPlansJson();
  await writePlansJson([newPlan, ...plans]);
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
  const plan = await getFeaturePlanById(planId);
  if (!plan) throw new Error(`FeaturePlan not found: ${planId}`);

  const now = new Date().toISOString();
  const updatedTasks: PlanTask[] = plan.tasks.map((task) =>
    task.id === taskId ? { ...task, status, updatedAt: now } : task,
  );

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

  return persistPlan(updatedPlan);
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
  const plan = await getFeaturePlanById(planId);
  if (!plan) throw new Error(`FeaturePlan not found: ${planId}`);

  const now = new Date().toISOString();
  const updatedTasks: PlanTask[] = plan.tasks.map((task) => {
    if (task.id !== taskId) return task;
    return {
      ...task,
      ...(result.changedFiles !== undefined && { changedFiles: result.changedFiles }),
      ...(result.diffSummary !== undefined && { diffSummary: result.diffSummary }),
      ...(result.completionJudgment !== undefined && { completionJudgment: result.completionJudgment }),
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

  return persistPlan(updatedPlan);
}

/**
 * Phase 18: append CTO clarification Q&A pairs to a PlanTask.
 * Idempotent on (question, answer) duplicates within the same call.
 */
export async function appendPlanTaskClarification(
  planId: string,
  taskId: string,
  items: Array<{ question: string; answer: string }>,
): Promise<FeaturePlan> {
  const plan = await getFeaturePlanById(planId);
  if (!plan) throw new Error(`FeaturePlan not found: ${planId}`);
  const now = new Date().toISOString();
  const updatedTasks: PlanTask[] = plan.tasks.map((task) => {
    if (task.id !== taskId) return task;
    const existing = task.clarificationAnswers ?? [];
    const additions = items.map((it) => ({
      question: it.question,
      answer: it.answer,
      answeredAt: now,
    }));
    return {
      ...task,
      clarificationAnswers: [...existing, ...additions],
      updatedAt: now,
    };
  });
  return persistPlan({ ...plan, tasks: updatedTasks, updatedAt: now });
}

export async function prepareLoopContinuation(
  planId: string,
  currentTaskId: string,
  nextPrompt: string,
): Promise<{ plan: FeaturePlan; targetTask: PlanTask | null }> {
  const plan = await getFeaturePlanById(planId);
  if (!plan) throw new Error(`FeaturePlan not found: ${planId}`);

  const currentTaskIndex = plan.tasks.findIndex((task) => task.id === currentTaskId);
  if (currentTaskIndex === -1) throw new Error(`PlanTask not found: ${currentTaskId}`);

  const currentTask = plan.tasks[currentTaskIndex];
  const targetTaskIndex =
    currentTask.completionJudgment === "completed"
      ? plan.tasks.findIndex(
          (task, index) => index > currentTaskIndex && task.status !== "done",
        )
      : currentTaskIndex;

  if (targetTaskIndex === -1) {
    const updatedPlan = { ...plan, updatedAt: new Date().toISOString() };
    return { plan: await persistPlan(updatedPlan), targetTask: null };
  }

  const now = new Date().toISOString();
  const updatedTasks = plan.tasks.map((task, index) =>
    index === targetTaskIndex
      ? { ...task, status: "ready" as PlanTaskStatus, generatedPrompt: nextPrompt, updatedAt: now }
      : task,
  );

  const updatedPlan: FeaturePlan = {
    ...plan,
    tasks: updatedTasks,
    status: "running",
    updatedAt: now,
  };

  const saved = await persistPlan(updatedPlan);
  return { plan: saved, targetTask: updatedTasks[targetTaskIndex] };
}

// ─── Internal persist helper ─────────────────────────────────────────────────

async function persistPlan(plan: FeaturePlan): Promise<FeaturePlan> {
  const db = getSupabaseClient();
  if (db) {
    const { error } = await db
      .from("feature_plans")
      .upsert(featurePlanToRow(plan));
    if (!error) return plan;
  }

  const plans = await readPlansJson();
  const index = plans.findIndex((p) => p.id === plan.id);
  if (index === -1) {
    await writePlansJson([plan, ...plans]);
  } else {
    plans[index] = plan;
    await writePlansJson(plans);
  }
  return plan;
}
