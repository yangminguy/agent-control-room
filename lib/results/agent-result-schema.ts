import { z } from "zod";
import type { AgentResult, AgentType, ResultStatus } from "@/lib/types";

// ─── Zod schema ──────────────────────────────────────────────────────────────

export const ResultStatusSchema = z.enum([
  "pass",
  "minor_fix",
  "qa_needed",
  "blocked",
  "safety_violation",
]);

export const AgentResultSchema = z.object({
  id: z.string().min(1),
  dispatchJobId: z.string().min(1),
  taskId: z.string().min(1),
  agentId: z.enum(["claude-code", "codex", "antigravity"]),
  rawOutput: z.string(),
  resultStatus: ResultStatusSchema,
  changedFiles: z.array(z.string()).optional(),
  extractedSummary: z.string().optional(),
  timestamp: z.string().min(1),
});

// ─── Text heuristics ─────────────────────────────────────────────────────────

/**
 * Parse a ResultStatus from free-form pasted text.
 * Checks for well-known keywords in order of specificity.
 * Returns "qa_needed" when nothing matches (safe default).
 */
export function parseResultStatusFromText(text: string): ResultStatus {
  const upper = text.toUpperCase();

  if (upper.includes("SAFETY_VIOLATION") || upper.includes("SAFETY VIOLATION")) {
    return "safety_violation";
  }
  if (upper.includes("BLOCKED")) {
    return "blocked";
  }
  if (upper.includes("NEEDS QA") || upper.includes("NEEDS_QA")) {
    return "qa_needed";
  }
  if (upper.includes("MINOR")) {
    return "minor_fix";
  }
  if (upper.includes("PASS")) {
    return "pass";
  }

  return "qa_needed";
}

/** Extract a plain-text summary from raw output (first non-empty line, max 200 chars). */
function extractSummary(text: string): string {
  const first = text
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);
  if (!first) return "";
  return first.slice(0, 200);
}

// ─── Normalizers ─────────────────────────────────────────────────────────────

/**
 * Build a normalized AgentResult from pasted free-form text.
 * Safe to call with empty or malformed input.
 */
export function normalizePastedResult(
  text: string,
  taskId: string,
  agentId: AgentType,
): AgentResult {
  const raw = typeof text === "string" ? text : "";
  return {
    id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dispatchJobId: `dispatch-placeholder-${taskId}`,
    taskId,
    agentId,
    rawOutput: raw,
    resultStatus: parseResultStatusFromText(raw),
    changedFiles: extractChangedFiles(raw),
    extractedSummary: extractSummary(raw),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a normalized AgentResult from a JSON object (e.g. API response).
 * Merges known fields; falls back to text parsing for resultStatus when absent.
 */
export function normalizeJsonResult(
  json: unknown,
  taskId: string,
  agentId: AgentType,
): AgentResult {
  if (!json || typeof json !== "object") {
    return normalizePastedResult("", taskId, agentId);
  }

  const obj = json as Record<string, unknown>;

  const raw: string =
    typeof obj.rawOutput === "string"
      ? obj.rawOutput
      : typeof obj.output === "string"
      ? obj.output
      : JSON.stringify(obj);

  const statusCandidate = obj.resultStatus ?? obj.status;
  const resultStatus: ResultStatus = ResultStatusSchema.safeParse(statusCandidate).success
    ? (statusCandidate as ResultStatus)
    : parseResultStatusFromText(raw);

  const changedFiles: string[] = Array.isArray(obj.changedFiles)
    ? (obj.changedFiles as unknown[]).filter((f): f is string => typeof f === "string")
    : extractChangedFiles(raw);

  return {
    id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dispatchJobId:
      typeof obj.dispatchJobId === "string"
        ? obj.dispatchJobId
        : `dispatch-placeholder-${taskId}`,
    taskId,
    agentId,
    rawOutput: raw,
    resultStatus,
    changedFiles,
    extractedSummary:
      typeof obj.extractedSummary === "string"
        ? obj.extractedSummary
        : extractSummary(raw),
    timestamp: new Date().toISOString(),
  };
}

/**
 * Build a normalized AgentResult from a Vibe Kanban result object.
 * Vibe Kanban results may carry `status`, `diff`, `files`, and `description`.
 */
export function normalizeVibeKanbanResult(
  vkResult: unknown,
  taskId: string,
  agentId: AgentType,
): AgentResult {
  if (!vkResult || typeof vkResult !== "object") {
    return normalizePastedResult("", taskId, agentId);
  }

  const vk = vkResult as Record<string, unknown>;

  const raw: string =
    typeof vk.description === "string"
      ? vk.description
      : typeof vk.diff === "string"
      ? vk.diff
      : typeof vk.output === "string"
      ? vk.output
      : JSON.stringify(vk);

  // Vibe Kanban may use status strings like "done", "completed" → map to "pass"
  const vkStatus: string =
    typeof vk.status === "string" ? vk.status.toLowerCase() : "";
  let resultStatus: ResultStatus;

  if (ResultStatusSchema.safeParse(vkStatus).success) {
    resultStatus = vkStatus as ResultStatus;
  } else if (vkStatus === "done" || vkStatus === "completed") {
    resultStatus = "pass";
  } else if (vkStatus === "review" || vkStatus === "needs_review") {
    resultStatus = "qa_needed";
  } else if (vkStatus === "blocked" || vkStatus === "failed") {
    resultStatus = "blocked";
  } else {
    resultStatus = parseResultStatusFromText(raw);
  }

  const changedFiles: string[] = Array.isArray(vk.files)
    ? (vk.files as unknown[]).filter((f): f is string => typeof f === "string")
    : Array.isArray(vk.changedFiles)
    ? (vk.changedFiles as unknown[]).filter((f): f is string => typeof f === "string")
    : extractChangedFiles(raw);

  return {
    id: `result-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    dispatchJobId:
      typeof vk.dispatchJobId === "string"
        ? vk.dispatchJobId
        : `dispatch-placeholder-${taskId}`,
    taskId,
    agentId,
    rawOutput: raw,
    resultStatus,
    changedFiles,
    extractedSummary:
      typeof vk.summary === "string"
        ? vk.summary
        : extractSummary(raw),
    timestamp: new Date().toISOString(),
  };
}

// ─── Internal helpers ────────────────────────────────────────────────────────

/**
 * Best-effort extraction of file paths from raw text output.
 * Looks for lines that look like relative or absolute file paths.
 */
function extractChangedFiles(text: string): string[] {
  if (!text) return [];
  const filePattern = /(?:^|\s)((?:\.{0,2}\/)?[\w\-/.]+\.(?:ts|tsx|js|jsx|json|md|py|go|css|scss|html))/gm;
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = filePattern.exec(text)) !== null) {
    const candidate = match[1].trim();
    if (candidate.length > 2 && candidate.length < 200) {
      matches.add(candidate);
    }
  }
  return Array.from(matches);
}
