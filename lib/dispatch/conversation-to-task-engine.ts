import { DispatchJob, AgentType, RiskLevel } from "../types";

/**
 * Simple ID generator (no external dependency).
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * T040: Conversation-to-Task Engine
 * Transform user conversation/direction into structured dispatch jobs.
 * Integrates existing orchestration primitives.
 */

export interface ConversationToTaskInput {
  userPrompt: string;
  projectContext?: string;
  existingTaskId?: string;
}

export interface ConversationToTaskOutput {
  jobs: DispatchJob[];
  reasoning: string;
}

/**
 * Parse user intent from prompt using simple heuristic.
 * In production, this would use OpenAI structured output or local fallback.
 */
function extractTasksFromPrompt(prompt: string): Array<{
  title: string;
  agentPreference?: AgentType;
  keywords: string[];
}> {
  const lines = prompt.split("\n").filter((l) => l.trim());

  // Simple heuristic: lines starting with dash/bullet are tasks
  const tasks = lines
    .filter((line) => /^[-*•]\s/.test(line.trim()))
    .map((line) => ({
      title: line.replace(/^[-*•]\s+/, "").trim(),
      keywords: line.toLowerCase().split(/\s+/),
      agentPreference: undefined as AgentType | undefined,
    }));

  // Infer agent preference from keywords
  tasks.forEach((task) => {
    if (
      task.keywords.some((k) =>
        ["ui", "frontend", "component", "design", "visual"].includes(k)
      )
    ) {
      task.agentPreference = "antigravity";
    } else if (
      task.keywords.some((k) =>
        ["fix", "bug", "test", "error", "type"].includes(k)
      )
    ) {
      task.agentPreference = "codex";
    } else {
      task.agentPreference = "claude-code";
    }
  });

  return tasks;
}

/**
 * Main engine: convert user prompt to dispatch jobs.
 * Each job includes task title, agent, risk level, and acceptance criteria.
 */
export async function conversationToTasks(
  input: ConversationToTaskInput
): Promise<ConversationToTaskOutput> {
  const { userPrompt, projectContext, existingTaskId } = input;

  // Extract tasks from prompt
  const extractedTasks = extractTasksFromPrompt(userPrompt);

  if (extractedTasks.length === 0) {
    // Fallback: treat entire prompt as one task
    extractedTasks.push({
      title: userPrompt.substring(0, 100),
      agentPreference: "claude-code",
      keywords: [],
    });
  }

  // Convert to dispatch jobs
  const jobs: DispatchJob[] = extractedTasks.map((task, index) => {
    const taskId = existingTaskId || `task-${generateId()}`;
    const agentId = task.agentPreference || "claude-code";

    // Infer risk level from keywords
    let riskLevel: RiskLevel = "low";
    if (
      task.keywords.some((k) =>
        ["delete", "remove", "drop", "migration", "deploy"].includes(k)
      )
    ) {
      riskLevel = "critical";
    } else if (
      task.keywords.some((k) =>
        ["auth", "security", "password", "token"].includes(k)
      )
    ) {
      riskLevel = "high";
    } else if (
      task.keywords.some((k) => ["install", "package", "dependency"].includes(k))
    ) {
      riskLevel = "medium";
    }

    return {
      id: generateId(),
      taskId,
      agentId,
      riskLevel,
      status: "queued",
      createdAt: new Date().toISOString(),
      retryCount: 0,
      prompt: `${projectContext ? `Project: ${projectContext}\n\n` : ""}Task: ${task.title}`,
    };
  });

  return {
    jobs,
    reasoning: `Extracted ${jobs.length} tasks from prompt. Assigned agents: ${jobs.map((j) => `${j.agentId} (${j.riskLevel})`).join(", ")}`,
  };
}

/**
 * Lightweight validator for dispatch job.
 * Ensures required fields are present.
 */
export function validateDispatchJob(job: DispatchJob): string[] {
  const errors: string[] = [];

  if (!job.id) errors.push("Missing job.id");
  if (!job.taskId) errors.push("Missing job.taskId");
  if (!job.agentId) errors.push("Missing job.agentId");
  if (!job.riskLevel) errors.push("Missing job.riskLevel");
  if (!job.status) errors.push("Missing job.status");
  if (!job.createdAt) errors.push("Missing job.createdAt");

  return errors;
}
