import { promises as fs } from "fs";
import path from "path";
import type { ExecutionLog } from "@/lib/types";
import { getSupabaseClient } from "./supabase-client";

const DATA_DIR = path.join(process.cwd(), "data");
const EXECUTION_LOGS_FILE = "execution-logs.json";

type DbRow = Record<string, string | number | boolean | null | unknown[] | object>;

// ─── JSON helpers (fallback) ────────────────────────────────────────────────

async function readJson<T>(fileName: string): Promise<T> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    return JSON.parse(file) as T;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [] as T;
    }
    throw error;
  }
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, fileName),
    `${JSON.stringify(value, null, 2)}\n`,
    "utf8",
  );
}

// ─── Row mappers ─────────────────────────────────────────────────────────────

function rowToExecutionLog(row: DbRow): ExecutionLog {
  return {
    id: row.id as string,
    planTaskId: row.plan_task_id as string,
    agent: row.agent as ExecutionLog["agent"],
    branchName: row.branch_name as string,
    startedAt: row.started_at as string,
    completedAt: row.completed_at != null ? (row.completed_at as string) : undefined,
    exitCode: row.exit_code != null ? (row.exit_code as number) : undefined,
    logLines: (row.log_lines as string[]) ?? [],
    status: row.status as ExecutionLog["status"],
  };
}

function executionLogToRow(log: ExecutionLog) {
  return {
    id: log.id,
    plan_task_id: log.planTaskId,
    agent: log.agent,
    branch_name: log.branchName,
    started_at: log.startedAt,
    completed_at: log.completedAt ?? null,
    exit_code: log.exitCode ?? null,
    log_lines: log.logLines,
    status: log.status,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** 모든 ExecutionLog를 반환한다 */
export async function getExecutionLogs(): Promise<ExecutionLog[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("execution_logs")
      .select("*")
      .order("started_at", { ascending: false });
    if (!error && data) return (data as DbRow[]).map(rowToExecutionLog);
  }
  return readJson<ExecutionLog[]>(EXECUTION_LOGS_FILE);
}

/** 특정 planTaskId의 최신 ExecutionLog를 반환한다 */
export async function getExecutionLogByTaskId(
  planTaskId: string,
): Promise<ExecutionLog | undefined> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("execution_logs")
      .select("*")
      .eq("plan_task_id", planTaskId)
      .order("started_at", { ascending: false })
      .limit(1)
      .single();
    if (!error && data) return rowToExecutionLog(data as DbRow);
  }

  const logs = await readJson<ExecutionLog[]>(EXECUTION_LOGS_FILE);
  return logs
    .filter((l) => l.planTaskId === planTaskId)
    .sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime(),
    )[0];
}

/** 새 ExecutionLog를 추가하고 저장된 객체를 반환한다 */
export async function addExecutionLog(
  log: Omit<ExecutionLog, "id">,
): Promise<ExecutionLog> {
  const newLog: ExecutionLog = {
    ...log,
    id: `exec-${Date.now()}`,
  };

  const db = getSupabaseClient();
  if (db) {
    const { error } = await db
      .from("execution_logs")
      .insert(executionLogToRow(newLog));
    if (!error) return newLog;
  }

  const logs = await readJson<ExecutionLog[]>(EXECUTION_LOGS_FILE);
  await writeJson(EXECUTION_LOGS_FILE, [newLog, ...logs]);
  return newLog;
}

/** 기존 ExecutionLog를 업데이트한다 */
export async function updateExecutionLog(
  id: string,
  update: Partial<ExecutionLog>,
): Promise<ExecutionLog> {
  const db = getSupabaseClient();
  if (db) {
    const { data: existing, error: fetchError } = await db
      .from("execution_logs")
      .select("*")
      .eq("id", id)
      .single();

    if (!fetchError && existing) {
      const updated: ExecutionLog = { ...rowToExecutionLog(existing as DbRow), ...update };
      const { error } = await db
        .from("execution_logs")
        .update(executionLogToRow(updated))
        .eq("id", id);
      if (!error) return updated;
    }
  }

  const logs = await readJson<ExecutionLog[]>(EXECUTION_LOGS_FILE);
  const index = logs.findIndex((l) => l.id === id);
  if (index === -1) throw new Error(`ExecutionLog not found: ${id}`);

  const updated: ExecutionLog = { ...logs[index], ...update };
  logs[index] = updated;
  await writeJson(EXECUTION_LOGS_FILE, logs);
  return updated;
}
