import { NextRequest, NextResponse } from "next/server";
import { getRoadmap } from "@/lib/storage/roadmap-store";

/**
 * GET /api/roadmap?projectId=<projectId>
 *
 * 프로젝트의 로드맵 데이터를 반환한다.
 * Antigravity가 `/plan` visual roadmap control panel을 구현할 때 사용된다.
 *
 * Response:
 * - 200: { roadmap: Roadmap }
 * - 404: { error: "Roadmap not found for project {projectId}" }
 */
export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId");

  if (!projectId) {
    return NextResponse.json(
      { error: "projectId query parameter is required" },
      { status: 400 }
    );
  }

  const roadmap = await getRoadmap(projectId);
  if (!roadmap) {
    return NextResponse.json(
      { error: `Roadmap not found for project ${projectId}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ roadmap }, { status: 200 });
}
