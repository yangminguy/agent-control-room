import type { DirectionInput, GeneratedTask, OrchestrationResult } from "@/lib/types";
import { generatePrompt } from "@/lib/prompts/prompt-generator";
import { routeAgent } from "@/lib/routing/agent-router";

export function createFallbackOrchestration(input: DirectionInput): OrchestrationResult {
  const routed = routeAgent(
    `${input.direction}\n${input.projectContext}`,
    input.preferredAgentStatus,
  );
  const task: GeneratedTask = {
    title: "Translate product direction into an implementation-ready task",
    userIntent: input.direction,
    technicalSummary:
      "Clarify the requested product outcome, define the smallest implementable technical task, and produce a copy-ready prompt for the recommended AI coding tool.",
    priority: "P0",
    recommendedAgent: routed.recommendedAgent,
    acceptanceCriteria: [
      "The task preserves the user's product intent.",
      "The implementation scope stays inside MVP prompt and handoff orchestration.",
      "The output includes clear completion criteria.",
    ],
  };
  const assumptions = [
    "Project context is manually pasted by the user.",
    "The user will copy the generated prompt into the external AI coding tool.",
  ];
  const risks = [
    input.projectContext.trim()
      ? "Pasted context may be incomplete or stale."
      : "No project context was provided, so the first agent should verify assumptions.",
  ];

  const agentReason = routed.statusReason
    ? `${routed.primaryReason} ${routed.statusReason}`
    : routed.primaryReason;

  return {
    technicalTranslation: {
      productIntent: input.direction,
      technicalInterpretation: task.technicalSummary,
      requiredData: ["Project context", "User direction", "Agent status"],
      requiredUi: ["Direction input", "Editable result preview", "Copy-ready prompt"],
      requiredLogic: ["Agent routing", "Prompt generation", "Session report capture"],
    },
    tasks: [task],
    recommendedAgent: routed.recommendedAgent,
    fallbackAgent: routed.fallbackAgent ?? null,
    agentReason,
    statusReason: routed.statusReason,
    handoffRequired: routed.handoffRequired,
    handoffPrompt: routed.handoffPrompt,
    copyReadyPrompt: generatePrompt({
      agent: routed.recommendedAgent,
      projectName: input.projectName,
      projectContext: input.projectContext,
      direction: input.direction,
      task,
      assumptions,
      risks,
    }),
    acceptanceCriteria: task.acceptanceCriteria,
    assumptions,
    risks,
    followUpQuestions: input.projectContext.trim()
      ? []
      : ["프로젝트 문맥을 더 붙여넣으면 더 정확한 파일 범위와 완료 기준을 만들 수 있습니다."],
  };
}
