import { readHermesPackets } from "@/lib/storage/hermes-packet-store";
import { findDuplicateInsight, saveInsight } from "./hermes-insight-store";
import type { HermesInsight } from "./hermes-insight-types";

function generateId(): string {
  return `insight-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function generateInsights(options: { dryRun?: boolean; maxNew?: number } = {}): { created: number; updated: number; insights: HermesInsight[] } {
  const { dryRun = false, maxNew = 10 } = options;
  const packets = readHermesPackets();
  const candidates: HermesInsight[] = [];
  let created = 0;
  let updated = 0;

  // 실패 패턴 감지
  const failurePackets = packets.filter((p) => p.kind === "failure");
  if (failurePackets.length >= 3) {
    const insight: HermesInsight = {
      id: generateId(),
      title: `${failurePackets.length}회 반복 실패 감지`,
      summary: `동일한 실패가 ${failurePackets.length}회 발생했습니다.`,
      category: "failure-pattern",
      severity: failurePackets.length >= 5 ? "high" : "medium",
      confidence: "high",
      sourcePacketIds: failurePackets.slice(0, 5).map((p) => p.id),
      evidence: failurePackets.slice(0, 3).map((p) => `• ${p.title}`),
      recommendation: "원인을 파악하고 자동 재시도 정책을 검토하세요.",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      occurrenceCount: failurePackets.length,
      tags: ["failure", "pattern"],
    };
    candidates.push(insight);
  }

  // 승인 요청 반복
  const approvalPackets = packets.filter((p) => p.kind === "approval-request");
  if (approvalPackets.length >= 2) {
    const insight: HermesInsight = {
      id: generateId(),
      title: "자동화 범위 재검토 필요",
      summary: `승인이 필요한 작업이 ${approvalPackets.length}회 발생했습니다.`,
      category: "approval-policy",
      severity: "medium",
      confidence: "medium",
      sourcePacketIds: approvalPackets.slice(0, 5).map((p) => p.id),
      evidence: approvalPackets.slice(0, 3).map((p) => `• ${p.title}`),
      recommendation: "자동 실행 기준을 검토하세요.",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      occurrenceCount: approvalPackets.length,
      tags: ["approval", "policy"],
    };
    candidates.push(insight);
  }

  // 성공 패턴
  const successPackets = packets.filter((p) => p.kind === "phase-completion");
  if (successPackets.length >= 5) {
    const insight: HermesInsight = {
      id: generateId(),
      title: "효율적인 워크플로우 패턴",
      summary: `${successPackets.length}건의 성공적 완료가 관찰되었습니다.`,
      category: "workflow-lesson",
      severity: "low",
      confidence: "high",
      sourcePacketIds: successPackets.slice(0, 5).map((p) => p.id),
      evidence: [`• 총 ${successPackets.length}건의 성공 기록`],
      recommendation: "현재 프로세스를 계속 유지하세요.",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      occurrenceCount: successPackets.length,
      tags: ["success", "workflow"],
    };
    candidates.push(insight);
  }

  for (const insight of candidates.slice(0, maxNew)) {
    const dup = findDuplicateInsight(insight.title, insight.category);
    if (dup) {
      updated++;
    } else {
      if (!dryRun) {
        saveInsight(insight);
      }
      created++;
    }
  }

  return { created, updated, insights: candidates };
}
