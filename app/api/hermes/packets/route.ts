import { readHermesPackets, saveHermesPacket } from "@/lib/storage/hermes-packet-store";
import { notifyHermesPacket } from "@/lib/monitor/hermes-packet-notifier";
import type { MonitorPacket } from "@/lib/monitor/types";

export const runtime = "nodejs";

/**
 * GET /api/hermes/packets
 * Retrieves Hermes execution packets with optional filtering
 *
 * Query parameters:
 *   - limit: Number of recent packets to return (default: 10)
 *   - kind: Filter by packet kind (e.g., "phase-completion")
 *   - taskId: Filter by taskId in packet metadata
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 100);
    const kind = searchParams.get("kind");
    const taskId = searchParams.get("taskId");

    const allPackets = readHermesPackets();

    let filtered = allPackets;

    // Filter by kind
    if (kind) {
      filtered = filtered.filter((p) => p.kind === kind);
    }

    // Filter by taskId in metadata
    if (taskId) {
      filtered = filtered.filter((p) => p.content.metadata?.taskId === taskId);
    }

    // Return most recent packets up to limit
    const recent = filtered.slice(0, limit);

    return Response.json({
      packets: recent,
      total: allPackets.length,
      filtered: filtered.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hermes/packets
 * Saves a new Hermes execution packet
 *
 * Body:
 *   - packet: MonitorPacket object
 *   - notify: Whether to send Telegram notification (default: false)
 *   - preview: Preview mode (console only, no notification)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      packet: MonitorPacket;
      notify?: boolean;
      preview?: boolean;
    };

    if (!body.packet) {
      return Response.json(
        { error: "packet is required in request body" },
        { status: 400 }
      );
    }

    // Save packet to local store
    saveHermesPacket(body.packet);

    // Send notification if requested
    if (body.notify && !body.preview) {
      await notifyHermesPacket(body.packet, {
        includeContext: true,
        includeSections: false,
      });
    }

    return Response.json({
      success: true,
      packet: body.packet,
      notified: body.notify ? true : false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
