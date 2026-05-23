import { promises as fs } from "fs";
import path from "path";
import type { AgentStatus, AgentType } from "@/lib/types";
import { getSupabaseClient } from "./supabase-client";

// Support DATA_DIR override via environment for test isolation
const DATA_DIR = process.env.AGENT_STATUS_DATA_DIR || path.join(process.cwd(), "data");
const AGENT_STATUSES_FILE = "agent-statuses.json";

type DbRow = Record<string, string | number | boolean | null | unknown[] | object>;

// ─── JSON helpers (fallback) ────────────────────────────────────────────────

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

// ─── Row mapper ──────────────────────────────────────────────────────────────

function rowToAgentStatus(row: DbRow): AgentStatus {
  return {
    agent: row.agent as AgentStatus["agent"],
    status: row.status as AgentStatus["status"],
    reason: row.reason != null ? (row.reason as string) : undefined,
    lastUsedAt: row.last_used_at != null ? (row.last_used_at as string) : undefined,
    nextAvailableAt: row.next_available_at != null ? (row.next_available_at as string) : undefined,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function getAgentStatuses(): Promise<AgentStatus[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db.from("agent_statuses").select("*");
    if (!error && data) return (data as DbRow[]).map(rowToAgentStatus);
  }
  return readJson<AgentStatus[]>(AGENT_STATUSES_FILE);
}

export async function updateAgentStatus(
  agent: AgentType,
  update: Partial<AgentStatus>,
): Promise<AgentStatus> {
  const db = getSupabaseClient();

  if (db) {
    const { data: existing } = await db
      .from("agent_statuses")
      .select("*")
      .eq("agent", agent)
      .single();

    const existingParsed = existing ? rowToAgentStatus(existing as DbRow) : undefined;

    const updatedStatus: AgentStatus = {
      agent,
      status: update.status ?? existingParsed?.status ?? "available",
      reason: update.reason,
      lastUsedAt: update.lastUsedAt ?? existingParsed?.lastUsedAt,
      nextAvailableAt: update.nextAvailableAt,
    };

    const { error } = await db.from("agent_statuses").upsert({
      agent: updatedStatus.agent,
      status: updatedStatus.status,
      reason: updatedStatus.reason ?? null,
      last_used_at: updatedStatus.lastUsedAt ?? null,
      next_available_at: updatedStatus.nextAvailableAt ?? null,
      updated_at: new Date().toISOString(),
    });

    if (!error) return updatedStatus;
  }

  // JSON fallback
  const statuses = await readJson<AgentStatus[]>(AGENT_STATUSES_FILE);
  const existingStatus = statuses.find((s) => s.agent === agent);

  const updatedStatus: AgentStatus = {
    agent,
    status: update.status ?? existingStatus?.status ?? "available",
    reason: update.reason,
    lastUsedAt: update.lastUsedAt ?? existingStatus?.lastUsedAt,
    nextAvailableAt: update.nextAvailableAt,
  };

  const nextStatuses = existingStatus
    ? statuses.map((s) => (s.agent === agent ? updatedStatus : s))
    : [...statuses, updatedStatus];

  await writeJson(AGENT_STATUSES_FILE, nextStatuses);
  return updatedStatus;
}
