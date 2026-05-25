import fs from "fs/promises";
import path from "path";
import { createWorkspace, listWorkspacesByTask } from "./workspace-store";
import type { AgentWorkspace } from "./agent-workspace-types";

// ─── Result type ─────────────────────────────────────────────────────────────

type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ─── Root resolution ──────────────────────────────────────────────────────────

/**
 * Returns the project root's .claude/workspaces/ directory.
 * Uses process.cwd() — no hardcoded user paths.
 */
export function getWorkspaceRoot(): Result<string> {
  try {
    const root = path.resolve(process.cwd(), ".claude", "workspaces");
    return { success: true, data: root };
  } catch (error) {
    return { success: false, error: `Failed to resolve workspace root: ${String(error)}` };
  }
}

// ─── Path safety ──────────────────────────────────────────────────────────────

/**
 * Sanitize a task ID or name into a filesystem-safe string.
 * Replaces any character that is not alphanumeric or a hyphen with an underscore.
 * Collapses consecutive underscores and trims leading/trailing underscores.
 */
export function sanitizeWorkspaceName(name: string): Result<string> {
  if (!name || name.trim() === "") {
    return { success: false, error: "Name must not be empty" };
  }
  const sanitized = name
    .replace(/[^a-zA-Z0-9-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");

  if (sanitized === "") {
    return { success: false, error: `Name "${name}" produced an empty sanitized result` };
  }
  return { success: true, data: sanitized };
}

/**
 * Resolve a safe absolute path for a workspace inside the project root.
 * Returns an error if the resolved path would escape the project root (directory traversal).
 */
export function resolveWorkspacePath(workspaceId: string): Result<string> {
  const rootResult = getWorkspaceRoot();
  if (!rootResult.success) return rootResult;

  const projectRoot = path.resolve(process.cwd());
  const resolvedPath = path.resolve(rootResult.data, workspaceId);

  // Ensure the resolved path stays within the project root
  if (!resolvedPath.startsWith(projectRoot + path.sep) && resolvedPath !== projectRoot) {
    return {
      success: false,
      error: `Directory traversal detected: "${workspaceId}" escapes the project root`,
    };
  }

  return { success: true, data: resolvedPath };
}

// ─── Worktree directory ───────────────────────────────────────────────────────

/**
 * Create the worktree directory at `.claude/worktrees/<workspaceId>/` inside parentPath.
 * parentPath defaults to process.cwd() if not provided.
 * Creates parent directories recursively.
 */
export async function createWorktreeDirectory(
  workspaceId: string,
  parentPath?: string,
): Promise<Result<string>> {
  const base = parentPath ?? process.cwd();
  const projectRoot = path.resolve(process.cwd());

  // Sanitize the workspace ID for use as a directory name
  const sanitizeResult = sanitizeWorkspaceName(workspaceId);
  if (!sanitizeResult.success) return sanitizeResult;

  const worktreePath = path.resolve(base, ".claude", "worktrees", sanitizeResult.data);

  // Prevent escaping the project root
  if (!worktreePath.startsWith(projectRoot + path.sep) && worktreePath !== projectRoot) {
    return {
      success: false,
      error: `Directory traversal detected: resolved worktree path escapes the project root`,
    };
  }

  try {
    await fs.mkdir(worktreePath, { recursive: true });
    return { success: true, data: worktreePath };
  } catch (error) {
    return {
      success: false,
      error: `Failed to create worktree directory at "${worktreePath}": ${String(error)}`,
    };
  }
}

// ─── Worktree candidates ──────────────────────────────────────────────────────

/**
 * List existing worktree directory names under baseDir/.claude/worktrees/.
 * Returns an empty array if the directory does not exist yet.
 */
export async function getWorktreePathCandidates(baseDir: string): Promise<Result<string[]>> {
  const worktreesDir = path.resolve(baseDir, ".claude", "worktrees");

  try {
    const entries = await fs.readdir(worktreesDir, { withFileTypes: true });
    const dirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(worktreesDir, entry.name));
    return { success: true, data: dirs };
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      return { success: true, data: [] };
    }
    return {
      success: false,
      error: `Failed to list worktree candidates in "${worktreesDir}": ${String(error)}`,
    };
  }
}

// ─── High-level workspace resolution ──────────────────────────────────────────

/**
 * Resolve a workspace for a given task.
 * If a workspace already exists for this task, return it.
 * Otherwise, create a new one.
 *
 * Phase B: Every execution must have a mandatory workspace.
 */
export async function resolveWorkspace(
  taskId: string,
  primaryAgent: "claude-code" | "codex" | "antigravity",
): Promise<AgentWorkspace> {
  // Try to find existing workspace for this task
  const existingResult = await listWorkspacesByTask(taskId);
  if (existingResult.success && existingResult.data.length > 0) {
    return existingResult.data[0];
  }

  // Create new workspace
  const createResult = await createWorkspace(taskId, primaryAgent);
  if (!createResult.success) {
    throw new Error(`Failed to create workspace: ${createResult.error}`);
  }
  return createResult.data;
}
