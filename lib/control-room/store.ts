import { promises as fs } from "fs";
import path from "path";
import type { ControlRoomExecutionRun, ControlRoomPlan } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PLANS_FILE = "control-room-plans.json";
const RUNS_FILE = "control-room-runs.json";

async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    return JSON.parse(file) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(
    path.join(DATA_DIR, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

export async function getControlRoomPlans(): Promise<ControlRoomPlan[]> {
  return readJson<ControlRoomPlan[]>(PLANS_FILE, []);
}

export async function getLatestControlRoomPlan(): Promise<ControlRoomPlan | null> {
  const plans = await getControlRoomPlans();
  return plans[0] ?? null;
}

export async function getControlRoomPlanById(
  planId: string,
): Promise<ControlRoomPlan | null> {
  const plans = await getControlRoomPlans();
  return plans.find((plan) => plan.id === planId) ?? null;
}

export async function saveControlRoomPlan(
  plan: ControlRoomPlan,
): Promise<ControlRoomPlan> {
  const plans = await getControlRoomPlans();
  const index = plans.findIndex((candidate) => candidate.id === plan.id);
  const nextPlans =
    index === -1
      ? [plan, ...plans]
      : plans.map((candidate) => (candidate.id === plan.id ? plan : candidate));
  await writeJson(PLANS_FILE, nextPlans);
  return plan;
}

export async function getControlRoomRuns(): Promise<ControlRoomExecutionRun[]> {
  return readJson<ControlRoomExecutionRun[]>(RUNS_FILE, []);
}

export async function saveControlRoomRun(
  run: ControlRoomExecutionRun,
): Promise<ControlRoomExecutionRun> {
  const runs = await getControlRoomRuns();
  const index = runs.findIndex((candidate) => candidate.id === run.id);
  const nextRuns =
    index === -1
      ? [run, ...runs]
      : runs.map((candidate) => (candidate.id === run.id ? run : candidate));
  await writeJson(RUNS_FILE, nextRuns);
  return run;
}
