import fs from "fs/promises";
import path from "path";
import { AgentWorkspace, WorkspaceArtifact, WorkspaceStatus } from "./agent-workspace-types";

// ─── Result type ─────────────────────────────────────────────────────────────

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── In-memory store + JSON persistence ──────────────────────────────────────

const STORE_FILE = path.join(process.cwd(), "data", "workspaces.json");

const globalWithStore = globalThis as typeof globalThis & {
  __workspaceStore?: Map<string, AgentWorkspace>;
};

function getStore(): Map<string, AgentWorkspace> {
  if (!globalWithStore.__workspaceStore) {
    globalWithStore.__workspaceStore = new Map();
  }
  return globalWithStore.__workspaceStore;
}

async function persistStore(): Promise<void> {
  const store = getStore();
  const entries = Array.from(store.values());
  try {
    await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
    await fs.writeFile(STORE_FILE, JSON.stringify(entries, null, 2) + "\n", "utf8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES") {
      console.warn("[workspace-store] disk write unavailable; using volatile memory fallback");
      return;
    }
    throw error;
  }
}

async function hydrateFromDisk(): Promise<void> {
  const store = getStore();
  if (store.size > 0) return; // Already loaded
  try {
    const content = await fs.readFile(STORE_FILE, "utf8");
    const entries = JSON.parse(content) as AgentWorkspace[];
    for (const workspace of entries) {
      store.set(workspace.id, workspace);
    }
  } catch {
    // File doesn't exist yet or is unreadable — start with empty store
  }
}

// ─── ID and branch name helpers ───────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID();
}

function buildBranchName(taskId: string, workspaceId: string): string {
  // Sanitize each segment individually before composing
  const safeTask = taskId.replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const safeWs = workspaceId.slice(0, 8);
  return `task-${safeTask}-ws-${safeWs}`;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Create a new workspace for a given task and primary agent.
 * One workspace per task (1:1 relationship enforced by caller convention).
 */
export async function createWorkspace(
  taskId: string,
  primaryAgent: AgentWorkspace["primaryAgent"],
  planId?: string,
): Promise<Result<AgentWorkspace>> {
  if (!taskId || taskId.trim() === "") {
    return { success: false, error: "taskId is required" };
  }

  await hydrateFromDisk();

  const id = generateId();
  const now = new Date().toISOString();

  const runtimeMap: Record<AgentWorkspace["primaryAgent"], AgentWorkspace["runtimeId"]> = {
    "claude-code": "claude-direct",
    "codex": "codex-direct",
    "antigravity": "antigravity-direct",
  };

  const workspace: AgentWorkspace = {
    id,
    taskId,
    planId,
    primaryAgent,
    runtimeId: runtimeMap[primaryAgent],
    branchName: buildBranchName(taskId, id),
    status: "created",
    changedFiles: [],
    artifacts: [],
    createdAt: now,
    updatedAt: now,
  };

  getStore().set(id, workspace);
  await persistStore();

  return { success: true, data: workspace };
}

/**
 * Retrieve a workspace by ID.
 */
export async function getWorkspace(workspaceId: string): Promise<Result<AgentWorkspace>> {
  await hydrateFromDisk();
  const workspace = getStore().get(workspaceId);
  if (!workspace) {
    return { success: false, error: `Workspace not found: ${workspaceId}` };
  }
  return { success: true, data: workspace };
}

/**
 * Update the status of a workspace and refresh updatedAt.
 */
export async function updateWorkspaceStatus(
  workspaceId: string,
  status: WorkspaceStatus,
): Promise<Result<AgentWorkspace>> {
  await hydrateFromDisk();
  const store = getStore();
  const workspace = store.get(workspaceId);
  if (!workspace) {
    return { success: false, error: `Workspace not found: ${workspaceId}` };
  }

  const updated: AgentWorkspace = {
    ...workspace,
    status,
    updatedAt: new Date().toISOString(),
  };

  store.set(workspaceId, updated);
  await persistStore();

  return { success: true, data: updated };
}

/**
 * Add a changed file path to a workspace. Duplicates are silently ignored.
 */
export async function addChangedFile(
  workspaceId: string,
  filePath: string,
): Promise<Result<AgentWorkspace>> {
  await hydrateFromDisk();
  const store = getStore();
  const workspace = store.get(workspaceId);
  if (!workspace) {
    return { success: false, error: `Workspace not found: ${workspaceId}` };
  }

  if (workspace.changedFiles.includes(filePath)) {
    return { success: true, data: workspace };
  }

  const updated: AgentWorkspace = {
    ...workspace,
    changedFiles: [...workspace.changedFiles, filePath],
    updatedAt: new Date().toISOString(),
  };

  store.set(workspaceId, updated);
  await persistStore();

  return { success: true, data: updated };
}

/**
 * Append an artifact to a workspace.
 */
export async function addArtifact(
  workspaceId: string,
  artifact: WorkspaceArtifact,
): Promise<Result<AgentWorkspace>> {
  await hydrateFromDisk();
  const store = getStore();
  const workspace = store.get(workspaceId);
  if (!workspace) {
    return { success: false, error: `Workspace not found: ${workspaceId}` };
  }

  const updated: AgentWorkspace = {
    ...workspace,
    artifacts: [...workspace.artifacts, artifact],
    updatedAt: new Date().toISOString(),
  };

  store.set(workspaceId, updated);
  await persistStore();

  return { success: true, data: updated };
}

/**
 * List all workspaces associated with a given task.
 */
export async function listWorkspacesByTask(taskId: string): Promise<Result<AgentWorkspace[]>> {
  await hydrateFromDisk();
  const results = Array.from(getStore().values()).filter((ws) => ws.taskId === taskId);
  return { success: true, data: results };
}

/**
 * Archive a workspace. Sets status to "archived"; does not remove the record.
 */
export async function archiveWorkspace(workspaceId: string): Promise<Result<AgentWorkspace>> {
  return updateWorkspaceStatus(workspaceId, "archived");
}

/**
 * Delete a workspace from the store entirely. Admin use only — prefer archiveWorkspace.
 */
export async function deleteWorkspace(workspaceId: string): Promise<Result<{ deleted: string }>> {
  await hydrateFromDisk();
  const store = getStore();
  if (!store.has(workspaceId)) {
    return { success: false, error: `Workspace not found: ${workspaceId}` };
  }

  store.delete(workspaceId);
  await persistStore();

  return { success: true, data: { deleted: workspaceId } };
}
