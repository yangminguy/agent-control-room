/**
 * T-AUTO-010: Approval Gates API
 * POST /api/orchestration/approvals
 *
 * Approve or reject a pending DispatchJob approval request.
 *
 * Request body:
 * {
 *   jobId: string;           // DispatchJob ID
 *   action: "approve" | "reject";
 *   approverNote?: string;   // Optional reason for approval/rejection
 * }
 *
 * Response:
 * {
 *   success: boolean;
 *   message: string;
 *   approval?: ApprovalRequest;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { ApprovalRequestStore } from "@/lib/approval/approval-request-store";
import { SafeDispatchQueue } from "@/lib/dispatch/safe-dispatch-queue";
import type { ApprovalRequestStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      jobId?: string;
      action?: string;
      approverNote?: string;
    };

    const { jobId, action, approverNote } = body;

    // Validate required fields
    if (!jobId || typeof jobId !== "string" || jobId.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid jobId" },
        { status: 400 }
      );
    }

    if (!action || !["approve", "reject"].includes(action)) {
      return NextResponse.json(
        { success: false, error: "Invalid action. Must be 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    // Find the approval request
    const approvalStore = new ApprovalRequestStore();
    const allApprovals = await approvalStore.getPendingApprovals();
    const approval = allApprovals.find((a) => a.dispatchJobId === jobId);

    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval request not found for this job" },
        { status: 404 }
      );
    }

    if (approval.status !== "pending") {
      return NextResponse.json(
        { success: false, error: `Approval already resolved with status: ${approval.status}` },
        { status: 409 }
      );
    }

    // Process approval or rejection
    const newStatus: ApprovalRequestStatus = action === "approve" ? "approved" : "rejected";

    const updated = await approvalStore.updateApprovalStatus(approval.id, newStatus, {
      approverNote,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Failed to update approval status" },
        { status: 500 }
      );
    }

    // Update job status accordingly
    if (action === "reject") {
      // Mark job as skipped due to risk
      const queue = new SafeDispatchQueue();
      await queue.updateJobStatus(jobId, "skipped_due_to_risk", {
        completedAt: new Date().toISOString(),
      });
    } else if (action === "approve") {
      // Mark job as approved (will be picked up by dispatch loop)
      const queue = new SafeDispatchQueue();
      await queue.updateJobStatus(jobId, "approved", {
        approvedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: `Job ${action === "approve" ? "approved and queued for dispatch" : "rejected and skipped"}`,
        approval: updated,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in approval endpoint:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/orchestration/approvals?jobId=xyz
 *
 * Retrieve approval request details for a specific job.
 */
export async function GET(request: NextRequest) {
  try {
    const jobId = request.nextUrl.searchParams.get("jobId");

    if (!jobId || typeof jobId !== "string" || jobId.trim() === "") {
      return NextResponse.json(
        { success: false, error: "Missing or invalid jobId parameter" },
        { status: 400 }
      );
    }

    const approvalStore = new ApprovalRequestStore();
    const allApprovals = await approvalStore.getPendingApprovals();
    const approval = allApprovals.find((a) => a.dispatchJobId === jobId);

    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval request not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        approval,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in approval GET:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
