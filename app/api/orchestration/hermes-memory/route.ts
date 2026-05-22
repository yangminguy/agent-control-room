/**
 * POST /api/orchestration/hermes-memory
 * Phase 40: Full Orchestration Layer
 *
 * Hermes Memory Note를 생성하고 Obsidian-compatible markdown을 반환한다.
 * 실제 Hermes 실행 없음 — markdown note 생성까지만.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  buildHermesMemoryNote,
  renderHermesMemoryMarkdown,
  suggestHermesMemoryType,
} from "@/lib/orchestration/hermes-memory-builder";
import type { HermesMemoryNoteInput } from "@/lib/orchestration/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<HermesMemoryNoteInput>;

    if (!body.title || !body.content) {
      return NextResponse.json(
        { error: "title과 content는 필수입니다." },
        { status: 400 }
      );
    }

    const input: HermesMemoryNoteInput = {
      type: body.type,
      title: String(body.title),
      content: String(body.content),
      tags: Array.isArray(body.tags) ? body.tags : [],
      relatedTaskIds: Array.isArray(body.relatedTaskIds) ? body.relatedTaskIds : [],
      relatedFiles: Array.isArray(body.relatedFiles) ? body.relatedFiles : [],
      taskId: body.taskId ? String(body.taskId) : undefined,
    };

    const note = buildHermesMemoryNote(input);
    const markdown = renderHermesMemoryMarkdown(note);
    const suggestedType = suggestHermesMemoryType(input);

    return NextResponse.json({ note, markdown, suggestedType });
  } catch (error) {
    console.error("[orchestration/hermes-memory] error:", error);
    return NextResponse.json(
      { error: "Hermes Memory Note 생성 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    description: "POST /api/orchestration/hermes-memory — HermesMemoryNote 생성",
    required: ["title", "content"],
    optional: ["type", "tags", "relatedTaskIds", "relatedFiles", "taskId"],
    noteTypes: [
      "session_summary", "decision", "failure", "prompt_pattern",
      "agent_performance", "context_pack", "blocker",
    ],
    obsidianPaths: {
      session_summary: "output/obsidian/session-summaries/",
      decision: "output/obsidian/decisions/",
      failure: "output/obsidian/failures/",
      prompt_pattern: "output/obsidian/prompt-patterns/",
      agent_performance: "output/obsidian/agent-performance/",
      context_pack: "output/obsidian/context-packs/",
      blocker: "output/obsidian/blockers/",
    },
  });
}
