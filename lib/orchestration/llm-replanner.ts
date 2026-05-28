/**
 * Phase 16.5 — LLM-based next-phase prompt replanner.
 *
 * Given the prior phase's diff/log + the next phase's base prompt, ask GPT-4o
 * to rewrite the next-phase prompt so it reflects what's already done and
 * what's still missing. Falls back to deterministic concatenation if no
 * OPENAI_API_KEY is set or the call fails.
 */
import OpenAI from "openai";

export interface ReplanInput {
  userGoal: string;
  nextPhaseTitle: string;
  basePrompt: string;
  priorContext: string;
}

export type ReplanLLM = (args: {
  system: string;
  user: string;
}) => Promise<string>;

const SYSTEM_PROMPT = `You rewrite the next-phase prompt for an autonomous coding agent.

Inputs:
- userGoal: the original feature request
- nextPhaseTitle: human-readable title of the upcoming phase
- basePrompt: the originally generated prompt for the upcoming phase
- priorContext: a structured summary of what the previous phase actually did (branch, diff, log tail)

Rules:
1. Preserve the original intent and acceptance criteria from basePrompt.
2. Reference what was already implemented in the prior phase so the agent does not redo it.
3. Call out files or behaviors the prior log indicates are now in place.
4. Be terse. Output only the new prompt text. No preamble, no markdown headings, no JSON.`;

function buildUserMessage(input: ReplanInput): string {
  return [
    `userGoal: ${input.userGoal}`,
    `nextPhaseTitle: ${input.nextPhaseTitle}`,
    `basePrompt:\n${input.basePrompt}`,
    `priorContext:\n${input.priorContext || "(none)"}`,
  ].join("\n\n");
}

/** Default LLM driver — uses the official OpenAI SDK. */
async function defaultLLM(args: { system: string; user: string }): Promise<string> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const completion = await client.chat.completions.create({
    model: "gpt-4o",
    temperature: 0.2,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  });
  return completion.choices[0]?.message?.content?.trim() ?? "";
}

/**
 * Returns a rewritten prompt for the upcoming phase, or the deterministic
 * fallback (`priorContext + basePrompt`) if LLM is unavailable.
 *
 * The injected `llm` arg is for tests; production callers omit it.
 */
export async function replanNextPrompt(
  input: ReplanInput,
  llm: ReplanLLM | null = process.env.OPENAI_API_KEY ? defaultLLM : null,
): Promise<string> {
  const fallback = input.priorContext
    ? `${input.priorContext}\n\n${input.basePrompt}`
    : input.basePrompt;

  if (!llm) return fallback;

  try {
    const out = await llm({
      system: SYSTEM_PROMPT,
      user: buildUserMessage(input),
    });
    const trimmed = out.trim();
    return trimmed.length > 20 ? trimmed : fallback;
  } catch {
    return fallback;
  }
}
