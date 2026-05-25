import { getInsightStats } from "@/lib/hermes/hermes-insight-store";

export const runtime = "nodejs";

export async function GET() {
  try {
    const stats = getInsightStats();
    return Response.json({ stats });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
