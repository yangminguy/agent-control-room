/**
 * POST /api/workbench/approval
 *
 * Issues a server-side approval token for workbench execution.
 * Token is tied to specific planId, taskId, agent, cwd.
 *
 * Request:
 * {
 *   planId: string
 *   taskId: string
 *   agent: "claude-code" | "codex" | "antigravity"
 *   cwd: string
 * }
 *
 * Response:
 * {
 *   success: true
 *   approvalToken: string
 *   expiresIn: number (seconds)
 * }
 *
 * Error response:
 * {
 *   success: false
 *   error: string
 * }
 */

import { issueApprovalToken } from "@/lib/orchestration/approval-token-store";
import type { ApprovalTokenContext } from "@/lib/orchestration/approval-token-store";
import { getFeaturePlanById } from "@/lib/storage/feature-plan-store";
import { getProjects } from "@/lib/storage/json-store";
import { resolveRealPath, validateCwdSafety } from "@/lib/runner/git-utils";
import { createHash } from "crypto";

const SUPPORTED_AGENTS = new Set(["claude-code"]);
const APPROVAL_STATEMENT = "I approve local execution for this exact task";

type ApprovalChecklist = {
  riskAck?: boolean;
  forbiddenFiles?: boolean;
  verifyCommands?: boolean;
  finalApproval?: boolean;
};

function isChecklistComplete(checklist: ApprovalChecklist | undefined): boolean {
  return Boolean(
    checklist?.riskAck &&
    checklist.forbiddenFiles &&
    checklist.verifyCommands &&
    checklist.finalApproval,
  );
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      planId?: string;
      taskId?: string;
      agent?: string;
      cwd?: string;
      approvalChecklist?: ApprovalChecklist;
      approvalStatement?: string;
      promptHash?: string;
    };

    const { planId, taskId, agent, cwd, approvalChecklist, approvalStatement, promptHash } = body;

    // Validate required fields
    if (!planId || typeof planId !== "string" || planId.trim() === "") {
      return Response.json(
        { success: false, error: "Missing or invalid planId" },
        { status: 400 }
      );
    }

    if (!taskId || typeof taskId !== "string" || taskId.trim() === "") {
      return Response.json(
        { success: false, error: "Missing or invalid taskId" },
        { status: 400 }
      );
    }

    if (!agent || !SUPPORTED_AGENTS.has(agent)) {
      return Response.json(
        { success: false, error: `Unsupported local runner agent: ${agent}. Manual handoff is required unless the agent is explicitly allowlisted.` },
        { status: 400 }
      );
    }

    if (!cwd || typeof cwd !== "string" || cwd.trim() === "") {
      return Response.json(
        { success: false, error: "Missing or invalid cwd" },
        { status: 400 }
      );
    }

    if (!isChecklistComplete(approvalChecklist)) {
      return Response.json(
        { success: false, error: "Approval checklist is incomplete. Complete the workbench approval gate before requesting an execution token." },
        { status: 403 }
      );
    }

    if (approvalStatement !== APPROVAL_STATEMENT) {
      return Response.json(
        { success: false, error: "Approval statement is missing or invalid." },
        { status: 403 }
      );
    }

    // MVP safety gate: this is not a replacement for user auth or a durable
    // approval ledger. It prevents arbitrary token minting by binding issuance
    // to an existing plan/task/project, exact agent, exact project cwd, and a
    // prompt fingerprint from the stored task.
    const plan = await getFeaturePlanById(planId);
    if (!plan) {
      return Response.json(
        { success: false, error: `Plan not found: ${planId}` },
        { status: 404 }
      );
    }

    const task = plan.tasks.find((candidate) => candidate.id === taskId);
    if (!task) {
      return Response.json(
        { success: false, error: `Task not found under plan: ${taskId}` },
        { status: 404 }
      );
    }

    if (task.assignedAgent !== agent) {
      return Response.json(
        { success: false, error: `Agent mismatch. Task is assigned to ${task.assignedAgent}, not ${agent}.` },
        { status: 403 }
      );
    }

    if (!task.generatedPrompt) {
      return Response.json(
        { success: false, error: "Task has no generated prompt to approve." },
        { status: 400 }
      );
    }

    if (promptHash !== sha256(task.generatedPrompt)) {
      return Response.json(
        { success: false, error: "Prompt fingerprint mismatch. Refresh the workbench and review the current prompt." },
        { status: 403 }
      );
    }

    const projects = await getProjects();
    const project = projects.find((candidate) => candidate.id === plan.projectId);
    if (!project) {
      return Response.json(
        { success: false, error: `Project not found for plan: ${plan.projectId}` },
        { status: 404 }
      );
    }

    if (!validateCwdSafety(cwd, project.path)) {
      return Response.json(
        { success: false, error: "Invalid working directory. Path must stay inside the task's project boundary." },
        { status: 403 }
      );
    }

    const requestedCwd = resolveRealPath(cwd);
    const expectedCwd = resolveRealPath(project.path);
    if (!requestedCwd || !expectedCwd || requestedCwd !== expectedCwd) {
      return Response.json(
        { success: false, error: "Working directory must exactly match the registered project path for local execution." },
        { status: 403 }
      );
    }

    // Issue token
    const context: ApprovalTokenContext = {
      planId,
      taskId,
      agent: agent as "claude-code" | "codex" | "antigravity",
      cwd,
    };

    const approvalToken = issueApprovalToken(context);
    const expiresIn = 5 * 60; // 5 minutes in seconds

    return Response.json(
      {
        success: true,
        approvalToken,
        expiresIn,
      },
      { status: 200 }
    );
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
