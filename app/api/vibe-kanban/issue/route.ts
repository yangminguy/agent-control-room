import { NextResponse } from "next/server";
import {
  MockVibeKanbanClient,
  getVibeKanbanClient,
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

    const client = getVibeKanbanClient();
    let result = await client.createIssue(draft);

    if (!result.success && !(client instanceof MockVibeKanbanClient)) {
      console.warn(
        "[VibeKanban API] Real client failed, falling back to mock. Reason:",
        result.message
      );
      const fallback = new MockVibeKanbanClient();
      result = await fallback.createIssue(draft);
    }

    return NextResponse.json(result, { status: result.success ? 200 : 500 });
  } catch (error: any) {
    console.error("[VibeKanban API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
