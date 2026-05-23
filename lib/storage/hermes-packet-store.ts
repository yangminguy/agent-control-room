import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { MonitorPacket } from "@/lib/monitor/types";

const PACKETS_FILE = join(process.cwd(), "data", "hermes-packets.json");

interface PacketStore {
  packets: MonitorPacket[];
  lastUpdated: string;
}

/**
 * Initialize store if it doesn't exist
 */
function ensureStoreExists(): void {
  if (!existsSync(PACKETS_FILE)) {
    const initialStore: PacketStore = {
      packets: [],
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(PACKETS_FILE, JSON.stringify(initialStore, null, 2));
  }
}

/**
 * Read all Hermes packets
 */
export function readHermesPackets(): MonitorPacket[] {
  try {
    ensureStoreExists();
    const content = readFileSync(PACKETS_FILE, "utf-8");
    const store = JSON.parse(content) as PacketStore;
    return store.packets || [];
  } catch (error) {
    console.error("Failed to read Hermes packets:", error);
    return [];
  }
}

/**
 * Save a single Hermes packet
 */
export function saveHermesPacket(packet: MonitorPacket): void {
  try {
    ensureStoreExists();
    const content = readFileSync(PACKETS_FILE, "utf-8");
    const store = JSON.parse(content) as PacketStore;

    // Check if packet with same ID already exists
    const existingIndex = store.packets.findIndex((p) => p.id === packet.id);
    if (existingIndex >= 0) {
      store.packets[existingIndex] = packet;
    } else {
      store.packets.push(packet);
    }

    store.lastUpdated = new Date().toISOString();
    writeFileSync(PACKETS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("Failed to save Hermes packet:", error);
  }
}

/**
 * Save multiple Hermes packets
 */
export function saveHermesPackets(packets: MonitorPacket[]): void {
  try {
    ensureStoreExists();
    const content = readFileSync(PACKETS_FILE, "utf-8");
    const store = JSON.parse(content) as PacketStore;

    for (const packet of packets) {
      const existingIndex = store.packets.findIndex((p) => p.id === packet.id);
      if (existingIndex >= 0) {
        store.packets[existingIndex] = packet;
      } else {
        store.packets.push(packet);
      }
    }

    store.lastUpdated = new Date().toISOString();
    writeFileSync(PACKETS_FILE, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("Failed to save Hermes packets:", error);
  }
}

/**
 * Get recent Hermes packets (most recent first)
 */
export function getRecentHermesPackets(limit: number = 10): MonitorPacket[] {
  const packets = readHermesPackets();
  return packets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

/**
 * Get packets by kind
 */
export function getPacketsByKind(kind: string): MonitorPacket[] {
  const packets = readHermesPackets();
  return packets.filter((p) => p.kind === kind);
}

/**
 * Get packets by dispatch job ID
 */
export function getPacketsByDispatchJob(dispatchJobId: string): MonitorPacket[] {
  const packets = readHermesPackets();
  return packets.filter((p) => p.executionContext?.dispatchJobId === dispatchJobId);
}

/**
 * Clear all packets (for testing/reset)
 */
export function clearHermesPackets(): void {
  try {
    const initialStore: PacketStore = {
      packets: [],
      lastUpdated: new Date().toISOString(),
    };
    writeFileSync(PACKETS_FILE, JSON.stringify(initialStore, null, 2));
  } catch (error) {
    console.error("Failed to clear Hermes packets:", error);
  }
}
