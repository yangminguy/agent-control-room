import { promises as fs } from "fs";
import path from "path";
import type { AgentStatus, AgentType } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const AGENT_STATUSES_FILE = "agent-statuses.json";

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

export function getAgentStatuses(): Promise<AgentStatus[]> {
  return readJson<AgentStatus[]>(AGENT_STATUSES_FILE);
}

export async function updateAgentStatus(
  agent: AgentType,
  update: Partial<AgentStatus>,
): Promise<AgentStatus> {
  const statuses = await getAgentStatuses();
  const existingStatus = statuses.find((status) => status.agent === agent);

  const updatedStatus: AgentStatus = {
    agent,
    status: update.status ?? existingStatus?.status ?? "available",
    reason: update.reason,
    lastUsedAt: update.lastUsedAt ?? existingStatus?.lastUsedAt,
    nextAvailableAt: update.nextAvailableAt,
  };

  const nextStatuses = existingStatus
    ? statuses.map((status) => (status.agent === agent ? updatedStatus : status))
    : [...statuses, updatedStatus];

  await writeJson(AGENT_STATUSES_FILE, nextStatuses);
  return updatedStatus;
}
