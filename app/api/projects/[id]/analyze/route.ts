/**
 * POST /api/projects/:id/analyze
 * Analyze a project path and save context to cache
 */

import { NextRequest, NextResponse } from "next/server";
import { analyzeProjectPath } from "@/lib/orchestration/project-context-manager";
import { saveProjectContext } from "@/lib/orchestration/project-store";

const DANGEROUS_PATHS = [
  "/", "/~", "/etc", "/usr", "/var", "/sys", "/proc",
  "/Volumes", "/Users",
  "C:\\", "C:\\Program Files", "C:\\Windows",
];

function isDangerousPath(projectPath: string): boolean {
  const normalized = projectPath.replace(/\\/g, "/").toLowerCase();
  return DANGEROUS_PATHS.some((p) => normalized === p || normalized === p.toLowerCase());
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { projectPath } = await request.json() as { projectPath: string };

    if (!projectPath) {
      return NextResponse.json(
        { error: "projectPath is required" },
        { status: 400 }
      );
    }

    // Security: reject dangerous paths
    if (isDangerousPath(projectPath)) {
      return NextResponse.json(
        { error: "Access denied to system directories" },
        { status: 403 }
      );
    }

    // Analyze project
    const context = analyzeProjectPath(projectPath);

    // Save to cache
    await saveProjectContext(id, context);

    return NextResponse.json({
      success: true,
      context,
    });
  } catch (error) {
    console.error("[analyze] 에러:", error);
    return NextResponse.json(
      { error: "Failed to analyze project", details: String(error) },
      { status: 500 }
    );
  }
}
