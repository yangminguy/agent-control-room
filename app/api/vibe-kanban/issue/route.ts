import { NextResponse } from "next/server";
import {
  getVibeKanbanClient,
  isMockVibeKanbanClient,
  toVibeKanbanIssueDraft,
} from "@/lib/integrations/vibe-kanban";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      projectName,
      projectContext,
      direction,
      task,
      assumptions,
      risks,
      projectId,
      statusId,
    } = body;

    if (
      !projectName ||
      !projectContext ||
      !direction ||
      !task ||
      !assumptions ||
      !risks ||
      !projectId ||
      !statusId
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
      projectId,
      statusId,
    });

    const client = getVibeKanbanClient();
    const isMock = isMockVibeKanbanClient(client);
    const result = await client.createIssue(draft);

    if (!result.success) {
      return NextResponse.json(
        {
          ...result,
          mode: "real",
          draft,
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        ...result,
        mode: isMock ? "mock" : "real",
        draft,
        message: isMock
          ? "Vibe Kanban URL is not configured; created a local mock draft only."
          : result.message,
      },
      { status: isMock ? 202 : 200 },
    );
  } catch (error: any) {
    console.error("[VibeKanban API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
