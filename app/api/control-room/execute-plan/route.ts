import { NextResponse } from "next/server";
import { z } from "zod";
import { executeControlRoomPlan } from "@/lib/control-room/execution";
import { getControlRoomPlanById } from "@/lib/control-room/store";

export const runtime = "nodejs";

const RequestSchema = z.object({
  planId: z.string().min(1),
  vibeProjectId: z.string().optional(),
  vibeStatusId: z.string().optional(),
  approvalStatement: z.literal("I approve starting this finalized plan"),
});

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    const plan = await getControlRoomPlanById(body.planId);

    if (!plan) {
      return NextResponse.json(
        { success: false, error: `Plan not found: ${body.planId}` },
        { status: 404 },
      );
    }

    const run = await executeControlRoomPlan({
      plan,
      vibeProjectId: body.vibeProjectId,
      vibeStatusId: body.vibeStatusId,
    });

    return NextResponse.json({
      success: true,
      message:
        "Execution plan queued after explicit user approval. Agent runner execution still requires the workbench approval gate.",
      run,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Execution failed",
      },
      { status: 400 },
    );
  }
}
