import type {
  ControlRoomExecutionRun,
  ControlRoomPhase,
  ControlRoomPlan,
  DispatchJob,
  FeaturePlan,
  PlanTask,
  Roadmap,
} from "@/lib/types";
import {
  getVibeKanbanClient,
  MockVibeKanbanClient,
  toVibeKanbanIssueDraft,
} from "@/lib/integrations/vibe-kanban";
import { addFeaturePlan } from "@/lib/storage/feature-plan-store";
import { saveRoadmap } from "@/lib/storage/roadmap-store";
import { compileSeniorDevPrompt } from "@/lib/prompts/senior-dev-prompt-compiler";
import { selectSchedulingMode } from "@/lib/orchestration/scheduling-mode-selector";
import { saveControlRoomRun } from "./store";

type ExecuteInput = {
  plan: ControlRoomPlan;
  vibeProjectId?: string;
  vibeStatusId?: string;
};

function id(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isHighRisk(risk: string): boolean {
  return risk === "high" || risk === "critical";
}

function phaseToPlanTasks(phase: ControlRoomPhase, planId: string): PlanTask[] {
  const now = new Date().toISOString();
  return phase.tasks.map((task) => ({
    id: task.id,
    planId,
    title: task.title,
    description: task.summary,
    status: "ready",
    assignedAgent: task.assignedAgent,
    priority: task.priority,
    acceptanceCriteria: task.acceptanceCriteria,
    subAgentTracks: [
      {
        id: `${task.id}-track`,
        role: task.assignedAgent,
        externalAgent: task.assignedAgent,
        status: "ready",
        executionOrder: 1,
      },
    ],
    generatedPrompt: task.prompt,
    allowedFiles: task.allowedFiles,
    doNotTouchFiles: task.doNotTouchFiles,
    createdAt: now,
    updatedAt: now,
  }));
}

function buildRoadmap(plan: ControlRoomPlan, featurePlanId: string): Roadmap {
  const now = new Date().toISOString();
  const stages = plan.phases.map((phase, index) => ({
    id: phase.id,
    number: phase.number,
    title: phase.title,
    goal: phase.goal,
    status: index === 0 ? ("active" as const) : ("waiting" as const),
    responsibleAgent: phase.responsibleAgent,
    currentTaskId: phase.tasks[0]?.id,
    completionPercentage: index === 0 ? 5 : 0,
    tasks: phaseToPlanTasks(phase, featurePlanId),
    acceptanceCriteria: phase.acceptanceCriteria,
    nextAction:
      index === 0
        ? "실행 버튼으로 시작된 작업 큐를 진행하고 Hermes가 결과를 모니터링합니다."
        : phase.nextAction,
    nextAgentRecommendation: phase.responsibleAgent,
    createdAt: now,
    updatedAt: now,
  }));

  return {
    id: `roadmap-${plan.id}`,
    projectId: plan.projectId ?? "agent-control-room",
    title: plan.title,
    version: "1.0.0",
    productVision: plan.productVision,
    stages,
    overallProgress: Math.round(
      stages.reduce((sum, stage) => sum + stage.completionPercentage, 0) /
        (stages.length || 1),
    ),
    completedStageCount: 0,
    activeStageCount: stages.length > 0 ? 1 : 0,
    blockedStageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

function buildMonitorPacket(plan: ControlRoomPlan, startedJobs: DispatchJob[], schedulingRecommendation?: string): string {
  const riskyJobs = startedJobs.filter((job) => isHighRisk(job.riskLevel));
  const lines = [
    "# Hermes Orchestration Packet",
    "",
    `- Plan: ${plan.title}`,
    `- Status: execution_started_after_user_approval`,
    `- Started jobs: ${startedJobs.length}`,
    `- High-risk jobs requiring approval: ${riskyJobs.length}`,
  ];

  if (schedulingRecommendation) {
    lines.push(`- Recommended scheduling: ${schedulingRecommendation}`);
  }

  lines.push(
    "",
    "## Monitoring Instructions",
    "",
    "- Watch agent stdout/stderr and Vibe Kanban issue status.",
    "- Run low-risk checks automatically: git status, git diff --stat, typecheck, lint, test, build.",
    "- Escalate push, merge, rebase, reset, package changes, migrations, production deploy, and env changes.",
    "- Return a Phase Completion Packet when acceptance criteria are met.",
  );

  return lines.join("\n");
}

async function createVibeIssueForTask(input: {
  plan: ControlRoomPlan;
  phase: ControlRoomPhase;
  taskIndex: number;
  vibeProjectId?: string;
  vibeStatusId?: string;
}) {
  const task = input.phase.tasks[input.taskIndex];
  if (!task) return null;

  const hasRealIds = Boolean(input.vibeProjectId && input.vibeStatusId);
  const client = hasRealIds ? getVibeKanbanClient() : new MockVibeKanbanClient();
  const draft = toVibeKanbanIssueDraft({
    projectName: input.plan.projectName,
    projectContext: input.plan.productVision,
    direction: input.phase.goal,
    assumptions: input.plan.assumptions,
    risks: [`Risk level: ${task.riskLevel}`],
    projectId: input.vibeProjectId ?? "control-room-project",
    statusId: input.vibeStatusId ?? "control-room-ready",
    task: {
      title: task.title,
      userIntent: input.phase.goal,
      technicalSummary: task.summary,
      priority: task.priority === "P0" ? "P0" : task.priority === "P1" ? "P1" : "P2",
      recommendedAgent: task.assignedAgent,
      acceptanceCriteria: task.acceptanceCriteria,
    },
  });

  return client.createIssue(draft);
}

export async function executeControlRoomPlan(
  input: ExecuteInput,
): Promise<ControlRoomExecutionRun> {
  const { plan } = input;
  if (!plan.finalPlanReady || plan.executionReadiness !== "ready") {
    throw new Error("Plan is not finalized. Continue planning before execution.");
  }

  const firstPhase = plan.phases[0];
  if (!firstPhase) {
    throw new Error("Plan has no phases to execute.");
  }

  const now = new Date().toISOString();
  const runId = id("control-run");
  const featurePlanInput: Omit<FeaturePlan, "id" | "createdAt" | "updatedAt"> = {
    projectId: plan.projectId ?? "agent-control-room",
    title: firstPhase.title,
    userGoal: firstPhase.goal,
    status: "running",
    tasks: phaseToPlanTasks(firstPhase, plan.id),
  };
  const featurePlan = await addFeaturePlan(featurePlanInput);
  await saveRoadmap(buildRoadmap(plan, featurePlan.id));

  const startedJobs: DispatchJob[] = [];

  for (const task of firstPhase.tasks) {
    let compiledPrompt = task.prompt;

    try {
      const compiled = await compileSeniorDevPrompt({
        projectName: plan.projectName,
        projectContext: plan.productVision,
        userRequest: firstPhase.goal,
        taskTitle: task.title,
        acceptanceCriteria: task.acceptanceCriteria,
        preferredAgent: task.assignedAgent,
      });
      compiledPrompt = compiled.generatedPromptMarkdown;
      console.log(`[execution] Compiled prompt for task: ${task.title}`);
    } catch (error) {
      console.warn(`[execution] Prompt compilation failed for ${task.title}, using fallback:`, error);
    }

    const job: DispatchJob = {
      id: id("dispatch-job"),
      taskId: task.id,
      planId: plan.id,
      runId,
      phaseId: firstPhase.id,
      featurePlanId: featurePlan.id,
      agentId: task.assignedAgent,
      riskLevel: task.riskLevel,
      status: isHighRisk(task.riskLevel) ? "skipped_due_to_risk" : "queued",
      executionSurface: "local_runner",
      createdAt: now,
      retryCount: 0,
      maxRetries: 2,
      prompt: compiledPrompt,
    };

    startedJobs.push(job);
  }

  // Auto-select optimal scheduling mode for multiple tasks
  let schedulingRecommendation = "";
  try {
    if (startedJobs.length > 1) {
      const primaryTask = firstPhase.tasks[0];
      const allFilePaths = firstPhase.tasks.flatMap((t) => t.allowedFiles || []);

      const scheduling = selectSchedulingMode({
        taskRiskLevel: primaryTask.riskLevel as any,
        primaryAgent: primaryTask.assignedAgent,
        primaryAgentStatus: "available",
        filePaths: allFilePaths,
        requiresVerification: firstPhase.tasks.some((t) => t.riskLevel === "medium"),
        secondaryAgents: [...new Set(firstPhase.tasks.slice(1).map((t) => t.assignedAgent))],
      });

      schedulingRecommendation = `${scheduling.mode} mode — ${scheduling.pmFriendlyDescription}`;
      console.log(`[execution] Scheduling recommendation: ${schedulingRecommendation}`);
    }
  } catch (schedulingError) {
    console.warn("[execution] Scheduling mode selection failed:", schedulingError);
  }

  const vibeIssues = [];
  for (let taskIndex = 0; taskIndex < firstPhase.tasks.length; taskIndex += 1) {
    const result = await createVibeIssueForTask({
      plan,
      phase: firstPhase,
      taskIndex,
      vibeProjectId: input.vibeProjectId,
      vibeStatusId: input.vibeStatusId,
    });
    const task = firstPhase.tasks[taskIndex];
    vibeIssues.push({
      taskId: task.id,
      success: Boolean(result?.success),
      issueId: result?.issueId,
      workspaceUrl: result?.workspaceUrl,
      message: result?.message,
    });
  }

  const hermesPacket = buildMonitorPacket(plan, startedJobs, schedulingRecommendation);
  const run: ControlRoomExecutionRun = {
    id: runId,
    planId: plan.id,
    featurePlanId: featurePlan.id,
    status: "queued",
    startedAt: now,
    message:
      "Execution plan was approved and queued for the local runner/workbench bridge. Vercel is the Control Tower; your local Mac runner should claim these jobs and submit results back.",
    startedTasks: startedJobs,
    vibeIssues,
    hermesPacket,
    approvalRequired: startedJobs.some((job) => isHighRisk(job.riskLevel)),
  };

  return saveControlRoomRun(run);
}
