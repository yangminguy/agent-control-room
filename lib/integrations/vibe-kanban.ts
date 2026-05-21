import { generatePrompt } from "@/lib/prompts/prompt-generator";
import type { AgentType, GeneratedTask } from "@/lib/types";

export type VibeKanbanExecutor = "claude-code" | "codex";
export type VibeKanbanPriority = "urgent" | "high" | "medium" | "low";

export type VibeKanbanIssueDraft = {
  title: string;
  description: string;
  priority: VibeKanbanPriority;
  project_id: string;
  status_id: string;
  sort_order: number;
  extension_metadata: Record<string, unknown>;
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
  projectId: string;
  statusId: string;
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
    project_id: input.projectId,
    status_id: input.statusId,
    sort_order: 0,
    extension_metadata: {},
    recommendedExecutor,
    manualExecutorNote,
  };
}

export interface CreateIssueResponse {
  success: boolean;
  issueId?: string;
  workspaceUrl?: string;
  message?: string;
}

export interface VibeKanbanClient {
  createIssue(draft: VibeKanbanIssueDraft): Promise<CreateIssueResponse>;
  listProjects(
    orgId: string
  ): Promise<{ success: boolean; projects?: any[]; message?: string }>;
  listStatuses(
    projectId: string
  ): Promise<{ success: boolean; statuses?: any[]; message?: string }>;
}

export class HttpVibeKanbanClient implements VibeKanbanClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.VIBE_KANBAN_URL || "http://localhost:3003";
  }

  async createIssue(draft: VibeKanbanIssueDraft): Promise<CreateIssueResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/remote/issues`, {
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
      const workspaceUrl = data.data?.workspace_url ?? data.data?.workspaceUrl ?? undefined;
      return {
        success: true,
        issueId: data.id || data.issueId || "unknown",
        workspaceUrl,
        message: "Issue created successfully",
      };
    } catch (error: any) {
      return { success: false, message: `Error creating issue: ${error.message}` };
    }
  }

  async listProjects(
    orgId: string
  ): Promise<{ success: boolean; projects?: any[]; message?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/remote/projects?orgId=${encodeURIComponent(orgId)}`,
        { headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) {
        return { success: false, message: `Failed to list projects: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, projects: data.projects ?? data };
    } catch (error: any) {
      return { success: false, message: `Error listing projects: ${error.message}` };
    }
  }

  async listStatuses(
    projectId: string
  ): Promise<{ success: boolean; statuses?: any[]; message?: string }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/remote/statuses?projectId=${encodeURIComponent(projectId)}`,
        { headers: { "Content-Type": "application/json" } }
      );

      if (!response.ok) {
        return { success: false, message: `Failed to list statuses: ${response.statusText}` };
      }

      const data = await response.json();
      return { success: true, statuses: data.statuses ?? data };
    } catch (error: any) {
      return { success: false, message: `Error listing statuses: ${error.message}` };
    }
  }
}

export function isMockVibeKanbanClient(
  client: VibeKanbanClient,
): client is MockVibeKanbanClient {
  return client instanceof MockVibeKanbanClient;
}

export class MockVibeKanbanClient implements VibeKanbanClient {
  async createIssue(draft: VibeKanbanIssueDraft): Promise<CreateIssueResponse> {
    console.log("[MockVibeKanbanClient] createIssue called with:", draft);
    return Promise.resolve({
      success: true,
      issueId: `mock-issue-${Date.now()}`,
      workspaceUrl: "http://localhost:3002/workspaces/vibe-demo",
      message: "Mock issue created successfully",
    });
  }

  async listProjects(
    orgId: string
  ): Promise<{ success: boolean; projects?: any[]; message?: string }> {
    console.log("[MockVibeKanbanClient] listProjects called with orgId:", orgId);
    return Promise.resolve({
      success: true,
      projects: [{ id: "mock-project-1", name: "Mock Project" }],
    });
  }

  async listStatuses(
    projectId: string
  ): Promise<{ success: boolean; statuses?: any[]; message?: string }> {
    console.log("[MockVibeKanbanClient] listStatuses called with projectId:", projectId);
    return Promise.resolve({
      success: true,
      statuses: [{ id: "mock-status-1", name: "Todo" }],
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
