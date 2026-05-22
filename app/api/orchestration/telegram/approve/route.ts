/**
 * Telegram Approval Handler
 * Processes user responses from Telegram approval requests
 */

import { NextRequest, NextResponse } from "next/server";

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

    const approval = {
      task_id: body.task_id,
      user_response: body.user_response,
      timestamp: Date.now(),
      notes: body.notes,
    };

    // In production, this would:
    // 1. Store approval in database
    // 2. Update dispatch job status
    // 3. Trigger next action based on response
    // 4. Send confirmation back to Telegram

    console.log("[Telegram Approval]", approval);

    return NextResponse.json({
      success: true,
      approval,
      message: `Approval recorded: ${body.user_response}`,
    });
  } catch (error) {
    console.error("[Telegram Approval Error]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
