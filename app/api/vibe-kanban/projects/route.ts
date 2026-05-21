import { NextResponse } from "next/server";
import { getVibeKanbanClient } from "@/lib/integrations/vibe-kanban";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const orgId = searchParams.get("orgId");

  if (!orgId) {
    return NextResponse.json(
      { success: false, message: "Missing required query parameter: orgId" },
      { status: 400 }
    );
  }

  const client = getVibeKanbanClient();
  const result = await client.listProjects(orgId);

  if (!result.success) {
    return NextResponse.json(result, { status: 502 });
  }

  return NextResponse.json(result);
}
