import { NextResponse } from "next/server";
import { getVibeKanbanClient } from "@/lib/integrations/vibe-kanban";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { success: false, message: "Missing required query parameter: projectId" },
      { status: 400 }
    );
  }

  const client = getVibeKanbanClient();
  const result = await client.listStatuses(projectId);

  if (!result.success) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
