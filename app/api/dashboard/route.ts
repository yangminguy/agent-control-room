import { NextRequest, NextResponse } from "next/server";
import { buildDashboardSnapshot } from "@/lib/dashboard/dashboard-snapshot-builder";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");

    const snapshot = await buildDashboardSnapshot(projectId || undefined);

    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    console.error("[dashboard API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to build dashboard snapshot", details: String(error) },
      { status: 500 }
    );
  }
}
