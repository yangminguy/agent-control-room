import { NextResponse } from "next/server";
import {
  MockVibeKanbanClient,
  toVibeKanbanIssueDraft,
} from "@/lib/integrations/vibe-kanban";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { projectName, projectContext, direction, task, assumptions, risks } =
      body;

    if (
      !projectName ||
      !projectContext ||
      !direction ||
      !task ||
      !assumptions ||
      !risks
    ) {
      return NextResponse.json(
        { success: false, message: "Missing required fields" },
        { status: 400 }
      );
    }

    const draft = toVibeKanbanIssueDraft({
      projectName,
      projectContext,
      direction,
      task,
      assumptions,
      risks,
    });

    const client = new MockVibeKanbanClient();
    const result = await client.createIssue(draft);

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 500 });
    }
  } catch (error: any) {
    console.error("[VibeKanban API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
