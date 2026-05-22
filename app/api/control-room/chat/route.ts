import { NextResponse } from "next/server";
import { z } from "zod";
import { createControlRoomPlan } from "@/lib/control-room/orchestrator";
import {
  getControlRoomPlanById,
  saveControlRoomPlan,
} from "@/lib/control-room/store";

export const runtime = "nodejs";

const MessageSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string(),
});

const RequestSchema = z.object({
  projectId: z.string().optional(),
  projectName: z.string().optional(),
  message: z.string().min(1),
  history: z.array(MessageSchema).default([]),
  existingPlanId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = RequestSchema.parse(await request.json());
    const existingPlan = body.existingPlanId
      ? await getControlRoomPlanById(body.existingPlanId)
      : null;
    const plan = await createControlRoomPlan({
      projectId: body.projectId,
      projectName: body.projectName,
      message: body.message,
      history: body.history,
      existingPlan,
    });

    await saveControlRoomPlan(plan);

    return NextResponse.json({
      success: true,
      planningOnly: true,
      message:
        "Planning updated. No agent, runner, Vibe Kanban execution, or Hermes execution was started.",
      openAiConfigured: Boolean(process.env.OPENAI_API_KEY),
      plan,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Planning failed",
      },
      { status: 400 },
    );
  }
}
