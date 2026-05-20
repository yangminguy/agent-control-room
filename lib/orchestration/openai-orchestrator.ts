import OpenAI from "openai";
import { z } from "zod";
import type { DirectionInput, OrchestrationResult } from "@/lib/types";
import { createFallbackOrchestration } from "@/lib/orchestration/fallback-orchestrator";

const GeneratedTaskSchema = z.object({
  title: z.string(),
  userIntent: z.string(),
  technicalSummary: z.string(),
  priority: z.enum(["P0", "P1", "P2"]),
  recommendedAgent: z.enum(["claude-code", "codex", "antigravity"]),
  acceptanceCriteria: z.array(z.string()).min(1),
});

const OrchestrationSchema = z.object({
  technicalTranslation: z.object({
    productIntent: z.string(),
    technicalInterpretation: z.string(),
    requiredData: z.array(z.string()),
    requiredUi: z.array(z.string()),
    requiredLogic: z.array(z.string()),
  }),
  tasks: z.array(GeneratedTaskSchema).min(1),
  recommendedAgent: z.enum(["claude-code", "codex", "antigravity"]),
  fallbackAgent: z.enum(["claude-code", "codex", "antigravity"]).nullable(),
  agentReason: z.string(),
  statusReason: z.string().optional(),
  handoffRequired: z.boolean().optional(),
  handoffPrompt: z.string().optional(),
  copyReadyPrompt: z.string(),
  acceptanceCriteria: z.array(z.string()).min(1),
  assumptions: z.array(z.string()),
  risks: z.array(z.string()),
  followUpQuestions: z.array(z.string()),
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "technicalTranslation",
    "tasks",
    "recommendedAgent",
    "fallbackAgent",
    "agentReason",
    "copyReadyPrompt",
    "acceptanceCriteria",
    "assumptions",
    "risks",
    "followUpQuestions",
  ],
  properties: {
    technicalTranslation: {
      type: "object",
      additionalProperties: false,
      required: [
        "productIntent",
        "technicalInterpretation",
        "requiredData",
        "requiredUi",
        "requiredLogic",
      ],
      properties: {
        productIntent: { type: "string" },
        technicalInterpretation: { type: "string" },
        requiredData: { type: "array", items: { type: "string" } },
        requiredUi: { type: "array", items: { type: "string" } },
        requiredLogic: { type: "array", items: { type: "string" } },
      },
    },
    tasks: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "userIntent",
          "technicalSummary",
          "priority",
          "recommendedAgent",
          "acceptanceCriteria",
        ],
        properties: {
          title: { type: "string" },
          userIntent: { type: "string" },
          technicalSummary: { type: "string" },
          priority: { type: "string", enum: ["P0", "P1", "P2"] },
          recommendedAgent: {
            type: "string",
            enum: ["claude-code", "codex", "antigravity"],
          },
          acceptanceCriteria: {
            type: "array",
            minItems: 1,
            items: { type: "string" },
          },
        },
      },
    },
    recommendedAgent: {
      type: "string",
      enum: ["claude-code", "codex", "antigravity"],
    },
    fallbackAgent: {
      anyOf: [
        {
          type: "string",
          enum: ["claude-code", "codex", "antigravity"],
        },
        { type: "null" },
      ],
    },
    agentReason: { type: "string" },
    statusReason: { type: "string" },
    handoffRequired: { type: "boolean" },
    handoffPrompt: { type: "string" },
    copyReadyPrompt: { type: "string" },
    acceptanceCriteria: {
      type: "array",
      minItems: 1,
      items: { type: "string" },
    },
    assumptions: { type: "array", items: { type: "string" } },
    risks: { type: "array", items: { type: "string" } },
    followUpQuestions: { type: "array", items: { type: "string" } },
  },
};

export async function orchestrateDirection(
  input: DirectionInput,
): Promise<OrchestrationResult & { source: "openai" | "fallback" }> {
  if (!process.env.OPENAI_API_KEY) {
    return { ...createFallbackOrchestration(input), source: "fallback" };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content:
            "You are Agent Control Room, a strong-recommendation technical PM for a non-developer user. Convert product direction into implementation-ready tasks and a copy-ready prompt. Keep the MVP prompt-first and handoff-first. Default implementation stack is Next.js App Router, TypeScript, Tailwind CSS, local JSON storage, and OpenAI Responses API structured output unless the project context explicitly says otherwise. Do not propose automatic execution, Slack, GitHub PR automation, auth, or token auto-detection.",
        },
        {
          role: "user",
          content: JSON.stringify({
            projectName: input.projectName,
            projectContext: input.projectContext,
            direction: input.direction,
            preferredAgentStatus: input.preferredAgentStatus ?? "available",
            agentRules: {
              "claude-code": "Architecture, complex reasoning, document review",
              codex: "Clear implementation, bug fixing, tests, type errors",
              antigravity: "UI prototype, visual iteration, multi-file screen work",
            },
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "agent_control_room_orchestration",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text);
    return { ...OrchestrationSchema.parse(parsed), source: "openai" };
  } catch (error) {
    console.error("OpenAI orchestration failed", error);
    return { ...createFallbackOrchestration(input), source: "fallback" };
  }
}
