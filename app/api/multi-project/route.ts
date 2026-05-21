import { NextRequest, NextResponse } from "next/server";
import { getMultiProjectOrchestrator } from "@/lib/multi-project/multi-project-orchestrator";

export async function GET(req: NextRequest) {
  try {
    const orchestrator = getMultiProjectOrchestrator();
    const state = orchestrator.getOrchestratorState();
    return NextResponse.json(state, { status: 200 });
  } catch (error) {
    console.error("[multi-project API] GET Error:", error);
    return NextResponse.json(
      { error: "Failed to get orchestrator state", details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, projectId, projectName } = body;

    const orchestrator = getMultiProjectOrchestrator();

    if (action === "activate") {
      if (!projectId || !projectName) {
        return NextResponse.json(
          { error: "Missing projectId or projectName" },
          { status: 400 }
        );
      }
      orchestrator.activateProject(projectId, projectName);
      return NextResponse.json({ success: true, projectId }, { status: 200 });
    }

    if (action === "deactivate") {
      if (!projectId) {
        return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
      }
      orchestrator.deactivateProject(projectId);
      return NextResponse.json({ success: true, projectId }, { status: 200 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("[multi-project API] POST Error:", error);
    return NextResponse.json(
      { error: "Operation failed", details: String(error) },
      { status: 500 }
    );
  }
}
