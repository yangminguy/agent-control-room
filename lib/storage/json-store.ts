import { promises as fs } from "fs";
import path from "path";
import type { AgentStatus, Handoff, Project, SessionReport, Task } from "@/lib/types";
import { getSupabaseClient } from "./supabase-client";

const DATA_DIR = path.join(process.cwd(), "data");

const globalWithJsonStore = globalThis as typeof globalThis & {
  __jsonStorageMemoryStore?: Map<string, unknown>;
};

function memoryStore(): Map<string, unknown> {
  if (!globalWithJsonStore.__jsonStorageMemoryStore) {
    globalWithJsonStore.__jsonStorageMemoryStore = new Map();
  }
  return globalWithJsonStore.__jsonStorageMemoryStore;
}

// ─── JSON helpers (fallback) ────────────────────────────────────────────────

async function readJson<T>(fileName: string): Promise<T> {
  try {
    const file = await fs.readFile(path.join(DATA_DIR, fileName), "utf8");
    const parsed = JSON.parse(file) as T;
    memoryStore().set(fileName, parsed);
    return parsed;
  } catch {
    const cached = memoryStore().get(fileName);
    if (cached !== undefined) return cached as T;
    return [] as T;
  }
}

async function writeJson<T>(fileName: string, value: T): Promise<void> {
  memoryStore().set(fileName, value);
  try {
    await fs.writeFile(
      path.join(DATA_DIR, fileName),
      `${JSON.stringify(value, null, 2)}\n`,
      "utf8",
    );
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn(`[json-store] disk write unavailable for ${fileName}; using volatile memory fallback`);
      return;
    }
    throw error;
  }
}

// ─── Projects ───────────────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return (data as DbRow[]).map(rowToProject);
  }
  return readJson<Project[]>("projects.json");
}

export async function saveProject(project: Project): Promise<void> {
  const db = getSupabaseClient();
  if (db) {
    const { error } = await db
      .from("projects")
      .upsert(projectToRow(project));
    if (!error) return;
  }
  const projects = await readJson<Project[]>("projects.json");
  const index = projects.findIndex((p) => p.id === project.id);
  if (index === -1) {
    await writeJson("projects.json", [project, ...projects]);
  } else {
    projects[index] = project;
    await writeJson("projects.json", projects);
  }
}

// ─── Agent Statuses ─────────────────────────────────────────────────────────

export async function getAgentStatuses(): Promise<AgentStatus[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("agent_statuses")
      .select("*");
    if (!error && data) return (data as DbRow[]).map(rowToAgentStatus);
  }
  return readJson<AgentStatus[]>("agent-statuses.json");
}

// ─── Tasks ──────────────────────────────────────────────────────────────────

export async function getTasks(): Promise<Task[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return (data as DbRow[]).map(rowToTask);
  }
  return readJson<Task[]>("tasks.json");
}

// ─── Handoffs ────────────────────────────────────────────────────────────────

export async function getHandoffs(): Promise<Handoff[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("handoffs")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return (data as DbRow[]).map(rowToHandoff);
  }
  return readJson<Handoff[]>("handoffs.json");
}

// ─── Session Reports ────────────────────────────────────────────────────────

export async function getSessionReports(): Promise<SessionReport[]> {
  const db = getSupabaseClient();
  if (db) {
    const { data, error } = await db
      .from("session_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) return (data as DbRow[]).map(rowToSessionReport);
  }
  return readJson<SessionReport[]>("session-reports.json");
}

export async function addSessionReport(
  report: Omit<SessionReport, "id" | "createdAt" | "updatedAt">,
): Promise<SessionReport> {
  const now = new Date().toISOString();
  const nextReport: SessionReport = {
    ...report,
    id: `report-${Date.now()}`,
    createdAt: now,
    updatedAt: now,
  };

  const db = getSupabaseClient();
  if (db) {
    const { error } = await db
      .from("session_reports")
      .insert(sessionReportToRow(nextReport));
    if (!error) return nextReport;
  }

  const reports = await readJson<SessionReport[]>("session-reports.json");
  await writeJson("session-reports.json", [nextReport, ...reports]);
  return nextReport;
}

// ─── Row mappers ─────────────────────────────────────────────────────────────
// Supabase returns plain objects; we use a local DbRow alias to avoid any.

type DbRow = Record<string, string | number | boolean | null | unknown[] | object>;

function str(v: unknown): string { return v as string; }
function num(v: unknown): number { return v as number; }
function arr(v: unknown): string[] { return (v as string[] | null) ?? []; }

function rowToProject(row: DbRow): Project {
  return {
    id: str(row.id),
    name: str(row.name),
    path: str(row.path),
    description: row.description != null ? str(row.description) : undefined,
    baseTool: row.base_tool != null ? str(row.base_tool) as Project["baseTool"] : undefined,
    defaultAgent: str(row.default_agent) as Project["defaultAgent"],
    docs: (row.docs as Project["docs"]) ?? [],
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function projectToRow(p: Project) {
  return {
    id: p.id,
    name: p.name,
    path: p.path,
    description: p.description ?? null,
    base_tool: p.baseTool ?? null,
    default_agent: p.defaultAgent,
    docs: p.docs,
    created_at: p.createdAt,
    updated_at: p.updatedAt,
  };
}

function rowToAgentStatus(row: DbRow): AgentStatus {
  return {
    agent: str(row.agent) as AgentStatus["agent"],
    status: str(row.status) as AgentStatus["status"],
    reason: row.reason != null ? str(row.reason) : undefined,
    lastUsedAt: row.last_used_at != null ? str(row.last_used_at) : undefined,
    nextAvailableAt: row.next_available_at != null ? str(row.next_available_at) : undefined,
  };
}

function rowToTask(row: DbRow): Task {
  return {
    id: str(row.id),
    projectId: str(row.project_id),
    baseToolTaskId: row.base_tool_task_id != null ? str(row.base_tool_task_id) : undefined,
    title: str(row.title),
    userIntent: str(row.user_intent),
    technicalSummary: str(row.technical_summary),
    status: str(row.status) as Task["status"],
    recommendedAgent: str(row.recommended_agent) as Task["recommendedAgent"],
    priority: str(row.priority) as Task["priority"],
    acceptanceCriteria: arr(row.acceptance_criteria),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function rowToHandoff(row: DbRow): Handoff {
  return {
    id: str(row.id),
    projectId: str(row.project_id),
    taskId: str(row.task_id),
    fromAgent: str(row.from_agent) as Handoff["fromAgent"],
    toAgent: str(row.to_agent) as Handoff["toAgent"],
    reason: str(row.reason),
    completedWork: arr(row.completed_work),
    remainingWork: arr(row.remaining_work),
    changedFiles: arr(row.changed_files),
    forbiddenFiles: arr(row.forbidden_files),
    nextPrompt: str(row.next_prompt),
    createdAt: str(row.created_at),
  };
}

function rowToSessionReport(row: DbRow): SessionReport {
  return {
    id: str(row.id),
    projectId: str(row.project_id),
    taskId: str(row.task_id),
    agent: str(row.agent) as SessionReport["agent"],
    summary: str(row.summary),
    executionTimeMinutes: num(row.execution_time_minutes),
    tokensUsed: num(row.tokens_used),
    errors: arr(row.errors),
    changedFiles: arr(row.changed_files),
    testsRun: arr(row.tests_run),
    codeReviewScore: num(row.code_review_score),
    accessibilityScore: num(row.accessibility_score),
    performanceMetrics: row.performance_metrics != null
      ? row.performance_metrics as SessionReport["performanceMetrics"]
      : undefined,
    manualNotes: str(row.manual_notes),
    remainingIssues: arr(row.remaining_issues),
    completionJudgment: str(row.completion_judgment) as SessionReport["completionJudgment"],
    completionReason: str(row.completion_reason),
    nextTask: str(row.next_task),
    nextPrompt: str(row.next_prompt),
    recommendedAgent: str(row.recommended_agent) as SessionReport["recommendedAgent"],
    prdAlignmentScore: num(row.prd_alignment_score),
    risks: arr(row.risks),
    createdAt: str(row.created_at),
    updatedAt: str(row.updated_at),
  };
}

function sessionReportToRow(r: SessionReport) {
  return {
    id: r.id,
    project_id: r.projectId,
    task_id: r.taskId,
    agent: r.agent,
    summary: r.summary,
    execution_time_minutes: r.executionTimeMinutes,
    tokens_used: r.tokensUsed,
    errors: r.errors,
    changed_files: r.changedFiles,
    tests_run: r.testsRun,
    code_review_score: r.codeReviewScore,
    accessibility_score: r.accessibilityScore,
    performance_metrics: r.performanceMetrics ?? null,
    manual_notes: r.manualNotes,
    remaining_issues: r.remainingIssues,
    completion_judgment: r.completionJudgment,
    completion_reason: r.completionReason,
    next_task: r.nextTask,
    next_prompt: r.nextPrompt,
    recommended_agent: r.recommendedAgent,
    prd_alignment_score: r.prdAlignmentScore,
    risks: r.risks,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}
