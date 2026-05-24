import { getAllAgentRuntimes } from "@/lib/agents/runtime-registry";

export const runtime = "nodejs";

// GET /api/ops/runtimes — returns agent runtime status rows for dashboard
export async function GET() {
  try {
    const runtimes = getAllAgentRuntimes();

    const rows = runtimes.map((r) => ({
      agentName: r.displayName,
      agentId: r.id,
      status: mapStatus(r.status),
      rawStatus: r.status,
      tokensUsed: 0,
      tokenQuota: 100000,
      lastCheckedAt: r.lastCheckedAt,
      lastFailureReason: r.lastFailureReason ?? null,
    }));

    return Response.json({ agents: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

function mapStatus(raw: string): "available" | "busy" | "rate-limited" {
  if (raw === "rate_limited" || raw === "token_exhausted" || raw === "cooldown") return "rate-limited";
  if (raw === "available_verified" || raw === "installed_unverified") return "available";
  return "busy";
}
