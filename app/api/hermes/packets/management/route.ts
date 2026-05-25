import {
  searchPackets,
  archiveOldPackets,
  deduplicatePackets,
  getPacketStatistics,
  retainPacketsForDays,
  extractInsightsFromPackets,
} from "@/lib/monitor/packet-management";

export const runtime = "nodejs";

/**
 * GET /api/hermes/packets/management
 * Management information and statistics
 *
 * Query parameters:
 *   - action: "stats" | "insights" (default: "stats")
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action") || "stats";

    if (action === "insights") {
      const insights = extractInsightsFromPackets();
      return Response.json({ insights });
    }

    const stats = getPacketStatistics();
    return Response.json({ stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hermes/packets/management
 * Perform management actions
 *
 * Body:
 *   - action: "search" | "archive" | "deduplicate" | "cleanup"
 *   - params: Action-specific parameters
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      action: "search" | "archive" | "deduplicate" | "cleanup";
      params?: Record<string, unknown>;
    };

    const { action, params = {} } = body;

    if (action === "search") {
      const query = (params.query as string) || "";
      const kind = params.kind as string | undefined;
      const taskId = params.taskId as string | undefined;
      const riskLevel = params.riskLevel as
        | "low"
        | "medium"
        | "high"
        | undefined;
      const limit = Math.min((params.limit as number) || 50, 100);

      const results = searchPackets(query, {
        kind,
        taskId,
        riskLevel,
        limit,
      });

      return Response.json({
        success: true,
        action,
        resultCount: results.length,
        results: results.map((r) => ({
          id: r.packet.id,
          kind: r.packet.kind,
          title: r.packet.title,
          description: r.packet.description,
          createdAt: r.packet.createdAt,
          matchedFields: r.matchedFields,
          relevanceScore: r.relevanceScore,
        })),
      });
    }

    if (action === "archive") {
      const daysOld = Math.max((params.daysOld as number) || 30, 1);
      const archive = archiveOldPackets(daysOld);

      return Response.json({
        success: true,
        action,
        archive,
      });
    }

    if (action === "deduplicate") {
      const result = deduplicatePackets();

      return Response.json({
        success: true,
        action,
        removedCount: result.removedCount,
        remainingCount: result.remainingCount,
      });
    }

    if (action === "cleanup") {
      const daysToKeep = Math.max((params.daysToKeep as number) || 7, 1);
      const result = retainPacketsForDays(daysToKeep);

      return Response.json({
        success: true,
        action,
        removedCount: result.removedCount,
        remainingCount: result.remainingCount,
        daysToKeep,
      });
    }

    return Response.json(
      { error: `Unknown action: ${action}` },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
