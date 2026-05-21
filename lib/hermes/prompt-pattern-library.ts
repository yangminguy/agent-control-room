import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_NAME = "prompt-patterns.json";

export interface PromptPattern {
  id: string;
  title: string;
  agentType: string;
  taskType: string;
  promptTemplate: string;
  successRate?: number;
  usageCount: number;
  createdAt: string;
  tags: string[];
}

// ─── JSON helpers ────────────────────────────────────────────────────────────

async function readAll(): Promise<PromptPattern[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, FILE_NAME), "utf8");
    return JSON.parse(raw) as PromptPattern[];
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw err;
  }
}

async function writeAll(patterns: PromptPattern[]): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, FILE_NAME),
    `${JSON.stringify(patterns, null, 2)}\n`,
    "utf8",
  );
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function getPromptPatterns(): Promise<PromptPattern[]> {
  return readAll();
}

export async function savePromptPattern(
  pattern: Omit<PromptPattern, "id" | "usageCount" | "createdAt">,
): Promise<PromptPattern> {
  const newPattern: PromptPattern = {
    ...pattern,
    id: `pattern-${crypto.randomUUID()}`,
    usageCount: 0,
    createdAt: new Date().toISOString(),
  };
  const all = await readAll();
  await writeAll([...all, newPattern]);
  return newPattern;
}

export async function getPatternsByAgent(agentType: string): Promise<PromptPattern[]> {
  const all = await readAll();
  return all.filter((p) => p.agentType === agentType);
}

export async function getPatternsByTaskType(taskType: string): Promise<PromptPattern[]> {
  const all = await readAll();
  return all.filter((p) => p.taskType === taskType);
}

export async function incrementUsage(patternId: string): Promise<void> {
  const all = await readAll();
  const updated = all.map((p) =>
    p.id === patternId ? { ...p, usageCount: p.usageCount + 1 } : p,
  );
  await writeAll(updated);
}

export async function getPopularPatterns(limit = 5): Promise<PromptPattern[]> {
  const all = await readAll();
  return [...all]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, limit);
}
