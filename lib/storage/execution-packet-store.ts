import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import type { HermesPacket } from "@/lib/types";

const PACKETS_FILE = join(process.cwd(), "data/execution-packets.json");
const PACKETS_DIR = join(process.cwd(), "data");
const MAX_PACKETS = 100;

interface ExecutionPacketStore {
  packets: HermesPacket[];
  lastUpdated: string;
}

function ensureDataDir(): void {
  if (!existsSync(PACKETS_DIR)) {
    mkdirSync(PACKETS_DIR, { recursive: true });
  }
}

export function readExecutionPackets(): HermesPacket[] {
  try {
    if (!existsSync(PACKETS_FILE)) {
      return [];
    }

    const content = readFileSync(PACKETS_FILE, "utf-8");
    const store = JSON.parse(content) as ExecutionPacketStore;
    return store.packets || [];
  } catch (error) {
    console.warn("[ExecutionPacketStore] Error reading packets:", error);
    return [];
  }
}

export function saveExecutionPacket(packet: HermesPacket): void {
  try {
    ensureDataDir();

    const store: ExecutionPacketStore = {
      packets: readExecutionPackets(),
      lastUpdated: new Date().toISOString(),
    };

    // Check if packet already exists (by packet_id) and update or append
    const existingIndex = store.packets.findIndex((p) => p.packet_id === packet.packet_id);
    if (existingIndex >= 0) {
      store.packets[existingIndex] = packet;
    } else {
      store.packets.push(packet);
    }

    // Keep only the most recent packets
    if (store.packets.length > MAX_PACKETS) {
      store.packets = store.packets
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
        .slice(0, MAX_PACKETS);
    }

    store.lastUpdated = new Date().toISOString();
    writeFileSync(PACKETS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("[ExecutionPacketStore] Error saving packet:", error);
  }
}

export function getRecentExecutionPackets(limit: number = 10): HermesPacket[] {
  const packets = readExecutionPackets();
  return packets
    .sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
    .slice(0, limit);
}

export function getExecutionPacketsByTask(taskId: string): HermesPacket[] {
  return readExecutionPackets().filter((p) => p.task_id === taskId);
}

export function getExecutionPacketsByPlan(planId: string): HermesPacket[] {
  return readExecutionPackets().filter((p) => p.plan_id === planId);
}

export function getExecutionPacketCount(): number {
  return readExecutionPackets().length;
}

export function getExecutionPacketStatistics(): Record<string, number> {
  const packets = readExecutionPackets();
  const stats: Record<string, number> = {};
  for (const packet of packets) {
    stats[packet.packet_type] = (stats[packet.packet_type] || 0) + 1;
  }
  return stats;
}
