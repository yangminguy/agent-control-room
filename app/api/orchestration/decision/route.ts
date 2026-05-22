/**
 * POST /api/orchestration/decision
 * Phase 40: Full Orchestration Layer
 *
 * 작업 설명을 받아 OrchestrationDecision을 반환한다.
 * read/generate only — 실행, 배포, git push 없음.
 */

import { NextRequest, NextResponse } from "next/server";
import { makeOrchestrationDecision } from "@/lib/orchestration/decision-engine";
import type { OrchestrationDecisionInput } from "@/lib/orchestration/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<OrchestrationDecisionInput>;

    if (!body.title || !body.description) {
      return NextResponse.json(
        { error: "title과 description은 필수입니다." },
        { status: 400 }
      );
    }

    const input: OrchestrationDecisionInput = {
      title: String(body.title),
      description: String(body.description),
      filePaths: Array.isArray(body.filePaths) ? body.filePaths : undefined,
      taskType: body.taskType ? String(body.taskType) : undefined,
      currentAgent: body.currentAgent,
      currentAgentStatus: body.currentAgentStatus ? String(body.currentAgentStatus) : undefined,
      sessionContext: body.sessionContext ? String(body.sessionContext) : undefined,
      planId: body.planId ? String(body.planId) : undefined,
      taskId: body.taskId ? String(body.taskId) : undefined,
    };

    const decision = makeOrchestrationDecision(input);

    return NextResponse.json({ decision });
  } catch (error) {
    console.error("[orchestration/decision] error:", error);
    return NextResponse.json(
      { error: "오케스트레이션 판단 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: "POST /api/orchestration/decision — OrchestrationDecision 생성",
    required: ["title", "description"],
    optional: ["filePaths", "taskType", "currentAgent", "currentAgentStatus", "sessionContext", "planId", "taskId"],
  });
}
