import OpenAI from "openai";
import { z } from "zod";
import type {
  AgentType,
  ControlRoomMessage,
  ControlRoomPhase,
  ControlRoomPlan,
  ControlRoomTask,
  RiskLevel,
} from "@/lib/types";

const AgentSchema = z.enum(["claude-code", "codex", "antigravity"]);
const RiskSchema = z.enum(["safe", "low", "medium", "high", "critical"]);

const TaskSchema = z.object({
  title: z.string(),
  summary: z.string(),
  assignedAgent: AgentSchema,
  priority: z.enum(["P0", "P1", "P2", "P3"]),
  acceptanceCriteria: z.array(z.string()).min(1),
  prompt: z.string(),
  allowedFiles: z.array(z.string()).default([]),
  doNotTouchFiles: z.array(z.string()).default([]),
  riskLevel: RiskSchema,
});

const PhaseSchema = z.object({
  title: z.string(),
  goal: z.string(),
  responsibleAgent: AgentSchema,
  acceptanceCriteria: z.array(z.string()).min(1),
  tasks: z.array(TaskSchema).min(1),
  nextAction: z.string(),
});

const ControlRoomSchema = z.object({
  title: z.string(),
  productVision: z.string(),
  conversationState: z.string(),
  assistantReply: z.string(),
  clarifyingQuestions: z.array(z.string()),
  phases: z.array(PhaseSchema).min(1),
  executionReadiness: z.enum(["not_ready", "needs_user_decision", "ready"]),
  requiresUserDecision: z.boolean(),
  finalPlanReady: z.boolean(),
  riskLevel: RiskSchema,
  assumptions: z.array(z.string()),
});

const responseSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "productVision",
    "conversationState",
    "assistantReply",
    "clarifyingQuestions",
    "phases",
    "executionReadiness",
    "requiresUserDecision",
    "finalPlanReady",
    "riskLevel",
    "assumptions",
  ],
  properties: {
    title: { type: "string" },
    productVision: { type: "string" },
    conversationState: { type: "string" },
    assistantReply: { type: "string" },
    clarifyingQuestions: { type: "array", items: { type: "string" } },
    phases: {
      type: "array",
      minItems: 1,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "title",
          "goal",
          "responsibleAgent",
          "acceptanceCriteria",
          "tasks",
          "nextAction",
        ],
        properties: {
          title: { type: "string" },
          goal: { type: "string" },
          responsibleAgent: {
            type: "string",
            enum: ["claude-code", "codex", "antigravity"],
          },
          acceptanceCriteria: { type: "array", items: { type: "string" } },
          tasks: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              required: [
                "title",
                "summary",
                "assignedAgent",
                "priority",
                "acceptanceCriteria",
                "prompt",
                "allowedFiles",
                "doNotTouchFiles",
                "riskLevel",
              ],
              properties: {
                title: { type: "string" },
                summary: { type: "string" },
                assignedAgent: {
                  type: "string",
                  enum: ["claude-code", "codex", "antigravity"],
                },
                priority: {
                  type: "string",
                  enum: ["P0", "P1", "P2", "P3"],
                },
                acceptanceCriteria: { type: "array", items: { type: "string" } },
                prompt: { type: "string" },
                allowedFiles: { type: "array", items: { type: "string" } },
                doNotTouchFiles: { type: "array", items: { type: "string" } },
                riskLevel: {
                  type: "string",
                  enum: ["safe", "low", "medium", "high", "critical"],
                },
              },
            },
          },
          nextAction: { type: "string" },
        },
      },
    },
    executionReadiness: {
      type: "string",
      enum: ["not_ready", "needs_user_decision", "ready"],
    },
    requiresUserDecision: { type: "boolean" },
    finalPlanReady: { type: "boolean" },
    riskLevel: {
      type: "string",
      enum: ["safe", "low", "medium", "high", "critical"],
    },
    assumptions: { type: "array", items: { type: "string" } },
  },
};

export type ControlRoomChatInput = {
  projectId?: string;
  projectName?: string;
  message: string;
  history?: ControlRoomMessage[];
  existingPlan?: ControlRoomPlan | null;
};

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizePhases(
  rawPhases: z.infer<typeof PhaseSchema>[],
): ControlRoomPhase[] {
  const now = new Date().toISOString();
  return rawPhases.map((phase, phaseIndex) => {
    const phaseId = `phase-${phaseIndex + 1}-${phase.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40)}`;

    const tasks: ControlRoomTask[] = phase.tasks.map((task, taskIndex) => ({
      id: `${phaseId}-task-${taskIndex + 1}`,
      phaseId,
      title: task.title,
      summary: task.summary,
      assignedAgent: task.assignedAgent as AgentType,
      priority: task.priority,
      acceptanceCriteria: task.acceptanceCriteria,
      prompt: task.prompt,
      allowedFiles: task.allowedFiles,
      doNotTouchFiles: task.doNotTouchFiles,
      riskLevel: task.riskLevel as RiskLevel,
    }));

    return {
      id: phaseId,
      number: phaseIndex + 1,
      title: phase.title,
      goal: phase.goal,
      status: phaseIndex === 0 ? "waiting" : "waiting",
      responsibleAgent: phase.responsibleAgent as AgentType,
      completionPercentage: 0,
      acceptanceCriteria: phase.acceptanceCriteria,
      tasks,
      nextAction: phase.nextAction,
    };
  });
}

function buildPlan(
  input: ControlRoomChatInput,
  parsed: z.infer<typeof ControlRoomSchema>,
  source: "openai" | "fallback",
): ControlRoomPlan {
  const now = new Date().toISOString();
  return {
    id: input.existingPlan?.id ?? id("control-plan"),
    projectId: input.projectId,
    projectName: input.projectName?.trim() || "Agent Control Room",
    title: parsed.title,
    productVision: parsed.productVision,
    conversationState: parsed.conversationState,
    assistantReply: parsed.assistantReply,
    clarifyingQuestions: parsed.clarifyingQuestions,
    phases: normalizePhases(parsed.phases),
    executionReadiness: parsed.executionReadiness,
    requiresUserDecision: parsed.requiresUserDecision,
    finalPlanReady: parsed.finalPlanReady,
    riskLevel: parsed.riskLevel as RiskLevel,
    assumptions: parsed.assumptions,
    openAiRequired: true,
    source,
    createdAt: input.existingPlan?.createdAt ?? now,
    updatedAt: now,
  };
}

function fallbackPlan(input: ControlRoomChatInput): ControlRoomPlan {
  return buildPlan(
    input,
    {
      title: "채팅 기반 실행 계획",
      productVision:
        "사용자와 충분히 기획 대화를 마친 뒤 승인 버튼으로만 실행되는 AI 개발 관제탑",
      conversationState:
        "OpenAI API를 사용할 수 없어 로컬 fallback 계획을 생성했습니다. 실행 전 범위, 파일 경계, Phase 순서를 확인해야 합니다.",
      assistantReply:
        "OpenAI API 응답을 사용할 수 없어 안전한 기본 계획을 만들었습니다. 목표와 범위를 한 번 더 구체화하면 최종 실행 계획으로 고정할 수 있습니다.",
      clarifyingQuestions: [
        "이번 실행에서 반드시 완료해야 하는 첫 번째 제품 결과는 무엇인가요?",
        "수정 금지 파일이나 건드리면 안 되는 영역이 있나요?",
      ],
      executionReadiness: "needs_user_decision",
      requiresUserDecision: true,
      finalPlanReady: false,
      riskLevel: "medium",
      assumptions: [
        "실제 실행은 사용자가 실행 버튼을 누르기 전까지 시작하지 않습니다.",
        "고위험 작업은 별도 승인 없이 진행하지 않습니다.",
      ],
      phases: [
        {
          title: "Phase 1: 계획 확정",
          goal: input.message,
          responsibleAgent: "claude-code",
          acceptanceCriteria: [
            "Phase 목표가 명확하다",
            "작업별 담당 에이전트가 정해졌다",
            "실행 버튼 전에는 어떤 에이전트도 실행되지 않는다",
          ],
          nextAction: "사용자와 범위를 확정한 뒤 finalize-plan을 호출한다",
          tasks: [
            {
              title: "기획 대화 정리",
              summary: "사용자 메시지를 실행 가능한 Phase 계획으로 정리한다",
              assignedAgent: "claude-code",
              priority: "P0",
              acceptanceCriteria: ["최종 실행 전 확인 질문이 표시된다"],
              prompt: `사용자 목표를 실행 가능한 Phase 계획으로 정리하세요.\n\n목표:\n${input.message}`,
              allowedFiles: [],
              doNotTouchFiles: [".env*", "package.json", "database migrations"],
              riskLevel: "low",
            },
          ],
        },
      ],
    },
    "fallback",
  );
}

export async function createControlRoomPlan(
  input: ControlRoomChatInput,
): Promise<ControlRoomPlan> {
  if (!process.env.OPENAI_API_KEY) {
    return fallbackPlan(input);
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await openai.responses.create({
      model: "gpt-5-mini",
      input: [
        {
          role: "system",
          content: [
            "You are Agent Control Room, a chat-first AI development orchestrator for a non-developer PM.",
            "Your job is to finish planning through conversation before execution.",
            "Never claim that execution has started. Chat/finalize planning is planning-only.",
            "Generate phase-level plans, concrete tasks, agent assignments, prompts, acceptance criteria, risk level, and missing decisions.",
            "Execution starts only after the user clicks an explicit execute button in the app.",
            "Agent routing: Claude Code for architecture/complex implementation, Codex for tests/type errors/QA, Antigravity for UI/visual work, Hermes for monitoring/memory/approval packets only.",
            "High-risk actions such as push, merge, rebase, reset, package changes, migrations, production deploy, or env changes must require a later approval gate.",
          ].join("\n"),
        },
        {
          role: "user",
          content: JSON.stringify({
            projectId: input.projectId,
            projectName: input.projectName,
            message: input.message,
            history: input.history ?? [],
            existingPlan: input.existingPlan,
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "control_room_chat_plan",
          strict: true,
          schema: responseSchema,
        },
      },
    });

    const parsed = ControlRoomSchema.parse(JSON.parse(response.output_text));
    return buildPlan(input, parsed, "openai");
  } catch (error) {
    console.error("Control Room OpenAI orchestration failed", error);
    return fallbackPlan(input);
  }
}

export function finalizeControlRoomPlan(plan: ControlRoomPlan): ControlRoomPlan {
  const now = new Date().toISOString();
  return {
    ...plan,
    executionReadiness: plan.requiresUserDecision ? "needs_user_decision" : "ready",
    finalPlanReady: !plan.requiresUserDecision,
    assistantReply: plan.requiresUserDecision
      ? plan.assistantReply
      : "계획이 실행 준비 상태로 고정되었습니다. 실제 실행은 실행 버튼을 누른 뒤에만 시작됩니다.",
    updatedAt: now,
  };
}
