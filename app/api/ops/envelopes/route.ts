import { listPendingEnvelopes } from "@/lib/agents/action-envelope-store";

export const runtime = "nodejs";

// GET /api/ops/envelopes — returns pending action envelopes
export async function GET() {
  try {
    const result = await listPendingEnvelopes();
    if (!result.success) {
      return Response.json({ error: result.error }, { status: 500 });
    }
    return Response.json(result.data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
