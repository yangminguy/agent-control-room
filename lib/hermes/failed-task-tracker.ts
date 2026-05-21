import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_NAME = "failed-tasks.json";

export interface FailedTaskRecord {
  id: string;
  taskId: string;
  taskTitle: string;
  failedAt: string;
  reason: string;
  classification: "QA" | "Blocked" | "MinorFix";
  retryCount: number;
  isRetryCandidate: boolean;
  notes?: string;
}

// ─── JSON helpers ────────────────────────────────────────────────────────────

async function readAll(): Promise<FailedTaskRecord[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, FILE_NAME), "utf8");
    return JSON.parse(raw) as FailedTaskRecord[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(records: FailedTaskRecord[]): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, FILE_NAME),
    `${JSON.stringify(records, null, 2)}\n`,
    "utf8",
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function addFailedTask(
  record: Omit<FailedTaskRecord, "id">,
): Promise<FailedTaskRecord> {
  const id = `failed-${crypto.randomUUID()}`;
  const newRecord: FailedTaskRecord = { id, ...record };
  const all = await readAll();
  await writeAll([newRecord, ...all]);
  return newRecord;
}

export async function getFailedTasks(): Promise<FailedTaskRecord[]> {
  return readAll();
}

export async function getRetryCandidates(): Promise<FailedTaskRecord[]> {
  const all = await readAll();
  return all.filter((r) => r.isRetryCandidate);
}

export async function markRetried(taskId: string): Promise<void> {
  const all = await readAll();
  const updated = all.map((r) => {
    if (r.taskId !== taskId) return r;
    const nextRetryCount = r.retryCount + 1;
    return {
      ...r,
      retryCount: nextRetryCount,
      isRetryCandidate: nextRetryCount < 3,
    };
  });
  await writeAll(updated);
}

export async function updateFailedTask(
  id: string,
  updates: Partial<FailedTaskRecord>,
): Promise<void> {
  const all = await readAll();
  const updated = all.map((r) => (r.id === id ? { ...r, ...updates } : r));
  await writeAll(updated);
}

export async function deleteFailedTask(id: string): Promise<void> {
  const all = await readAll();
  await writeAll(all.filter((r) => r.id !== id));
}
