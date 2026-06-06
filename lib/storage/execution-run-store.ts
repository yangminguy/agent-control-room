/**
 * ExecutionRun Store — ACR Kernel
 *
 * Durable JSON storage for ExecutionRun records (PRD §8.2). Reuses the existing
 * ACR JSON storage convention: a single data/execution-runs.json file, an
 * in-memory fallback when disk is read-only, and a JSON_STORE_DATA_DIR env
 * override for test isolation (mirrors lib/storage/json-store.ts).
 *
 * This store only records run state. pulk CTO remains the source of truth for
 * tasks/specs/roadmap — ACR does not plan here.
 */

import { promises as fs } from "fs";
import path from "path";
import type {
  ExecutionAgent,
  ExecutionChecks,
  ExecutionRiskLevel,
  ExecutionRun,
  ExecutionRunStatus,
} from "@/lib/execution-run/types";
import { generateRunBranch, generateRunId } from "@/lib/execution-run/run-id";

const DATA_DIR = process.env.JSON_STORE_DATA_DIR || path.join(process.cwd(), "data");
const FILE_NAME = "execution-runs.json";

const globalWithStore = globalThis as typeof globalThis & {
  __executionRunMemoryStore?: ExecutionRun[];
};

function memoryStore(): ExecutionRun[] {
  if (!globalWithStore.__executionRunMemoryStore) {
    globalWithStore.__executionRunMemoryStore = [];
  }
  return globalWithStore.__executionRunMemoryStore;
}

async function readAll(): Promise<ExecutionRun[]> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, FILE_NAME), "utf8");
    const parsed = JSON.parse(file) as ExecutionRun[];
    globalWithStore.__executionRunMemoryStore = parsed;
    return parsed;
  } catch {
    return memoryStore();
  }
}

async function writeAll(runs: ExecutionRun[]): Promise<void> {
  globalWithStore.__executionRunMemoryStore = runs;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(
      path.join(DATA_DIR, FILE_NAME),
      `${JSON.stringify(runs, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn(`[execution-run-store] disk write unavailable for ${FILE_NAME}; using volatile memory fallback`);
      return;
    }
    throw error;
  }
}

// ─── Create ──────────────────────────────────────────────────────────────────

export type CreateExecutionRunInput = {
  taskId: string;
  repoPath: string;
  baseBranch: string;
  agent: ExecutionAgent;
  prompt: string;
  acceptanceCriteria?: string[];
  allowedFiles?: string[];
  blockedFiles?: string[];
  complexity: ExecutionRun["complexity"];
  mode: ExecutionRun["mode"];
  riskLevel?: ExecutionRiskLevel;
};

/**
 * 새 ExecutionRun을 생성하고 저장한다. status는 항상 'queued'로 시작한다.
 * runBranch는 PRD naming(agent/{taskId}-{runId})을 따른다.
 */
export async function createExecutionRun(input: CreateExecutionRunInput): Promise<ExecutionRun> {
  const runs = await readAll();
  const now = new Date();
  const id = generateRunId(runs, now);
  const iso = now.toISOString();

  const run: ExecutionRun = {
    id,
    taskId: input.taskId,
    source: "pulk-cto",
    agent: input.agent,
    status: "queued",
    repoPath: input.repoPath,
    baseBranch: input.baseBranch,
    runBranch: generateRunBranch(input.taskId, id),
    prompt: input.prompt,
    acceptanceCriteria: input.acceptanceCriteria ?? [],
    allowedFiles: input.allowedFiles ?? [],
    blockedFiles: input.blockedFiles ?? [],
    complexity: input.complexity,
    mode: input.mode,
    riskLevel: input.riskLevel,
    checks: {},
    changedFiles: [],
    createdAt: iso,
    updatedAt: iso,
  };

  await writeAll([run, ...runs]);
  return run;
}

// ─── Read ────────────────────────────────────────────────────────────────────

export async function getExecutionRun(runId: string): Promise<ExecutionRun | undefined> {
  const runs = await readAll();
  return runs.find((r) => r.id === runId);
}

export async function listExecutionRuns(): Promise<ExecutionRun[]> {
  return readAll();
}

export async function listExecutionRunsByTask(taskId: string): Promise<ExecutionRun[]> {
  const runs = await readAll();
  return runs.filter((r) => r.taskId === taskId);
}

// ─── Update ──────────────────────────────────────────────────────────────────

export type ExecutionRunPatch = Partial<{
  status: ExecutionRunStatus;
  worktreePath: string;
  runBranch: string;
  currentPhase: string;
  checks: ExecutionChecks;
  changedFiles: string[];
  diffStat: string;
  logTail: string;
  resultSummary: string;
  nextAction: string;
}>;

/**
 * 부분 갱신. 존재하지 않으면 undefined를 반환한다. updatedAt은 항상 갱신,
 * createdAt은 보존한다.
 */
export async function updateExecutionRun(
  runId: string,
  patch: ExecutionRunPatch,
): Promise<ExecutionRun | undefined> {
  const runs = await readAll();
  const index = runs.findIndex((r) => r.id === runId);
  if (index === -1) return undefined;

  const updated: ExecutionRun = {
    ...runs[index],
    ...patch,
    checks: patch.checks ? { ...runs[index].checks, ...patch.checks } : runs[index].checks,
    updatedAt: new Date().toISOString(),
  };
  runs[index] = updated;
  await writeAll(runs);
  return updated;
}

/** 테스트 전용: 인메모리/디스크 스토어를 비운다. */
export async function clearAllExecutionRuns(): Promise<void> {
  await writeAll([]);
}
