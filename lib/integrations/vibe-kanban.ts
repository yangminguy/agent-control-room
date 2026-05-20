import { generatePrompt } from "@/lib/prompts/prompt-generator";
import type { AgentType, GeneratedTask } from "@/lib/types";

export type VibeKanbanExecutor = "claude-code" | "codex";
export type VibeKanbanPriority = "urgent" | "high" | "medium" | "low";

export type VibeKanbanIssueDraft = {
  title: string;
  description: string;
  priority: VibeKanbanPriority;
  recommendedExecutor?: VibeKanbanExecutor;
  manualExecutorNote?: string;
};

const PRIORITY_MAP: Record<GeneratedTask["priority"], VibeKanbanPriority> = {
  P0: "high",
  P1: "medium",
  P2: "low",
};

const EXECUTOR_MAP: Partial<Record<AgentType, VibeKanbanExecutor>> = {
  "claude-code": "claude-code",
  codex: "codex",
};

export function toVibeKanbanIssueDraft(input: {
  projectName: string;
  projectContext: string;
  direction: string;
  task: GeneratedTask;
  assumptions: string[];
  risks: string[];
}): VibeKanbanIssueDraft {
  const recommendedExecutor = EXECUTOR_MAP[input.task.recommendedAgent];
  const prompt = generatePrompt({
    agent: input.task.recommendedAgent,
    projectName: input.projectName,
    projectContext: input.projectContext,
    direction: input.direction,
    task: input.task,
    assumptions: input.assumptions,
    risks: input.risks,
  });

  const manualExecutorNote = recommendedExecutor
    ? undefined
    : "Antigravity is not a native Vibe Kanban executor yet. Use this issue as a manual handoff prompt.";

  return {
    title: input.task.title,
    description: [
      prompt,
      "",
      "## Vibe Kanban Metadata",
      `- Recommended Agent: ${input.task.recommendedAgent}`,
      recommendedExecutor
        ? `- Recommended Vibe Kanban Executor: ${recommendedExecutor}`
        : `- Manual Executor Note: ${manualExecutorNote}`,
    ].join("\n"),
    priority: PRIORITY_MAP[input.task.priority],
    recommendedExecutor,
    manualExecutorNote,
  };
}

export interface VibeKanbanClient {
  createIssue(
    draft: VibeKanbanIssueDraft
  ): Promise<{ success: boolean; issueId?: string; message?: string }>;
}

export class HttpVibeKanbanClient implements VibeKanbanClient {
  async createIssue(
    draft: VibeKanbanIssueDraft
  ): Promise<{ success: boolean; issueId?: string; message?: string }> {
    const baseUrl = process.env.VIBE_KANBAN_URL || "http://localhost:3001";
    try {
      const response = await fetch(`${baseUrl}/api/issues`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        return { success: false, message: `Failed to create issue: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, issueId: data.id || data.issueId || "unknown", message: "Issue created successfully" };
    } catch (error: any) {
      return { success: false, message: `Error creating issue: ${error.message}` };
    }
  }
}

export function isMockVibeKanbanClient(
  client: VibeKanbanClient,
): client is MockVibeKanbanClient {
  return client instanceof MockVibeKanbanClient;
}

export class MockVibeKanbanClient implements VibeKanbanClient {
  async createIssue(
    draft: VibeKanbanIssueDraft
  ): Promise<{ success: boolean; issueId?: string; message?: string }> {
    console.log("[MockVibeKanbanClient] createIssue called with:", draft);
    return Promise.resolve({
      success: true,
      issueId: `mock-issue-${Date.now()}`,
      message: "Mock issue created successfully",
    });
  }
}

export function getVibeKanbanClient(): VibeKanbanClient {
  const url = process.env.VIBE_KANBAN_URL;
  if (url) {
    return new HttpVibeKanbanClient();
  }
  return new MockVibeKanbanClient();
}
