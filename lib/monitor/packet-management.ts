import {
  readHermesPackets,
  saveHermesPacket,
  getPacketCount,
  clearAllPackets,
} from "@/lib/storage/hermes-packet-store";
import type { MonitorPacket } from "./types";

export interface PacketArchive {
  archivedAt: string;
  packetCount: number;
  oldestPacket: string;
  newestPacket: string;
  archivePath: string;
}

export interface PacketSearchResult {
  packet: MonitorPacket;
  matchedFields: string[]; // Fields that matched the search query
  relevanceScore: number; // 0-1, higher = more relevant
}

/**
 * 패킷 검색 - 다중 필드 지원
 */
export function searchPackets(
  query: string,
  options: {
    kind?: string;
    startDate?: Date;
    endDate?: Date;
    taskId?: string;
    riskLevel?: "low" | "medium" | "high";
    limit?: number;
  } = {}
): PacketSearchResult[] {
  const packets = readHermesPackets();
  const lowerQuery = query.toLowerCase();
  const limit = options.limit || 50;

  const results = packets
    .map((packet) => {
      const matchedFields: string[] = [];
      let relevanceScore = 0;

      // Kind filter
      if (options.kind && packet.kind !== options.kind) {
        return null;
      }

      // Date range filter
      if (options.startDate || options.endDate) {
        const packetTime = new Date(packet.createdAt).getTime();
        if (options.startDate && packetTime < options.startDate.getTime()) {
          return null;
        }
        if (options.endDate && packetTime > options.endDate.getTime()) {
          return null;
        }
      }

      // TaskId filter
      const packetTaskId = packet.content.metadata?.taskId as
        | string
        | undefined;
      if (options.taskId && packetTaskId !== options.taskId) {
        return null;
      }

      // Risk level filter
      const packetRisk = packet.content.metadata?.riskLevel as
        | "low"
        | "medium"
        | "high"
        | undefined;
      if (options.riskLevel && packetRisk !== options.riskLevel) {
        return null;
      }

      // Text search
      if (
        packet.title.toLowerCase().includes(lowerQuery)
      ) {
        matchedFields.push("title");
        relevanceScore += 0.5;
      }
      if (
        packet.description.toLowerCase().includes(lowerQuery)
      ) {
        matchedFields.push("description");
        relevanceScore += 0.3;
      }
      for (const section of packet.content.sections) {
        if (
          section.title.toLowerCase().includes(lowerQuery) ||
          section.body.toLowerCase().includes(lowerQuery)
        ) {
          matchedFields.push(`section:${section.id}`);
          relevanceScore += 0.2;
        }
      }

      // If no matches and query provided, exclude packet
      if (query && matchedFields.length === 0) {
        return null;
      }

      // If query is empty, include packet with minimal score
      if (!query && matchedFields.length === 0) {
        relevanceScore = 0.1;
      }

      return { packet, matchedFields, relevanceScore };
    })
    .filter((r) => r !== null) as PacketSearchResult[];

  // Sort by relevance and date (newest first)
  results.sort((a, b) => {
    const scoreDiff = b.relevanceScore - a.relevanceScore;
    if (scoreDiff !== 0) return scoreDiff;

    const dateA = new Date(a.packet.createdAt).getTime();
    const dateB = new Date(b.packet.createdAt).getTime();
    return dateB - dateA;
  });

  return results.slice(0, limit);
}

/**
 * 패킷 아카이빙 (내용 유지)
 */
export function archiveOldPackets(
  daysOld: number = 30
): PacketArchive {
  const packets = readHermesPackets();
  const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

  const oldPackets = packets.filter(
    (p) => new Date(p.createdAt).getTime() < cutoffTime
  );
  const recentPackets = packets.filter(
    (p) => new Date(p.createdAt).getTime() >= cutoffTime
  );

  if (oldPackets.length === 0) {
    return {
      archivedAt: new Date().toISOString(),
      packetCount: 0,
      oldestPacket: "",
      newestPacket: "",
      archivePath: "no-packets-to-archive",
    };
  }

  // 실제 아카이빙은 여기서 구현 가능 (파일 저장, DB 저장 등)
  // 현재는 메모리 기반이므로 패킷 경과 시간만 반환
  const sortedOld = oldPackets.sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    archivedAt: new Date().toISOString(),
    packetCount: oldPackets.length,
    oldestPacket: sortedOld[0]?.createdAt || "",
    newestPacket: sortedOld[sortedOld.length - 1]?.createdAt || "",
    archivePath: `archive/packets-before-${new Date(cutoffTime).toISOString().split("T")[0]}`,
  };
}

/**
 * 패킷 정리 (중복 제거 및 용량 최적화)
 */
export function deduplicatePackets(): {
  removedCount: number;
  remainingCount: number;
} {
  const packets = readHermesPackets();
  const seen = new Set<string>();
  const uniquePackets: MonitorPacket[] = [];

  for (const packet of packets) {
    // ID 기반 중복 제거 (최신 버전만 유지)
    if (!seen.has(packet.id)) {
      seen.add(packet.id);
      uniquePackets.push(packet);
    }
  }

  // 중복이 있으면 다시 저장
  const removedCount = packets.length - uniquePackets.length;
  if (removedCount > 0) {
    // Clear and rewrite (simplified - actual implementation would be more careful)
    clearAllPackets();
    for (const packet of uniquePackets) {
      saveHermesPacket(packet);
    }
  }

  return {
    removedCount,
    remainingCount: uniquePackets.length,
  };
}

/**
 * 패킷 통계
 */
export function getPacketStatistics(): {
  totalPackets: number;
  oldestPacket: MonitorPacket | null;
  newestPacket: MonitorPacket | null;
  averagePacketsPerHour: number;
  storageEstimateMB: number;
} {
  const packets = readHermesPackets();

  if (packets.length === 0) {
    return {
      totalPackets: 0,
      oldestPacket: null,
      newestPacket: null,
      averagePacketsPerHour: 0,
      storageEstimateMB: 0,
    };
  }

  const sorted = [...packets].sort(
    (a, b) =>
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  const oldestPacket = sorted[0];
  const newestPacket = sorted[sorted.length - 1];

  // Calculate average packets per hour
  const timeRangeMs =
    new Date(newestPacket.createdAt).getTime() -
    new Date(oldestPacket.createdAt).getTime();
  const hours = timeRangeMs / (1000 * 60 * 60);
  const averagePacketsPerHour = hours > 0 ? packets.length / hours : 0;

  // Estimate storage (rough: ~2KB per packet)
  const storageEstimateMB = (packets.length * 2) / 1024;

  return {
    totalPackets: packets.length,
    oldestPacket,
    newestPacket,
    averagePacketsPerHour: Math.round(averagePacketsPerHour * 100) / 100,
    storageEstimateMB: Math.round(storageEstimateMB * 100) / 100,
  };
}

/**
 * 특정 기간의 패킷만 유지 (cleanup)
 */
export function retainPacketsForDays(daysToKeep: number): {
  removedCount: number;
  remainingCount: number;
} {
  const packets = readHermesPackets();
  const cutoffTime = Date.now() - daysToKeep * 24 * 60 * 60 * 1000;

  const retainedPackets = packets.filter(
    (p) => new Date(p.createdAt).getTime() >= cutoffTime
  );

  const removedCount = packets.length - retainedPackets.length;

  if (removedCount > 0) {
    clearAllPackets();
    for (const packet of retainedPackets) {
      saveHermesPacket(packet);
    }
  }

  return {
    removedCount,
    remainingCount: retainedPackets.length,
  };
}

/**
 * 패킷 내용 분석 및 인사이트 추출
 */
export function extractInsightsFromPackets(): {
  successRate: number;
  failureRate: number;
  commonFailurePatterns: string[];
  mostActiveHour: string;
  packetVolumeByKind: Record<string, number>;
} {
  const packets = readHermesPackets();

  // Success/Failure 분석
  const successCount = packets.filter((p) => p.kind === "phase-completion")
    .length;
  const failureCount = packets.filter((p) => p.kind === "failure").length;
  const total = packets.length;

  // 실패 패턴 분석
  const failurePatterns: Record<string, number> = {};
  packets
    .filter((p) => p.kind === "failure")
    .forEach((p) => {
      const pattern = p.description.split("\n")[0].substring(0, 50);
      failurePatterns[pattern] = (failurePatterns[pattern] || 0) + 1;
    });

  const commonPatterns = Object.entries(failurePatterns)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([pattern]) => pattern);

  // 시간대별 분석
  const hourCounts: Record<string, number> = {};
  packets.forEach((p) => {
    const hour = new Date(p.createdAt).toISOString().slice(0, 13);
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });

  const mostActiveHour = Object.entries(hourCounts).sort(
    ([, a], [, b]) => b - a
  )[0]?.[0] || "N/A";

  // 패킷 종류별 통계
  const packetVolumeByKind: Record<string, number> = {};
  packets.forEach((p) => {
    packetVolumeByKind[p.kind] = (packetVolumeByKind[p.kind] || 0) + 1;
  });

  return {
    successRate: total > 0 ? (successCount / total) * 100 : 0,
    failureRate: total > 0 ? (failureCount / total) * 100 : 0,
    commonFailurePatterns: commonPatterns,
    mostActiveHour,
    packetVolumeByKind,
  };
}
