import {
  readExecutionPackets,
  getRecentExecutionPackets,
  getExecutionPacketsByTask,
  getExecutionPacketsByPlan,
} from "@/lib/storage/execution-packet-store";
import type { HermesPacket } from "@/lib/types";

export const runtime = "nodejs";

/**
 * GET /api/execution-packets
 * Retrieves execution packets with optional filtering
 *
 * Query parameters:
 *   - limit: Number of recent packets to return (default: 10)
 *   - taskId: Filter by taskId
 *   - planId: Filter by planId
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const taskId = searchParams.get("taskId");
    const planId = searchParams.get("planId");

    let packets: HermesPacket[];

    if (taskId) {
      packets = getExecutionPacketsByTask(taskId);
    } else if (planId) {
      packets = getExecutionPacketsByPlan(planId);
    } else {
      packets = getRecentExecutionPackets(limit);
    }

    return Response.json({
      packets,
      total: readExecutionPackets().length,
      count: packets.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
