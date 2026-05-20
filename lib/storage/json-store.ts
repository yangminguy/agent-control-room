import { promises as fs } from "fs";
import path from "path";
import type { AgentStatus, Handoff, Project, SessionReport, Task } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");

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

export function getProjects(): Promise<Project[]> {
  return readJson<Project[]>("projects.json");
}

export function getAgentStatuses(): Promise<AgentStatus[]> {
  return readJson<AgentStatus[]>("agent-statuses.json");
}

export function getTasks(): Promise<Task[]> {
  return readJson<Task[]>("tasks.json");
}

export function getHandoffs(): Promise<Handoff[]> {
  return readJson<Handoff[]>("handoffs.json");
}

export function getSessionReports(): Promise<SessionReport[]> {
  return readJson<SessionReport[]>("session-reports.json");
}

export async function addSessionReport(
  report: Omit<SessionReport, "id" | "createdAt" | "updatedAt">,
): Promise<SessionReport> {
  const reports = await getSessionReports();
  const now = new Date().toISOString();
  const nextReport: SessionReport = {
    ...report,
    id: `report-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };
  await writeJson("session-reports.json", [nextReport, ...reports]);
  return nextReport;
}
