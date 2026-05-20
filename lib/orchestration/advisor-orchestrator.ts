import OpenAI from "openai";
import { z } from "zod";
import type { AdvisorInput, AdvisorResponse } from "@/lib/types";
import { getFallbackAdvisorResponse } from "@/lib/orchestration/fallback-advisor";

const AdvisorResponseSchema = z.object({
  problemSummary: z.string(),
  likelyCauses: z.array(z.string()),
  options: z.array(z.string()),
  recommendation: z.string(),
  risks: z.array(z.string()),
  nextPrompt: z.string(),
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "problemSummary",
    "likelyCauses",
    "options",
    "recommendation",
    "risks",
    "nextPrompt",
  ],
  properties: {
    problemSummary: { type: "string" },
    likelyCauses: { type: "array", items: { type: "string" } },
    options: { type: "array", items: { type: "string" } },
    recommendation: { type: "string" },
    risks: { type: "array", items: { type: "string" } },
    nextPrompt: { type: "string" },
  },
};

export async function generateAdvisorResponse(
  input: AdvisorInput,
): Promise<AdvisorResponse & { source: "openai" | "fallback" }> {
  if (!process.env.OPENAI_API_KEY) {
    return { ...getFallbackAdvisorResponse(input), source: "fallback" };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are Agent Control Room's Technical Advisor (Advisor Mode). When a non-developer PM asks a technical question, you must explain the problem, likely causes, possible options, your recommendation, and risks. Finally, generate a copy-ready prompt that the user can copy and paste into Claude Code, Codex, or Antigravity to execute your recommendation.",
        },
        {
          role: "user",
          content: JSON.stringify({
            question: input.question,
            projectContext: input.projectContext || "No context provided",
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "agent_control_room_advisor",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    return { ...AdvisorResponseSchema.parse(parsed), source: "openai" };
  } catch (error) {
    console.error("OpenAI advisor orchestration failed", error);
    return { ...getFallbackAdvisorResponse(input), source: "fallback" };
  }
}
