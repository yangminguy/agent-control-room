import { promises as fs } from "fs";
import path from "path";
import type { AgentResult, AgentType } from "@/lib/types";
import { AgentResultSchema } from "./agent-result-schema";
import {
  normalizePastedResult,
  normalizeJsonResult,
  normalizeVibeKanbanResult,
} from "./agent-result-schema";

// ─── Storage helpers ──────────────────────────────────────────────────────────

const DATA_DIR = path.join(process.cwd(), "data");
const RESULTS_FILE = "agent-results.json";

async function readResults(): Promise<AgentResult[]> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, RESULTS_FILE), "utf8");
    return JSON.parse(raw) as AgentResult[];
  } catch {
    // File does not exist yet — return empty list
    return [];
  }
}

async function writeResults(results: AgentResult[]): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, RESULTS_FILE),
    `${JSON.stringify(results, null, 2)}\n`,
    "utf8",
  );
}

// ─── Context type ─────────────────────────────────────────────────────────────

export type CollectContext = {
  taskId: string;
  agentId: AgentType;
  dispatchJobId?: string;
};

// ─── ResultCollectorService ───────────────────────────────────────────────────

export class ResultCollectorService {
  /**
   * Collect a result from pasted free-form text.
   * Throws a ZodError if the normalized result fails schema validation.
   */
  async collectPastedResult(
    text: string,
    context: CollectContext,
  ): Promise<AgentResult> {
    const result = normalizePastedResult(text, context.taskId, context.agentId);
    const patched = this._applyDispatchJobId(result, context.dispatchJobId);
    const validated = AgentResultSchema.parse(patched);
    await this.storeResult(validated);
    return validated;
  }

  /**
   * Collect a result from a structured JSON object.
   * Throws a ZodError if the normalized result fails schema validation.
   */
  async collectJsonResult(
    json: unknown,
    context: CollectContext,
  ): Promise<AgentResult> {
    const result = normalizeJsonResult(json, context.taskId, context.agentId);
    const patched = this._applyDispatchJobId(result, context.dispatchJobId);
    const validated = AgentResultSchema.parse(patched);
    await this.storeResult(validated);
    return validated;
  }

  /**
   * Collect a result from a Vibe Kanban result object.
   * Throws a ZodError if the normalized result fails schema validation.
   */
  async collectVibeKanbanResult(
    vkData: unknown,
    context: CollectContext,
  ): Promise<AgentResult> {
    const result = normalizeVibeKanbanResult(vkData, context.taskId, context.agentId);
    const patched = this._applyDispatchJobId(result, context.dispatchJobId);
    const validated = AgentResultSchema.parse(patched);
    await this.storeResult(validated);
    return validated;
  }

  /**
   * Persist an AgentResult to data/agent-results.json.
   * Prepends to the list so newest results appear first.
   * Returns the stored result's ID.
   */
  async storeResult(result: AgentResult): Promise<string> {
    const existing = await readResults();
    // Replace if same ID already exists (idempotent upsert)
    const idx = existing.findIndex((r) => r.id === result.id);
    if (idx !== -1) {
      existing[idx] = result;
    } else {
      existing.unshift(result);
    }
    await writeResults(existing);
    return result.id;
  }

  // ── private ──

  private _applyDispatchJobId(
    result: AgentResult,
    dispatchJobId?: string,
  ): AgentResult {
    if (!dispatchJobId) return result;
    return { ...result, dispatchJobId };
  }
}

// ─── Convenience function ─────────────────────────────────────────────────────

const _service = new ResultCollectorService();

/**
 * Collect an agent result from any supported source and persist it.
 *
 * @param source   - Input type: 'pasted' | 'json' | 'vibe-kanban'
 * @param data     - Raw input matching the source type
 * @param context  - taskId, agentId, and optional dispatchJobId
 * @returns        Normalized, validated AgentResult
 */
export async function collectResult(
  source: "pasted" | "json" | "vibe-kanban",
  data: unknown,
  context: CollectContext,
): Promise<AgentResult> {
  switch (source) {
    case "pasted":
      return _service.collectPastedResult(String(data ?? ""), context);
    case "json":
      return _service.collectJsonResult(data, context);
    case "vibe-kanban":
      return _service.collectVibeKanbanResult(data, context);
  }
}
