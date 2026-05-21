/**
 * POST /api/hermes/analyze
 * Collects orchestration context and runs Gemma 4 analysis via Ollama.
 */

import { NextResponse } from "next/server";
import { analyzeOrchestrationState, type OrchestrationState } from "@/lib/hermes/gemma4-client";
import type { HermesAnalysis } from "@/lib/types";

type RequestBody = {
  jobId?: string;
  state?: OrchestrationState;
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: RequestBody = {};

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    // body is optional — proceed with empty state
  }

  // Build orchestration state from request (or use empty defaults)
  const state: OrchestrationState = body.state ?? {};

  const analysis: HermesAnalysis = await analyzeOrchestrationState(state);

  return NextResponse.json({ analysis });
}
