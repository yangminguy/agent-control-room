import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { MonitorPacket } from "@/lib/monitor/types";

const PACKETS_FILE = join(process.cwd(), "data/hermes-packets.json");
const PACKETS_DIR = join(process.cwd(), "data");
const MAX_PACKETS = 100;

interface PacketStore {
  packets: MonitorPacket[];
  lastUpdated: string;
}

/**
 * Ensure the data directory exists
 */
function ensureDataDir(): void {
  if (!existsSync(PACKETS_DIR)) {
    mkdirSync(PACKETS_DIR, { recursive: true });
  }
}

/**
 * Read all Hermes packets from the local store
 */
export function readHermesPackets(): MonitorPacket[] {
  try {
    if (!existsSync(PACKETS_FILE)) {
      return [];
    }

    const content = readFileSync(PACKETS_FILE, "utf-8");
    const store = JSON.parse(content) as PacketStore;
    return store.packets || [];
  } catch (error) {
    console.warn("[HermesPacketStore] Error reading packets:", error);
    return [];
  }
}

/**
 * Save a single Hermes packet to the store
 */
export function saveHermesPacket(packet: MonitorPacket): void {
  try {
    ensureDataDir();

    const store: PacketStore = {
      packets: readHermesPackets(),
      lastUpdated: new Date().toISOString(),
    };

    // Check if packet already exists (by id) and update or append
    const existingIndex = store.packets.findIndex((p) => p.id === packet.id);
    if (existingIndex >= 0) {
      store.packets[existingIndex] = packet;
    } else {
      store.packets.push(packet);
    }

    // Keep only the most recent packets (by creation time)
    if (store.packets.length > MAX_PACKETS) {
      store.packets = store.packets
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, MAX_PACKETS);
    }

    store.lastUpdated = new Date().toISOString();
    writeFileSync(PACKETS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("[HermesPacketStore] Error saving packet:", error);
  }
}

/**
 * Get recent Hermes packets (most recent first)
 */
export function getRecentHermesPackets(limit: number = 10): MonitorPacket[] {
  const packets = readHermesPackets();
  return packets
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit);
}

/**
 * Filter packets by kind
 */
export function getPacketsByKind(kind: string): MonitorPacket[] {
  return readHermesPackets().filter((p) => p.kind === kind);
}

/**
 * Filter packets by taskId (in metadata)
 */
export function getPacketsByTask(taskId: string): MonitorPacket[] {
  return readHermesPackets().filter(
    (p) => p.content.metadata?.taskId === taskId
  );
}

/**
 * Clear all packets (use with caution)
 */
export function clearAllPackets(): void {
  try {
    ensureDataDir();
    const store: PacketStore = {
      packets: [],
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(PACKETS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("[HermesPacketStore] Error clearing packets:", error);
  }
}

/**
 * Get packet count
 */
export function getPacketCount(): number {
  return readHermesPackets().length;
}

/**
 * Get packet statistics by kind
 */
export function getPacketStatistics(): Record<string, number> {
  const packets = readHermesPackets();
  const stats: Record<string, number> = {};
  for (const packet of packets) {
    stats[packet.kind] = (stats[packet.kind] || 0) + 1;
  }
  return stats;
}
