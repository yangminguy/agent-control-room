/**
 * POST /api/orchestration/context-pack
 * Phase 40: Full Orchestration Layer
 *
 * Context Pack을 생성하고 markdown 및 relay prompt를 반환한다.
 * read/generate only — 실행 없음.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildContextPack,
  renderContextPackMarkdown as renderContextPackMarkdownV2,
  buildRelayPrompt,
} from "@/lib/orchestration/context-pack-builder";
import type { ContextPackBuilderInput } from "@/lib/orchestration/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<ContextPackBuilderInput>;

    if (!body.title || !body.goal || !body.requestedAgent || !body.reasonForRelay) {
      return NextResponse.json(
        { error: "title, goal, requestedAgent, reasonForRelay는 필수입니다." },
        { status: 400 }
      );
    }

    const input: ContextPackBuilderInput = {
      title: String(body.title),
      goal: String(body.goal),
      completedWork: Array.isArray(body.completedWork) ? body.completedWork : [],
      changedFiles: Array.isArray(body.changedFiles) ? body.changedFiles : [],
      currentState: body.currentState ? String(body.currentState) : undefined,
      keyDecisions: Array.isArray(body.keyDecisions) ? body.keyDecisions : [],
      importantConstraints: Array.isArray(body.importantConstraints) ? body.importantConstraints : [],
      currentBlockers: Array.isArray(body.currentBlockers) ? body.currentBlockers : [],
      remainingWork: Array.isArray(body.remainingWork) ? body.remainingWork : [],
      acceptanceCriteria: Array.isArray(body.acceptanceCriteria) ? body.acceptanceCriteria : [],
      filesAllowedToEdit: Array.isArray(body.filesAllowedToEdit) ? body.filesAllowedToEdit : [],
      filesBlockedFromEditing: Array.isArray(body.filesBlockedFromEditing) ? body.filesBlockedFromEditing : [],
      doNotDoRules: Array.isArray(body.doNotDoRules) ? body.doNotDoRules : [],
      nextPrompt: body.nextPrompt ? String(body.nextPrompt) : undefined,
      requestedAgent: body.requestedAgent,
      reasonForRelay: String(body.reasonForRelay),
      sessionHistory: Array.isArray(body.sessionHistory) ? body.sessionHistory : [],
    };

    const contextPack = buildContextPack(input);
    const markdown = renderContextPackMarkdownV2(contextPack);
    const relayPrompt = buildRelayPrompt(contextPack);

    return NextResponse.json({ contextPack, markdown, relayPrompt });
  } catch (error) {
    console.error("[orchestration/context-pack] error:", error);
    return NextResponse.json(
      { error: "Context Pack 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: "POST /api/orchestration/context-pack — ContextPack 생성",
    required: ["title", "goal", "requestedAgent", "reasonForRelay"],
    optional: [
      "completedWork", "changedFiles", "currentState", "keyDecisions",
      "importantConstraints", "currentBlockers", "remainingWork",
      "acceptanceCriteria", "filesAllowedToEdit", "filesBlockedFromEditing",
      "doNotDoRules", "nextPrompt", "sessionHistory",
    ],
  });
}
