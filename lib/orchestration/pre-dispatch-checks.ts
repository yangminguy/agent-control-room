/**
 * Phase 18.1 — Pre-dispatch trigger hooks for auto-dispatcher.
 *
 * Before /api/runner spawn:
 *   1. Clarification — if PlanTask carries clarifyingQuestions that aren't yet
 *      covered by clarificationAnswers, signal L5 CTO via `needs_clarification`
 *      callback so the headless answerer can fill them in.
 *   2. Risk re-assessment — re-classify the final prompt and, when escalated
 *      above the L5-declared D-level, notify L5 via `risk_reassess` so it can
 *      raise approval_required.
 *
 * Both triggers are best-effort: failures only log, never crash the dispatcher.
 */
import type { PlanTask } from "@/lib/types";
import { getRiskClassifier } from "@/lib/orchestration/risk-classifier";

type DLevel = "D1" | "D2" | "D3" | "D4" | "D5";

const L5_URL = () => process.env.L5_BASE_URL ?? "http://localhost:13001";
const L5_TOKEN = () => process.env.L5_ADMIN_TOKEN ?? "";
const ACR_URL = () => process.env.ACR_BASE_URL ?? "http://localhost:3001";

export interface ClarificationCheck {
  pending: boolean;
  questions: string[];
}

export function checkPendingClarifications(task: PlanTask): ClarificationCheck {
  const qs = task.clarifyingQuestions ?? [];
  if (qs.length === 0) return { pending: false, questions: [] };
  const answered = new Set((task.clarificationAnswers ?? []).map((a) => a.question));
  const unanswered = qs.filter((q) => !answered.has(q));
  return { pending: unanswered.length > 0, questions: unanswered };
}

/**
 * Map risk-classifier's coarse low/medium/high verdict onto the D1-D5 scale
 * that L5 CTO uses. Conservative mapping — we only ever ESCALATE, never relax.
 */
function classifyToD(prompt: string): DLevel {
  const c = getRiskClassifier();
  const verdict = c.classifyJob({
    id: "preflight",
    taskId: "preflight",
    agentId: "claude-code",
    riskLevel: "low",
    status: "queued",
    createdAt: new Date().toISOString(),
    retryCount: 0,
    prompt,
  } as Parameters<typeof c.classifyJob>[0]);
  switch (verdict.risk_level) {
    case "critical":
      return "D5";
    case "high":
      return "D4";
    case "medium":
      return "D2";
    case "low":
      return "D1";
    default:
      return "D2";
  }
}

const ORDER: Record<DLevel, number> = { D1: 1, D2: 2, D3: 3, D4: 4, D5: 5 };

export interface RiskReassessment {
  escalated: boolean;
  newLevel: DLevel;
  fromLevel: DLevel;
}

export function reassessRisk(prompt: string, currentLevel: DLevel): RiskReassessment {
  const newLevel = classifyToD(prompt);
  return {
    escalated: ORDER[newLevel] > ORDER[currentLevel],
    newLevel,
    fromLevel: currentLevel,
  };
}

async function postL5Callback(payload: Record<string, unknown>): Promise<void> {
  try {
    await fetch(`${L5_URL()}/api/agent:taskCallback`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(L5_TOKEN() ? { Authorization: `Bearer ${L5_TOKEN()}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(4000),
    });
  } catch (err) {
    console.warn("[pre-dispatch] L5 callback failed:", err instanceof Error ? err.message : err);
  }
}

export async function sendClarificationRequest(args: {
  l5_task_id: string;
  phase: string;
  questions: string[];
}): Promise<void> {
  await postL5Callback({
    l5_task_id: args.l5_task_id,
    phase: args.phase,
    status: "needs_clarification",
    output_summary: `ACR pre-dispatch: ${args.questions.length} clarifying question(s) pending`,
    questions: args.questions,
    acr_callback_url: `${ACR_URL()}/api/clarify-reply`,
  });
}

export async function sendRiskReassessment(args: {
  l5_task_id: string;
  phase: string;
  fromLevel: DLevel;
  newLevel: DLevel;
}): Promise<void> {
  await postL5Callback({
    l5_task_id: args.l5_task_id,
    phase: args.phase,
    status: "risk_reassess",
    output_summary: `ACR pre-dispatch: risk escalated ${args.fromLevel} → ${args.newLevel}`,
    new_risk_level: args.newLevel,
  });
}
