import { NextResponse } from "next/server";
import { z } from "zod";
import { prepareLoopContinuation } from "@/lib/storage/feature-plan-store";

const LoopContinueSchema = z.object({
  planId: z.string().min(1),
  taskId: z.string().min(1),
  nextPrompt: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = LoopContinueSchema.parse(await request.json());
    const result = await prepareLoopContinuation(
      body.planId,
      body.taskId,
      body.nextPrompt,
    );

    return NextResponse.json({
      success: true,
      targetTask: result.targetTask,
      updatedPlan: result.plan,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
