/**
 * Project Context Store
 * Persists and loads analyzed project context from disk cache
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { ProjectContext } from "@/lib/orchestration/project-context-manager";

const PROJECT_CONTEXTS_DIR = path.join(process.cwd(), "data", "project-contexts");

const globalWithProjectContexts = globalThis as typeof globalThis & {
  __projectContextMemoryStore?: Map<string, ProjectContext>;
};

function memoryStore(): Map<string, ProjectContext> {
  if (!globalWithProjectContexts.__projectContextMemoryStore) {
    globalWithProjectContexts.__projectContextMemoryStore = new Map();
  }
  return globalWithProjectContexts.__projectContextMemoryStore;
}

/**
 * Ensure project contexts directory exists
 */
async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(PROJECT_CONTEXTS_DIR, { recursive: true });
  } catch {
    // 무시
  }
}

/**
 * Save project context to disk
 */
export async function saveProjectContext(
  projectId: string,
  context: ProjectContext
): Promise<void> {
  memoryStore().set(projectId, context);
  try {
    await ensureDir();
    const filePath = path.join(PROJECT_CONTEXTS_DIR, `${projectId}.json`);
    await fs.writeFile(filePath, JSON.stringify(context, null, 2), "utf-8");
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "EROFS" || code === "EACCES" || code === "ENOENT") {
      console.warn(`[project-store] disk write unavailable (${projectId}); using volatile memory fallback`);
      return;
    }
    console.error(`[project-store] 저장 실패 (${projectId}):`, error);
    throw error;
  }
}

/**
 * Load project context from disk cache
 */
export async function loadProjectContext(
  projectId: string
): Promise<ProjectContext | null> {
  const cached = memoryStore().get(projectId);
  if (cached) return cached;

  try {
    const filePath = path.join(PROJECT_CONTEXTS_DIR, `${projectId}.json`);
    const content = await fs.readFile(filePath, "utf-8");
    const parsed = JSON.parse(content) as ProjectContext;
    memoryStore().set(projectId, parsed);
    return parsed;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    console.error(`[project-store] 로드 실패 (${projectId}):`, error);
    return null;
  }
}

/**
 * Delete project context from disk
 */
export async function deleteProjectContext(projectId: string): Promise<void> {
  memoryStore().delete(projectId);
  try {
    const filePath = path.join(PROJECT_CONTEXTS_DIR, `${projectId}.json`);
    await fs.unlink(filePath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error(`[project-store] 삭제 실패 (${projectId}):`, error);
    }
  }
}

/**
 * List all cached project contexts
 */
export async function listProjectContexts(): Promise<string[]> {
  const memoryKeys = Array.from(memoryStore().keys());
  try {
    const files = await fs.readdir(PROJECT_CONTEXTS_DIR);
    const diskKeys = files
      .filter((f) => f.endsWith(".json"))
      .map((f) => f.replace(".json", ""));
    return Array.from(new Set([...memoryKeys, ...diskKeys]));
  } catch {
    return memoryKeys;
  }
}
