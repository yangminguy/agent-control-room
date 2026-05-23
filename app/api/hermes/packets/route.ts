import { readHermesPackets, getRecentHermesPackets } from "@/lib/storage/hermes-packet-store";
import type { MonitorPacket } from "@/lib/monitor/types";

export const runtime = "nodejs";

/**
 * GET /api/hermes/packets
 *
 * Returns recent Hermes packets (execution results, feedback, etc.)
 * Query params:
 * - limit: number of packets to return (default: 10, max: 100)
 * - kind: filter by packet kind (e.g., "failure", "phase-completion")
 * - dispatchJobId: filter by dispatch job ID
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limitStr = url.searchParams.get("limit") || "10";
    const kind = url.searchParams.get("kind");
    const dispatchJobId = url.searchParams.get("dispatchJobId");

    const limit = Math.min(parseInt(limitStr), 100);
    if (isNaN(limit) || limit < 1) {
      return Response.json(
        { error: "limit must be a positive number" },
        { status: 400 }
      );
    }

    // Read packets from store
    let packets = getRecentHermesPackets(limit);

    // Apply filters
    if (kind) {
      packets = packets.filter((p) => p.kind === kind);
    }

    if (dispatchJobId) {
      packets = packets.filter(
        (p) => p.executionContext?.dispatchJobId === dispatchJobId
      );
    }

    return Response.json({
      packets,
      count: packets.length,
      total: readHermesPackets().length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hermes/packets
 *
 * Save a Hermes packet (called internally or for manual testing)
 * Body: MonitorPacket object
 */
export async function POST(request: Request) {
  try {
    const packet = (await request.json()) as MonitorPacket;

    // Basic validation
    if (!packet.id || !packet.kind || !packet.title) {
      return Response.json(
        { error: "packet must have id, kind, and title" },
        { status: 400 }
      );
    }

    // Save to store
    const store = await import("@/lib/storage/hermes-packet-store");
    store.saveHermesPacket(packet);

    return Response.json({
      success: true,
      id: packet.id,
      kind: packet.kind,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
