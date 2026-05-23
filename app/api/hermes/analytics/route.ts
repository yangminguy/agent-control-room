import {
  analyzePackets,
  getExecutionMetrics,
  analyzeTimeline,
  summarizeAnalytics,
} from "@/lib/monitor/hermes-analytics";

export const runtime = "nodejs";

/**
 * GET /api/hermes/analytics
 *
 * Returns comprehensive Hermes packet analytics:
 * - Success rate and execution metrics
 * - Failure patterns and risk distribution
 * - Timeline analysis
 * - Formatted summary
 *
 * Query parameters:
 *   - metrics: "simple" | "detailed" (default: "detailed")
 *   - hoursBack: Number of hours for timeline analysis (default: 24)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const metricsLevel = searchParams.get("metrics") || "detailed";
    const hoursBack = Math.min(parseInt(searchParams.get("hoursBack") || "24"), 168); // max 1 week

    const analytics = analyzePackets();
    const metrics = getExecutionMetrics();
    const timeline = metricsLevel === "detailed" ? analyzeTimeline(hoursBack) : [];
    const summary = summarizeAnalytics(analytics);

    return Response.json({
      analytics,
      metrics,
      timeline,
      summary,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
