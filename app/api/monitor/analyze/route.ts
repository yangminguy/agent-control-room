/**
 * POST /api/monitor/analyze
 * Runs Hermes analysis via Gemini API (Primary/Secondary fallback).
 * Hermes는 코드 작성자가 아니라 오케스트레이션 보조 워커입니다.
 */

import { NextResponse } from "next/server";
import { getHermesLLMClient } from "@/lib/monitor/hermes-llm-client";
import { getMonitorMonitor } from "@/lib/monitor/monitor-api-monitor";
import type { MonitorAnalysis } from "@/lib/types";

type RequestBody = {
  jobId?: string;
  state?: unknown;
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: RequestBody = {};

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    // body is optional — proceed with empty state
  }

  const state = body.state ?? {};

  try {
    // OpenAI API 호출 (Primary → Secondary fallback)
    const client = getHermesLLMClient();
    const analysis: MonitorAnalysis = await client.analyzeOrchestrationState(state);

    // API 상태 확인 및 모니터링
    const monitor = getMonitorMonitor();
    const health = monitor.checkHealth();

    // Critical 상태면 응답에 경고 추가
    if (health.alert?.severity === "critical") {
      console.warn("[Hermes] API 건강도 저하:", health.alert.message);
      // 알림은 클라이언트에서 처리
    }

    return NextResponse.json({
      analysis,
      apiStatus: {
        isHealthy: health.isHealthy,
        status: health.status,
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[Hermes] 분석 실패:", error);

    // 완전 실패 시에도 기본값 반환 (graceful degradation)
    const fallbackAnalysis: MonitorAnalysis = {
      insights: ["API 연결 문제"],
      recommendations: ["나중에 다시 시도해주세요"],
      riskFlags: ["⚠️ Hermes 분석 실패"],
      analyzedAt: new Date().toISOString(),
    };

    return NextResponse.json(
      {
        analysis: fallbackAnalysis,
        apiStatus: {
          isHealthy: false,
          status: "error",
          error,
        },
      },
      { status: 500 }
    );
  }
}
