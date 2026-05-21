import { NextRequest, NextResponse } from "next/server";
import { detectAllCapabilities } from "@/lib/agents/capability-detector";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  try {
    const agents = await detectAllCapabilities();
    return NextResponse.json({ agents });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown error during capability detection";
    return NextResponse.json(
      { error: { message }, agents: {} },
      { status: 500 },
    );
  }
}
