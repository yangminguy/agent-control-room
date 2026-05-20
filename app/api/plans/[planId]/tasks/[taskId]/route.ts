import { NextRequest, NextResponse } from "next/server";
import { updatePlanTaskStatus } from "@/lib/storage/feature-plan-store";
import type { PlanTaskStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string; taskId: string }> },
) {
  try {
    const { planId, taskId } = await params;
    const body = await req.json();
    const status = body.status as PlanTaskStatus;

    const validStatuses: PlanTaskStatus[] = [
      "planned",
      "ready",
      "running",
      "done",
      "partial",
      "blocked",
      "needs_review",
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const updatedPlan = await updatePlanTaskStatus(
      planId,
      taskId,
      status,
    );

    return NextResponse.json(updatedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
