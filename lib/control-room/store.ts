import { promises as fs } from "fs";
import path from "path";
import type { AgentResult, AgentType, ControlRoomExecutionRun, ControlRoomPlan, DispatchJob } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PLANS_FILE = "control-room-plans.json";
const RUNS_FILE = "control-room-runs.json";
const RESULTS_FILE = "control-room-results.json";

type ControlRoomMemoryStore = {
  plans: ControlRoomPlan[];
  runs: ControlRoomExecutionRun[];
  results: AgentResult[];
};

const globalWithControlRoomStore = globalThis as typeof globalThis & {
  __controlRoomMemoryStore?: ControlRoomMemoryStore;
};

function memoryStore(): ControlRoomMemoryStore {
  if (!globalWithControlRoomStore.__controlRoomMemoryStore) {
    globalWithControlRoomStore.__controlRoomMemoryStore = {
      plans: [],
      runs: [],
      results: [],
    };
  }
  return globalWithControlRoomStore.__controlRoomMemoryStore;
}

function fallbackForFile<T>(fileName: string, fallback: T): T {
  const store = memoryStore();
  if (fileName === PLANS_FILE) return store.plans as T;
  if (fileName === RUNS_FILE) return store.runs as T;
  if (fileName === RESULTS_FILE) return store.results as T;
  return fallback;
}

function rememberFile<T>(fileName: string, value: T): void {
  const store = memoryStore();
  if (fileName === PLANS_FILE) store.plans = value as ControlRoomPlan[];
  if (fileName === RUNS_FILE) store.runs = value as ControlRoomExecutionRun[];
  if (fileName === RESULTS_FILE) store.results = value as AgentResult[];
}

async function readJson<T>(fileName: string, fallback: T): Promise<T> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    const parsed = JSON.parse(file) as T;
    rememberFile(fileName, parsed);
    return parsed;
  } catch {
    return fallbackForFile(fileName, fallback);
  }
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  rememberFile(fileName, value);
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, fileName),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn(`[control-room-store] disk write unavailable for ${fileName}; using volatile memory fallback`);
      return;
    }
    throw error;
  }
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

export async function getControlRoomRunById(
  runId: string,
): Promise<ControlRoomExecutionRun | null> {
  const runs = await getControlRoomRuns();
  return runs.find((run) => run.id === runId) ?? null;
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

export async function getPendingLocalRunnerJobs(input: {
  agents?: AgentType[];
  limit?: number;
} = {}): Promise<Array<{ run: ControlRoomExecutionRun; job: DispatchJob }>> {
  const runs = await getControlRoomRuns();
  const agentSet = input.agents?.length ? new Set(input.agents) : null;
  const limit = input.limit ?? 5;
  const jobs: Array<{ run: ControlRoomExecutionRun; job: DispatchJob }> = [];

  for (const run of runs) {
    for (const job of run.startedTasks) {
      const isClaimable = job.executionSurface === "local_runner" &&
        (job.status === "queued" || job.status === "approved");
      if (!isClaimable) continue;
      if (agentSet && !agentSet.has(job.agentId)) continue;
      jobs.push({ run, job });
    }
  }

  jobs.sort(
    (a, b) => new Date(a.job.createdAt).getTime() - new Date(b.job.createdAt).getTime(),
  );
  return jobs.slice(0, limit);
}

export async function claimLocalRunnerJobs(input: {
  runnerId: string;
  agents?: AgentType[];
  limit?: number;
}): Promise<DispatchJob[]> {
  const pending = await getPendingLocalRunnerJobs({
    agents: input.agents,
    limit: input.limit,
  });
  const claimedIds = new Set(pending.map(({ job }) => job.id));
  if (claimedIds.size === 0) return [];

  const now = new Date().toISOString();
  const runs = await getControlRoomRuns();
  const nextRuns = runs.map((run) => {
    let touched = false;
    const startedTasks = run.startedTasks.map((job) => {
      if (!claimedIds.has(job.id)) return job;
      touched = true;
      return {
        ...job,
        status: "running" as const,
        runId: run.id,
        claimedAt: now,
        claimedBy: input.runnerId,
      };
    });

    if (!touched) return run;
    return {
      ...run,
      status: "running" as const,
      startedTasks,
    };
  });

  await writeJson(RUNS_FILE, nextRuns);
  return nextRuns
    .flatMap((run) => run.startedTasks)
    .filter((job) => claimedIds.has(job.id));
}

export async function saveControlRoomResult(result: AgentResult): Promise<AgentResult> {
  const results = await readJson<AgentResult[]>(RESULTS_FILE, []);
  const index = results.findIndex((candidate) => candidate.id === result.id);
  const nextResults =
    index === -1
      ? [result, ...results]
      : results.map((candidate) => (candidate.id === result.id ? result : candidate));
  await writeJson(RESULTS_FILE, nextResults);
  return result;
}

export async function updateControlRoomRunJob(input: {
  dispatchJobId: string;
  result: AgentResult;
}): Promise<ControlRoomExecutionRun | null> {
  const runs = await getControlRoomRuns();
  let updatedRun: ControlRoomExecutionRun | null = null;
  const now = new Date().toISOString();

  const nextRuns = runs.map((run) => {
    const hasJob = run.startedTasks.some((job) => job.id === input.dispatchJobId);
    if (!hasJob) return run;

    const startedTasks = run.startedTasks.map((job) => {
      if (job.id !== input.dispatchJobId) return job;
      return {
        ...job,
        status: input.result.resultStatus === "pass" ? ("completed" as const) : ("failed" as const),
        completedAt: now,
        resultId: input.result.id,
      };
    });

    const allTerminal = startedTasks.every((job) =>
      ["completed", "failed", "skipped_due_to_risk"].includes(job.status),
    );
    const anyFailed = startedTasks.some((job) => job.status === "failed");
    const allCompleted = startedTasks.every((job) => job.status === "completed");

    updatedRun = {
      ...run,
      startedTasks,
      status: allCompleted ? "completed" : anyFailed ? "blocked" : allTerminal ? "blocked" : "running",
      completedAt: allCompleted ? now : run.completedAt,
      message: allCompleted
        ? "All local runner jobs completed. Review the roadmap and generated session reports."
        : "Local runner result received. Remaining jobs are still in progress or need review.",
    };
    return updatedRun;
  });

  if (!updatedRun) return null;
  await writeJson(RUNS_FILE, nextRuns);
  return updatedRun;
}
