import { NextResponse } from "next/server";
import { normalizeWorkspaceResult } from "@/lib/integrations/vibe-kanban-import";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { issueId, workspaceResult } = body as {
      issueId?: string;
      workspaceResult?: string;
    };

    if (!issueId || typeof issueId !== "string") {
      return NextResponse.json(
        { success: false, message: "issueId is required" },
        { status: 400 }
      );
    }

    if (!workspaceResult || typeof workspaceResult !== "string") {
      return NextResponse.json(
        { success: false, message: "workspaceResult is required" },
        { status: 400 }
      );
    }

    const rawResult = normalizeWorkspaceResult(workspaceResult);

    return NextResponse.json({
      success: true,
      rawResult,
      source: "vibe-kanban" as const,
      issueId,
      reviewOnly: true,
      message:
        "Imported Vibe Kanban result for review only. No execution, approval bypass, roadmap update, or task completion was triggered.",
    });
  } catch (error: any) {
    console.error("[VibeKanban Import API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
