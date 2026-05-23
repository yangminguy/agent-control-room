import {
  readHermesPackets,
  getPacketStatistics,
} from "@/lib/storage/hermes-packet-store";
import type { MonitorPacket } from "./types";

export interface PacketAnalytics {
  totalPackets: number;
  packetsByKind: Record<string, number>;
  recentPackets: MonitorPacket[];
  successRate: number; // 0-100: successful completions vs failures
  failurePatterns: FailurePattern[];
  averageTaskCompletionTime: number; // minutes
  riskDistribution: {
    low: number;
    medium: number;
    high: number;
  };
}

export interface FailurePattern {
  kind: string;
  count: number;
  percentage: number;
  recentExamples: Array<{
    taskId?: string;
    title: string;
    description: string;
    createdAt: string;
  }>;
}

export interface ExecutionMetrics {
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  driftDetections: number;
  approvalRequests: number;
  reOrchestrations: number;
}

export interface TimelineAnalysis {
  timestamp: string;
  packetsGenerated: number;
  topKinds: Array<{
    kind: string;
    count: number;
  }>;
}

/**
 * 전체 Hermes 패킷 분석 수행
 */
export function analyzePackets(): PacketAnalytics {
  const packets = readHermesPackets();
  const stats = getPacketStatistics();

  // Success rate 계산: phase-completion / (failure + phase-completion)
  const successPackets = stats["phase-completion"] || 0;
  const failurePackets = stats.failure || 0;
  const totalExecutions = successPackets + failurePackets;
  const successRate =
    totalExecutions > 0 ? (successPackets / totalExecutions) * 100 : 0;

  // Failure 패턴 분석
  const failurePatterns = analyzeFailurePatterns(packets, stats);

  // Risk 분포 계산
  const riskDistribution = analyzeRiskDistribution(packets);

  // 평균 완료 시간 (근사값: 첫 3개 패킷의 시간 기반)
  const avgTime = estimateAverageCompletionTime(packets);

  return {
    totalPackets: packets.length,
    packetsByKind: stats,
    recentPackets: packets.slice(0, 5),
    successRate: Math.round(successRate * 100) / 100,
    failurePatterns,
    averageTaskCompletionTime: avgTime,
    riskDistribution,
  };
}

/**
 * 실행 관련 메트릭 계산
 */
export function getExecutionMetrics(): ExecutionMetrics {
  const packets = readHermesPackets();
  const stats = getPacketStatistics();

  return {
    totalExecutions:
      (stats["phase-completion"] || 0) + (stats.failure || 0),
    successfulExecutions: stats["phase-completion"] || 0,
    failedExecutions: stats.failure || 0,
    driftDetections: stats["drift-detection"] || 0,
    approvalRequests: stats["approval-request"] || 0,
    reOrchestrations: stats["re-orchestration"] || 0,
  };
}

/**
 * Failure 패턴 분석
 */
function analyzeFailurePatterns(
  packets: MonitorPacket[],
  stats: Record<string, number>
): FailurePattern[] {
  const failureKinds = ["failure", "drift-detection"];
  const patterns: FailurePattern[] = [];

  for (const kind of failureKinds) {
    const count = stats[kind] || 0;
    if (count === 0) continue;

    const failurePackets = packets
      .filter((p) => p.kind === kind)
      .slice(0, 5);

    patterns.push({
      kind,
      count,
      percentage: count > 0 ? (count / packets.length) * 100 : 0,
      recentExamples: failurePackets.map((p) => ({
        taskId: p.content.metadata?.taskId as string | undefined,
        title: p.title,
        description: p.description,
        createdAt: p.createdAt,
      })),
    });
  }

  // 빈도순 정렬
  patterns.sort((a, b) => b.count - a.count);
  return patterns;
}

/**
 * Risk 분포 분석
 */
function analyzeRiskDistribution(packets: MonitorPacket[]): {
  low: number;
  medium: number;
  high: number;
} {
  const distribution = {
    low: 0,
    medium: 0,
    high: 0,
  };

  for (const packet of packets) {
    const riskLevel = packet.content.metadata?.riskLevel as
      | "low"
      | "medium"
      | "high"
      | undefined;
    if (riskLevel && riskLevel in distribution) {
      distribution[riskLevel]++;
    }
  }

  return distribution;
}

/**
 * 평균 완료 시간 추정 (근사값)
 */
function estimateAverageCompletionTime(packets: MonitorPacket[]): number {
  if (packets.length < 2) return 0;

  // 최근 3개 패킷의 시간 차이를 기반으로 추정
  const recent = packets.slice(0, Math.min(3, packets.length));
  if (recent.length < 2) return 0;

  let totalMinutes = 0;
  for (let i = 0; i < recent.length - 1; i++) {
    const time1 = new Date(recent[i].createdAt).getTime();
    const time2 = new Date(recent[i + 1].createdAt).getTime();
    const minutes = Math.abs(time1 - time2) / (1000 * 60);
    totalMinutes += minutes;
  }

  return Math.round(totalMinutes / (recent.length - 1));
}

/**
 * 시간대별 패킷 분석
 */
export function analyzeTimeline(
  hoursBack: number = 24
): TimelineAnalysis[] {
  const packets = readHermesPackets();
  const now = Date.now();
  const timelineMap: Record<string, Record<string, number>> = {};

  for (const packet of packets) {
    const packetTime = new Date(packet.createdAt).getTime();
    const minutesAgo = (now - packetTime) / (1000 * 60);

    // 현재부터 hoursBack시간 이내의 패킷만 포함
    if (minutesAgo <= hoursBack * 60) {
      // 1시간 단위로 그룹화
      const hour = new Date(packet.createdAt).toISOString().slice(0, 13);
      if (!timelineMap[hour]) {
        timelineMap[hour] = {};
      }
      timelineMap[hour][packet.kind] =
        (timelineMap[hour][packet.kind] || 0) + 1;
    }
  }

  // 시간순으로 정렬하여 반환
  return Object.entries(timelineMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .reverse()
    .slice(0, hoursBack)
    .map(([timestamp, kindMap]) => {
      const totalPackets = Object.values(kindMap).reduce((a, b) => a + b, 0);
      const topKinds = Object.entries(kindMap)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([kind, count]) => ({ kind, count }));

      return {
        timestamp: timestamp + ":00",
        packetsGenerated: totalPackets,
        topKinds,
      };
    });
}

/**
 * 분석 요약 문자열 생성
 */
export function summarizeAnalytics(analytics: PacketAnalytics): string {
  const successEmoji = analytics.successRate >= 80 ? "✅" : "⚠️";
  const summary = `
*[Hermes Analytics Summary]*

${successEmoji} Success Rate: ${analytics.successRate}%
📊 Total Packets: ${analytics.totalPackets}
⏱️ Avg Completion Time: ${analytics.averageTaskCompletionTime}min

*Packet Distribution:*
${Object.entries(analytics.packetsByKind)
  .map(([kind, count]) => `• ${kind}: ${count}`)
  .join("\n")}

*Risk Distribution:*
🟢 Low: ${analytics.riskDistribution.low}
🟡 Medium: ${analytics.riskDistribution.medium}
🔴 High: ${analytics.riskDistribution.high}
  `.trim();

  return summary;
}
