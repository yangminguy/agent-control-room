/**
 * Gemma 4 Client — Ollama API bridge for Hermes LLM analysis.
 * Calls the local Ollama server and parses structured JSON from the model.
 */

import type { HermesAnalysis } from "@/lib/types";

// ── Types ─────────────────────────────────────────────────────────────────────

export type OrchestrationState = {
  totalJobs?: number;
  activeJobs?: number;
  failedJobs?: number;
  pendingApprovals?: number;
  recentEvents?: string[];
};

type OllamaGenerateResponse = {
  response: string;
  done: boolean;
};

// ── Config ────────────────────────────────────────────────────────────────────

const OLLAMA_URL = process.env.GEMMA_OLLAMA_URL ?? "http://localhost:11434";
const GEMMA_MODEL = process.env.GEMMA_MODEL ?? "gemma4:9b";

const FALLBACK_ANALYSIS: Omit<HermesAnalysis, "analyzedAt"> = {
  insights: [
    "Ollama server unavailable — using static fallback.",
    "Connect Ollama with Gemma 4 running for live analysis.",
  ],
  recommendations: [
    "Start Ollama: `ollama serve`",
    "Pull model: `ollama pull gemma4:9b`",
  ],
  riskFlags: [],
};

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(state: OrchestrationState): string {
  return `You are Hermes, an AI orchestration analyst. Analyze the following orchestration state and respond with a JSON object only — no markdown, no explanation.

State:
- Total jobs: ${state.totalJobs ?? 0}
- Active jobs: ${state.activeJobs ?? 0}
- Failed jobs: ${state.failedJobs ?? 0}
- Pending approvals: ${state.pendingApprovals ?? 0}
- Recent events: ${(state.recentEvents ?? []).join(", ") || "none"}

Respond with exactly this JSON shape:
{
  "insights": ["string", "string", "string"],
  "recommendations": ["string", "string"],
  "riskFlags": ["string"]
}

Rules:
- insights: 3 concise observations about the current state
- recommendations: 2 actionable next steps
- riskFlags: list any risk conditions (empty array if none)
- All values must be plain strings, no nested objects`;
}

// ── Parser ────────────────────────────────────────────────────────────────────

function parseAnalysis(raw: string): Omit<HermesAnalysis, "analyzedAt"> {
  // Strip possible markdown code fences
  const cleaned = raw.replace(/```json|```/g, "").trim();

  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  return {
    insights: Array.isArray(parsed.insights)
      ? (parsed.insights as string[])
      : FALLBACK_ANALYSIS.insights,
    recommendations: Array.isArray(parsed.recommendations)
      ? (parsed.recommendations as string[])
      : FALLBACK_ANALYSIS.recommendations,
    riskFlags: Array.isArray(parsed.riskFlags)
      ? (parsed.riskFlags as string[])
      : [],
  };
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function analyzeOrchestrationState(
  state: OrchestrationState
): Promise<HermesAnalysis> {
  const analyzedAt = new Date().toISOString();

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GEMMA_MODEL,
        prompt: buildPrompt(state),
        stream: false,
        format: "json",
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(`Ollama responded with ${response.status}`);
    }

    const data = (await response.json()) as OllamaGenerateResponse;
    const parsed = parseAnalysis(data.response);

    return { ...parsed, analyzedAt };
  } catch {
    return { ...FALLBACK_ANALYSIS, analyzedAt };
  }
}
