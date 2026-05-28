/**
 * POST /api/clarify-reply
 *
 * Phase 18 — L5 CTO가 ACR로 clarification 답변을 회신하는 엔드포인트.
 *
 * Request body:
 * {
 *   l5_task_id: string
 *   phase?: string
 *   questions: string[]
 *   answers: string[]
 * }
 *
 * 동작:
 *   1. l5_task_id로 CTOTaskMetadata 조회 → planId/taskId 해석
 *   2. PlanTask.clarificationAnswers에 (question, answer) pairs 누적
 *   3. 성공/실패 JSON 반환
 *
 * Auth: 신뢰된 내부 호출. 외부 노출 시 L5_SHARED_SECRET 검증 추가 필요.
 */
import { findCTOTaskMetadataByL5Id } from "@/lib/storage/cto-task-metadata-store";
import { appendPlanTaskClarification } from "@/lib/storage/feature-plan-store";

export const runtime = "nodejs";

interface ClarifyReplyBody {
  l5_task_id?: string;
  phase?: string;
  questions?: string[];
  answers?: string[];
}

export async function POST(request: Request) {
  let body: ClarifyReplyBody;
  try {
    body = (await request.json()) as ClarifyReplyBody;
  } catch {
    return Response.json({ success: false, error: "invalid json" }, { status: 400 });
  }

  const sharedSecret = process.env.L5_SHARED_SECRET;
  if (sharedSecret) {
    const header = request.headers.get("x-l5-shared-secret");
    if (header !== sharedSecret) {
      return Response.json({ success: false, error: "unauthorized" }, { status: 401 });
    }
  }

  const { l5_task_id, questions, answers } = body;
  if (!l5_task_id || !Array.isArray(questions) || !Array.isArray(answers)) {
    return Response.json(
      { success: false, error: "l5_task_id, questions[], answers[] are required" },
      { status: 400 },
    );
  }
  if (questions.length !== answers.length) {
    return Response.json(
      { success: false, error: "questions.length must match answers.length" },
      { status: 400 },
    );
  }

  const meta = await findCTOTaskMetadataByL5Id(l5_task_id);
  if (!meta) {
    return Response.json(
      { success: false, error: `no CTOTaskMetadata for l5_task_id=${l5_task_id}` },
      { status: 404 },
    );
  }

  const items = questions.map((q, i) => ({ question: q, answer: answers[i] }));
  try {
    await appendPlanTaskClarification(meta.planId, meta.taskId, items);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ success: false, error: msg }, { status: 500 });
  }

  return Response.json({
    success: true,
    planId: meta.planId,
    taskId: meta.taskId,
    appended: items.length,
  });
}
