import { NextResponse } from "next/server";
import { z } from "zod";
import { finalizeControlRoomPlan } from "@/lib/control-room/orchestrator";
import {
  getControlRoomPlanById,
  saveControlRoomPlan,
} from "@/lib/control-room/store";

export const runtime = "nodejs";

const RequestSchema = z.object({
  planId: z.string().min(1),
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

    const finalized = finalizeControlRoomPlan(plan);
    await saveControlRoomPlan(finalized);

    return NextResponse.json({
      success: true,
      planningOnly: true,
      message:
        "Plan finalized for review. Execution still has not started; the execute button is required.",
      plan: finalized,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Finalize failed",
      },
      { status: 400 },
    );
  }
}
