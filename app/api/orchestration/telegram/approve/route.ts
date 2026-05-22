/**
 * Telegram Approval Response Intake
 *
 * Current scope: validates and persists approval responses. If the dispatch
 * job exists in the in-memory queue for this server process, approve/reject
 * also updates that job state. It never triggers execution directly.
 */

import { NextRequest, NextResponse } from "next/server";
import { ApprovalRequestStore } from "@/lib/approval/approval-request-store";
import { getGlobalQueue } from "@/lib/dispatch/safe-dispatch-queue";
import { logOrchestrationEvent } from "@/lib/dispatch/orchestration-logger";

interface ApprovalRequest {
  task_id: string;
  user_response: "approve" | "reject" | "preview_first" | "control_room";
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as ApprovalRequest;

    if (!body.task_id || !body.user_response) {
      return NextResponse.json(
        { error: "task_id and user_response required" },
        { status: 400 }
      );
    }

    const validResponses = ["approve", "reject", "preview_first", "control_room"];
    if (!validResponses.includes(body.user_response)) {
      return NextResponse.json(
        { error: `Invalid response. Must be one of: ${validResponses.join(", ")}` },
        { status: 400 }
      );
    }

    const approvalStore = new ApprovalRequestStore();
    const approval = await approvalStore.recordTelegramResponse(
      body.task_id,
      body.user_response,
      { approverNote: body.notes },
    );

    const queue = getGlobalQueue();
    const job = queue.getJob(body.task_id);
    let dispatchJobUpdated = false;
    let dispatchJobStatus: string | null = job?.status ?? null;

    if (job && body.user_response === "approve") {
      try {
        dispatchJobUpdated = queue.updateJobStatus(body.task_id, "approved", {
          approvedAt: approval.resolvedAt ?? new Date().toISOString(),
        });
        dispatchJobStatus = "approved";
      } catch {
        dispatchJobUpdated = false;
      }
    } else if (job && body.user_response === "reject") {
      try {
        dispatchJobUpdated = queue.updateJobStatus(body.task_id, "skipped_due_to_risk", {
          completedAt: approval.resolvedAt ?? new Date().toISOString(),
        });
        dispatchJobStatus = "skipped_due_to_risk";
      } catch {
        dispatchJobUpdated = false;
      }
    }

    logOrchestrationEvent({
      event: "approval_resolved",
      jobId: body.task_id,
      agentId: job?.agentId ?? "claude-code",
      riskLevel: job?.riskLevel ?? "medium",
      timestamp: new Date().toISOString(),
      detail: `telegram:${body.user_response}:persisted=${approval.status}:job_updated=${dispatchJobUpdated}`,
    });

    console.log("[Telegram Approval Intake]", {
      task_id: body.task_id,
      response: body.user_response,
      approvalId: approval.id,
      status: approval.status,
      dispatchJobUpdated,
    });

    return NextResponse.json({
      success: true,
      mode: "recorded",
      persisted: true,
      dispatch_job_updated: dispatchJobUpdated,
      dispatch_job_status: dispatchJobStatus,
      execution_triggered: false,
      approval,
      message: dispatchJobUpdated
        ? `Telegram response recorded: ${body.user_response}. Dispatch job status updated to ${dispatchJobStatus}. Execution was not triggered.`
        : `Telegram response recorded: ${body.user_response}. No matching in-memory dispatch job was updated and no execution was triggered.`,
    });
  } catch (error) {
    console.error("[Telegram Approval Intake Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
