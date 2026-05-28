/**
 * CTO Task Metadata Store
 *
 * Sidecar store keyed by planId → per-task metadata that PlanTask does not carry:
 *   - auto_execute        (D1-D2 phases run without human click)
 *   - release_gate_type   (none / auto_24h / manual_founder)
 *   - risk_level          (D1-D5 from L5 CTO)
 *   - cwd                 (absolute project path resolved at dispatch time)
 *   - l5_task_id          (origin L5 task id, used for callback routing)
 *
 * Used by:
 *   - app/api/workbench/dispatch    → write on plan creation
 *   - lib/orchestration/auto-dispatcher → read to decide auto-execution eligibility
 */
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = process.env.FEATURE_PLANS_DATA_DIR || path.join(process.cwd(), "data");
const FILE = "cto-task-metadata.json";

export interface CTOTaskMetadata {
  planId: string;
  taskId: string;
  l5_task_id: string;
  auto_execute: boolean;
  release_gate_type: "none" | "auto_24h" | "manual_founder";
  risk_level: "D1" | "D2" | "D3" | "D4" | "D5";
  runtime: "claude" | "codex" | "antigravity" | "omc";
  cwd?: string;
  createdAt: string;
}

type Store = Record<string, CTOTaskMetadata>;

const g = globalThis as typeof globalThis & { __ctoTaskMetaStore?: Store };
function mem(): Store {
  if (!g.__ctoTaskMetaStore) g.__ctoTaskMetaStore = {};
  return g.__ctoTaskMetaStore;
}

function key(planId: string, taskId: string): string {
  return `${planId}::${taskId}`;
}

async function readAll(): Promise<Store> {
  try {
    const text = await fs.readFile(path.join(DATA_DIR, FILE), "utf8");
    const parsed = JSON.parse(text) as Store;
    g.__ctoTaskMetaStore = parsed;
    return parsed;
  } catch {
    return mem();
  }
}

async function writeAll(store: Store): Promise<void> {
  g.__ctoTaskMetaStore = store;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(path.join(DATA_DIR, FILE), `${JSON.stringify(store, null, 2)}\n`, "utf8");
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn("[cto-task-metadata] disk write unavailable; memory fallback");
      return;
    }
    throw err;
  }
}

export async function saveCTOTaskMetadata(meta: CTOTaskMetadata): Promise<void> {
  const store = await readAll();
  store[key(meta.planId, meta.taskId)] = meta;
  await writeAll(store);
}

export async function saveCTOTaskMetadataBatch(entries: CTOTaskMetadata[]): Promise<void> {
  const store = await readAll();
  for (const meta of entries) {
    store[key(meta.planId, meta.taskId)] = meta;
  }
  await writeAll(store);
}

export async function getCTOTaskMetadata(
  planId: string,
  taskId: string,
): Promise<CTOTaskMetadata | null> {
  const store = await readAll();
  return store[key(planId, taskId)] ?? null;
}

export async function listCTOTaskMetadataByPlan(planId: string): Promise<CTOTaskMetadata[]> {
  const store = await readAll();
  return Object.values(store).filter((m) => m.planId === planId);
}

export async function findCTOTaskMetadataByL5Id(
  l5_task_id: string,
): Promise<CTOTaskMetadata | null> {
  const store = await readAll();
  return Object.values(store).find((m) => m.l5_task_id === l5_task_id) ?? null;
}
