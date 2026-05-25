import { getGitHubConfig, createPullRequest, buildPRBody } from "@/lib/integrations/github-pr-creator";

export const runtime = "nodejs";

/**
 * POST /api/integrations/github/pr
 * Creates a GitHub PR for a completed task.
 *
 * Body:
 *   - taskId: string
 *   - taskTitle: string
 *   - agent: string
 *   - branchName: string       — source branch (head)
 *   - baseBranch?: string      — target branch, defaults to "main"
 *   - changedFiles?: string[]
 *   - summary?: string
 *   - draft?: boolean
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      taskId: string;
      taskTitle: string;
      agent: string;
      branchName: string;
      baseBranch?: string;
      changedFiles?: string[];
      summary?: string;
      draft?: boolean;
    };

    const { taskId, taskTitle, agent, branchName, baseBranch = "main", changedFiles = [], summary, draft } = body;

    if (!taskId || !taskTitle || !branchName) {
      return Response.json({ error: "taskId, taskTitle, and branchName are required" }, { status: 400 });
    }

    const config = getGitHubConfig();
    if (!config) {
      return Response.json(
        { skipped: true, reason: "GITHUB_TOKEN, GITHUB_OWNER, or GITHUB_REPO not set" },
        { status: 200 }
      );
    }

    const prBody = buildPRBody(taskTitle, taskId, agent, changedFiles, summary);
    const result = await createPullRequest(config, {
      title: `[ACR] ${taskTitle}`,
      body: prBody,
      head: branchName,
      base: baseBranch,
      draft,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 502 });
    }

    return Response.json({ prNumber: result.prNumber, url: result.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
