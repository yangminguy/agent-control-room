/**
 * GET /api/hermes/insights
 * POST /api/hermes/insights
 *
 * 역할: Hermes insights에 대한 CRUD 엔드포인트
 * - GET: 모든 insights 또는 필터링된 insights 조회
 * - POST: 새로운 insight 기록
 *
 * Phase 3-P0: 로컬 JSON 저장소 통합
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getAllInsights,
  getInsightsBySeverity,
  getRecentInsights,
  getInsightsByTaskId,
  getInsightsByPlanId,
  getCriticalInsights,
  recordExecutionInsights,
} from "@/lib/hermes/insight-lifecycle";
import { getAllHermesInsights } from "@/lib/storage/hermes-insight-store";
import type { HermesInsight } from "@/lib/hermes/insight-recorder";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const severity = searchParams.get("severity") as "critical" | "warning" | "info" | null;
    const hours = searchParams.get("hours");
    const taskId = searchParams.get("taskId");
    const planId = searchParams.get("planId");
    const recent = searchParams.get("recent") === "true";

    let insights: HermesInsight[];

    // 필터별 조회
    if (severity) {
      insights = await getInsightsBySeverity(severity);
    } else if (hours) {
      const hoursNum = parseInt(hours, 10);
      insights = await getRecentInsights(hoursNum);
    } else if (taskId) {
      insights = await getInsightsByTaskId(taskId);
    } else if (planId) {
      insights = await getInsightsByPlanId(planId);
    } else if (recent) {
      insights = await getRecentInsights(24);
    } else {
      // 모든 insights
      insights = await getAllInsights();
    }

    return NextResponse.json({
      success: true,
      count: insights.length,
      insights,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hermes/insights] GET error:", message);
    return NextResponse.json(
      { error: "Failed to fetch insights", details: message },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as any;

    // insight 직접 추가
    if (body.insight) {
      const insight = body.insight as HermesInsight;
      const insights = await getAllHermesInsights();
      insights.push(insight);

      const { writeHermesInsights } = await import("@/lib/storage/hermes-insight-store");
      await writeHermesInsights(insights);

      return NextResponse.json({
        success: true,
        message: "Insight recorded",
        insight,
      });
    }

    // 실행 결과로부터 insights 생성
    if (body.executionResult && body.decision && body.task) {
      const newInsights = await recordExecutionInsights(
        body.executionResult,
        body.decision,
        body.task,
      );

      return NextResponse.json({
        success: true,
        message: `Generated ${newInsights.length} insights`,
        insights: newInsights,
      });
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[hermes/insights] POST error:", message);
    return NextResponse.json(
      { error: "Failed to record insight", details: message },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  // 헬스 체크
  const critical = await getCriticalInsights();
  return NextResponse.json(
    { hasCritical: critical.length > 0 },
    {
      headers: {
        "X-Critical-Count": String(critical.length),
      },
    }
  );
}
