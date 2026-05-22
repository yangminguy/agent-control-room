/**
 * LLM-based Orchestration Decision Engine
 * OpenAI gpt-5-mini를 사용하여 자연어로 오케스트레이션 판단을 수행합니다.
 * rule-based engine의 fallback과 함께 동작합니다.
 */

import OpenAI from "openai";
import type { OrchestrationDecision, OrchestrationDecisionInput } from "@/lib/orchestration/types";
import { makeOrchestrationDecision } from "@/lib/orchestration/decision-engine";
import type { ProjectContext } from "@/lib/orchestration/project-context-manager";
import { contextToPrompt } from "@/lib/orchestration/project-context-manager";

const DECISION_SYSTEM_PROMPT = `You are an expert software orchestration system for a personal AI Development Control Tower.

Your job: Given a task description and optional project context, decide how to execute it safely.

## Agents Available
- **claude-code**: Architecture, complex implementation, multi-file refactoring, type system changes, core logic
- **codex**: Tests, bug fixes, type errors, isolated fixes, QA tasks
- **antigravity**: UI/UX, visual design, component styling, frontend work
- **hermes**: Terminal monitoring, git status checks, approval packets, logging — NOT for code changes
- **vibe-kanban**: Workbench sessions, issue tracking, diff review
- **manual-user**: Requires human to do it manually (unsafe/ambiguous tasks)

## Risk Levels
- **safe**: Documentation, comments, read-only operations
- **low**: Isolated bug fixes, test additions, style changes
- **medium**: New features, API changes, component refactoring
- **high**: Architecture changes, schema modifications, auth/security, shared types
- **critical**: Database migrations, production deploys, git push/merge, .env changes, package changes

## Execution Modes
- **single_agent**: One agent handles everything
- **sequential_multi_agent**: Multiple agents in order (when files might conflict)
- **parallel_safe**: Multiple agents simultaneously (when files don't conflict)
- **token_relay**: Agent is near token limit, needs handoff
- **manual_handoff**: Human must do this step
- **workbench_handoff**: Send to Vibe Kanban workbench
- **blocked_user_decision**: Ambiguous, needs user to decide first

## Rules
- If riskLevel is "critical" or "high": approvalGate.required = true
- If task touches auth/security/database: escalate risk
- If task touches multiple unrelated files: prefer sequential over parallel
- If task is UI-only: use antigravity
- If task is documentation: use claude-code with safe risk

Respond with a structured JSON OrchestrationDecision. Always include decisionSource as "llm".`;

const responseSchema = {
  type: "object" as const,
  additionalProperties: false,
  required: [
    "riskLevel",
    "primaryAgent",
    "executionMode",
    "reasoning",
    "fileBoundary",
    "approvalGate",
    "contextPackRecommended",
    "estimatedTokens",
    "createdAt",
    "decisionSource",
  ],
  properties: {
    riskLevel: { type: "string", enum: ["safe", "low", "medium", "high", "critical"] },
    primaryAgent: {
      type: "string",
      enum: ["claude-code", "codex", "antigravity", "hermes", "vibe-kanban", "manual-user"],
    },
    secondaryAgent: {
      type: "string",
      enum: ["claude-code", "codex", "antigravity", "hermes", "vibe-kanban", "manual-user"],
    },
    executionMode: {
      type: "string",
      enum: [
        "single_agent",
        "sequential_multi_agent",
        "parallel_safe",
        "token_relay",
        "manual_handoff",
        "workbench_handoff",
        "blocked_user_decision",
      ],
    },
    reasoning: { type: "string" },
    fileBoundary: {
      type: "object",
      additionalProperties: false,
      required: ["allowedFiles", "blockedFiles", "blockedCommands"],
      properties: {
        allowedFiles: { type: "array", items: { type: "string" } },
        blockedFiles: { type: "array", items: { type: "string" } },
        blockedCommands: { type: "array", items: { type: "string" } },
      },
    },
    approvalGate: {
      type: "object",
      additionalProperties: false,
      required: ["required", "reason"],
      properties: {
        required: { type: "boolean" },
        reason: { type: "string" },
        timeoutMinutes: { type: "number" },
        discordMessagePreview: { type: "string" },
      },
    },
    contextPackRecommended: { type: "boolean" },
    estimatedTokens: { type: "number" },
    createdAt: { type: "string" },
    decisionSource: { type: "string", enum: ["llm", "rule_fallback"] },
  },
};

export async function makeLLMOrchestrationDecision(
  input: OrchestrationDecisionInput,
  projectContext?: ProjectContext,
): Promise<OrchestrationDecision> {
  if (!process.env.OPENAI_API_KEY) {
    const decision = makeOrchestrationDecision(input);
    return { ...decision, decisionSource: "rule_fallback" };
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const userContent = [
      `## Task`,
      `Title: ${input.title}`,
      `Description: ${input.description}`,
      input.filePaths?.length ? `Files affected: ${input.filePaths.join(", ")}` : "",
      input.taskType ? `Task type: ${input.taskType}` : "",
      input.sessionContext ? `Session context: ${input.sessionContext}` : "",
      "",
      projectContext ? `## Project Context\n${contextToPrompt(projectContext)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    const now = new Date().toISOString();

    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        { role: "system", content: DECISION_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "orchestration_decision",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = JSON.parse(response.output_text) as Partial<OrchestrationDecision>;
    // createdAt과 decisionSource 보정
    return {
      ...parsed,
      createdAt: parsed.createdAt || now,
      decisionSource: "llm",
    } as OrchestrationDecision;
  } catch (error) {
    console.error("[llm-decision-engine] LLM 판단 실패, rule-based fallback:", error);
    const decision = makeOrchestrationDecision(input);
    return { ...decision, decisionSource: "rule_fallback" };
  }
}
