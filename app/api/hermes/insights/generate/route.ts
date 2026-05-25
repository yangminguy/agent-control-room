import { generateInsights } from "@/lib/hermes/hermes-insight-generator";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { dryRun?: boolean; maxNew?: number };
    const result = generateInsights(body);
    return Response.json({ success: true, ...result });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return Response.json({ error: msg }, { status: 500 });
  }
}
