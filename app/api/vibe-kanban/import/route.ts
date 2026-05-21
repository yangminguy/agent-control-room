import { NextResponse } from "next/server";

function normalizeWorkspaceResult(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Prepend a standard header so ResultReviewPanel can parse it consistently
  const lines = trimmed.split("\n");
  const hasHeader = lines[0].startsWith("#") || lines[0].startsWith("##");
  if (hasHeader) return trimmed;

  return `## Vibe Kanban Result\n\n${trimmed}`;
}

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
    });
  } catch (error: any) {
    console.error("[VibeKanban Import API] Error:", error);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
