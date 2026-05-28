/**
 * POST /api/l5-callback
 *
 * ACR 태스크 완료/실패 시 L5 Business OS로 결과를 전달하는 엔드포인트.
 * ACR UI나 실행 엔진이 호출. L5의 POST /api/agent:taskCallback으로 중계.
 *
 * Request body:
 * {
 *   l5_task_id: string
 *   plan_id: string
 *   phase: string          — 완료된 phase 이름
 *   status: "phase_complete" | "all_done" | "failed" | "blocked"
 *   output_summary: string
 *   next_owner?: string
 *   l5_base_url?: string   — L5 서버 주소 (기본: http://localhost:13001)
 *   l5_token?: string      — L5 JWT (없으면 환경변수 L5_ADMIN_TOKEN 사용)
 * }
 */

export const runtime = "nodejs";

const DEFAULT_L5_URL = process.env.L5_BASE_URL ?? "http://localhost:13001";
const DEFAULT_L5_TOKEN = process.env.L5_ADMIN_TOKEN ?? "";

interface L5CallbackRequest {
  l5_task_id: string;
  plan_id?: string;
  phase: string;
  status:
    | "phase_complete"
    | "all_done"
    | "failed"
    | "blocked"
    | "needs_clarification"
    | "risk_reassess";
  output_summary: string;
  next_owner?: string;
  l5_base_url?: string;
  l5_token?: string;
  // Phase 16: phase-to-phase context handoff
  diff_summary?: string;
  log_tail?: string;
  exit_code?: number;
  branch?: string;
  // Phase 18: clarification + risk reassessment
  questions?: string[];
  acr_callback_url?: string;
  new_risk_level?: "D1" | "D2" | "D3" | "D4" | "D5";
}

export async function POST(request: Request) {
  try {
    const body = await request.json() as L5CallbackRequest;

    if (!body.l5_task_id || !body.status) {
      return Response.json(
        { success: false, error: "l5_task_id and status are required" },
        { status: 400 }
      );
    }

    const l5Url = body.l5_base_url ?? DEFAULT_L5_URL;
    const l5Token = body.l5_token ?? DEFAULT_L5_TOKEN;

    const payload = {
      l5_task_id: body.l5_task_id,
      phase: body.phase,
      status: body.status,
      output_summary: body.output_summary,
      ...(body.next_owner ? { next_owner: body.next_owner } : {}),
      ...(body.diff_summary !== undefined ? { diff_summary: body.diff_summary } : {}),
      ...(body.log_tail !== undefined ? { log_tail: body.log_tail } : {}),
      ...(body.exit_code !== undefined ? { exit_code: body.exit_code } : {}),
      ...(body.branch !== undefined ? { branch: body.branch } : {}),
      ...(body.questions !== undefined ? { questions: body.questions } : {}),
      ...(body.acr_callback_url !== undefined ? { acr_callback_url: body.acr_callback_url } : {}),
      ...(body.new_risk_level !== undefined ? { new_risk_level: body.new_risk_level } : {}),
    };

    let l5Response: Response;
    try {
      l5Response = await fetch(`${l5Url}/api/agent:taskCallback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(l5Token ? { Authorization: `Bearer ${l5Token}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(5000),
      });
    } catch (fetchError) {
      const msg = fetchError instanceof Error ? fetchError.message : String(fetchError);
      console.warn(`[l5-callback] L5 서버 연결 실패 (${l5Url}):`, msg);
      return Response.json({
        success: false,
        error: `L5 서버 연결 실패: ${msg}`,
        l5_url: l5Url,
      }, { status: 502 });
    }

    const l5Data = await l5Response.json().catch(() => ({}));

    return Response.json({
      success: l5Response.ok,
      l5_status: l5Response.status,
      l5_response: l5Data,
      l5_task_id: body.l5_task_id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[l5-callback] error:", message);
    return Response.json({ success: false, error: message }, { status: 500 });
  }
}
