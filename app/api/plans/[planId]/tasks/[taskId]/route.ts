import { NextRequest, NextResponse } from "next/server";
import { updatePlanTaskStatus } from "@/lib/storage/feature-plan-store";
import type { PlanTaskStatus } from "@/lib/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { planId: string; taskId: string } },
) {
  try {
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
      params.planId,
      params.taskId,
      status,
    );

    return NextResponse.json(updatedPlan);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
