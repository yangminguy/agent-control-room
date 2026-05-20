import { promises as fs } from "fs";
import path from "path";
import type { ExecutionLog } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const EXECUTION_LOGS_FILE = "execution-logs.json";

async function readJson<T>(fileName: string): Promise<T> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    return JSON.parse(file) as T;
  } catch (error) {
    // 파일이 없으면 빈 배열 반환
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

/** 모든 ExecutionLog를 반환한다 */
export function getExecutionLogs(): Promise<ExecutionLog[]> {
  return readJson<ExecutionLog[]>(EXECUTION_LOGS_FILE);
}

/** 특정 planTaskId의 최신 ExecutionLog를 반환한다 */
export async function getExecutionLogByTaskId(
  planTaskId: string,
): Promise<ExecutionLog | undefined> {
  const logs = await getExecutionLogs();
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
  const logs = await getExecutionLogs();
  const now = new Date().toISOString();
  const newLog: ExecutionLog = {
    ...log,
    id: `exec-${Date.now()}`,
  };
  await writeJson(EXECUTION_LOGS_FILE, [newLog, ...logs]);
  return newLog;
}

/** 기존 ExecutionLog를 업데이트한다 */
export async function updateExecutionLog(
  id: string,
  update: Partial<ExecutionLog>,
): Promise<ExecutionLog> {
  const logs = await getExecutionLogs();
  const index = logs.findIndex((l) => l.id === id);

  if (index === -1) {
    throw new Error(`ExecutionLog not found: ${id}`);
  }

  const updated: ExecutionLog = {
    ...logs[index],
    ...update,
  };

  logs[index] = updated;
  await writeJson(EXECUTION_LOGS_FILE, logs);
  return updated;
}
