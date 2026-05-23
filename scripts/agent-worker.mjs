#!/usr/bin/env node

/**
 * Agent Recovery & Monitoring Worker
 * Phase G++ Worker Integration
 *
 * Monitors:
 * - Waiting tasks (recovery actions)
 * - Completed/failed tasks
 * - Hermes execution packets
 * - Release gate approvals
 *
 * Usage:
 * npm run agent:worker -- --dry          (preview without file writes)
 * npm run agent:worker                   (actual: monitor & save packets)
 * npm run agent:worker -- --notify       (with Telegram preview)
 * npm run agent:worker -- --watch        (continuous monitoring mode)
 *
 * Safety Rules:
 * - Does NOT execute dangerous work
 * - Does NOT execute high/critical work without approval
 * - Only proposes recovery and prints recommendations
 * - In --dry mode: no persistent state changes
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isDryRun = process.argv.includes("--dry");
const isNotify = process.argv.includes("--notify");
const isWatch = process.argv.includes("--watch");

// ────────────────────────────────────────────────────────────────────────────

function readJsonFile(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

function getWaitingTasks() {
  const decisions = readJsonFile(join(__dirname, "../data/runtime-decisions.json"));
  if (!decisions) return [];

  return decisions.decisions
    .filter(
      (d) =>
        d.executionStatus === "pending" ||
        !d.executionStatus ||
        d.decision.executionMode === "waiting_for_recovery"
    )
    .map((d) => ({
      id: d.id,
      taskId: d.taskId,
      planId: d.planId,
      agent: d.decision.recommendedAgentId,
      model: d.decision.recommendedModelId,
      executionMode: d.decision.executionMode,
      nextRetryAt: d.nextRetryAt,
      fallbackReason: d.fallbackReason,
    }));
}

// Phase G++: Get recent Hermes packets
function getRecentHermesPackets(limit = 5) {
  const packets = readJsonFile(join(__dirname, "../data/hermes-packets.json"));
  if (!packets || !packets.packets) return [];

  return packets.packets
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
}

// Phase G++: Count packets by kind
function countPacketsByKind(packets) {
  const counts = {};
  for (const packet of packets) {
    counts[packet.kind] = (counts[packet.kind] || 0) + 1;
  }
  return counts;
}

// Phase G++: Format packet summary
function formatPacketSummary(packet) {
  const kindEmoji = {
    "phase-completion": "✅",
    failure: "❌",
    "drift-detection": "⚠️",
    "approval-request": "🔒",
    "re-orchestration": "🔄",
  };

  const emoji = kindEmoji[packet.kind] || "📌";
  const ctx = packet.executionContext || {};

  return `${emoji} ${packet.title} [${ctx.status || "unknown"}]`;
}

function getPendingReleaseGates() {
  // Release Gate is stored in memory in current implementation
  return [];
}

// ────────────────────────────────────────────────────────────────────────────
// Phase G++: Simple recovery recommendation
// ────────────────────────────────────────────────────────────────────────────

function getRecoveryRecommendations() {
  const decisions = readJsonFile(join(__dirname, "../data/runtime-decisions.json"));
  if (!decisions) return [];

  const failedDecisions = decisions.decisions.filter(
    (d) => d.executionStatus === "failed"
  );

  return failedDecisions.slice(0, 3).map((d) => ({
    taskId: d.taskId,
    reason: d.fallbackReason || "Unknown failure",
    recommendedAgent: d.decision.recommendedAgentId,
  }));
}

// ────────────────────────────────────────────────────────────────────────────
// Main Worker Loop
// ────────────────────────────────────────────────────────────────────────────

function main() {
  const mode = isDryRun ? "Dry-Run" : "실제 모드";
  console.log("═══════════════════════════════════════════════════");
  console.log(`Agent Recovery & Monitoring Worker — ${mode}`);
  if (isNotify) console.log("📤 Telegram 알림 미리보기 활성화");
  if (isWatch) console.log("👀 연속 모니터링 모드 활성화");
  console.log("═══════════════════════════════════════════════════\n");

  const waitingTasks = getWaitingTasks();
  const pendingGates = getPendingReleaseGates();
  const hermesPackets = getRecentHermesPackets(10);

  // ── Part 1: Waiting Tasks & Recovery ──────────────────────────────────────
  console.log("📊 [Waiting Tasks & Recovery]\n");
  console.log(`   대기 중인 작업: ${waitingTasks.length}`);
  console.log(`   승인 대기: ${pendingGates.length}`);
  console.log(`   최근 복구 준비: ${waitingTasks.filter((t) => t.nextRetryAt && new Date(t.nextRetryAt).getTime() <= Date.now()).length}\n`);

  if (waitingTasks.length === 0 && pendingGates.length === 0) {
    console.log("✅ 현재 대기 중인 작업이나 승인 요청이 없습니다.");
    console.log("   (정상 상태: 기획 채팅에서 작업을 만들거나 실행을 시작하면 이곳에 표시됩니다.)\n");
  } else {
    // Analyze waiting tasks
    if (waitingTasks.length > 0) {
      console.log("📋 Waiting Tasks:\n");

      const now = new Date();
      const readyForRetry = [];
      const stillWaiting = [];

      for (const task of waitingTasks) {
        if (task.nextRetryAt) {
          const retryTime = new Date(task.nextRetryAt);
          if (retryTime.getTime() <= now.getTime()) {
            readyForRetry.push(task);
          } else {
            stillWaiting.push(task);
          }
        }
      }

      if (readyForRetry.length > 0) {
        console.log(`   ✅ 복구 준비 완료 (${readyForRetry.length}개):\n`);
        readyForRetry.forEach((t) => {
          console.log(`      • ${t.id}: ${t.agent} → 재시도 준비됨`);
        });
        console.log("");
      }

      if (stillWaiting.length > 0) {
        console.log(`   ⏳ 아직 대기 중 (${stillWaiting.length}개):\n`);
        stillWaiting.forEach((t) => {
          const mins = Math.ceil((new Date(t.nextRetryAt).getTime() - now.getTime()) / 60000);
          console.log(`      • ${t.id}: ${t.agent} → ${mins}분 후 준비`);
        });
        console.log("");
      }
    }

    // Analyze pending Release Gates
    if (pendingGates.length > 0) {
      console.log("🔐 Pending Release Gates:\n");
      pendingGates.forEach((gate) => {
        console.log(`   • ${gate.taskId}: 승인 대기`);
      });
      console.log("");
    }
  }

  // ── Part 2: Hermes Execution Packets (Phase G++) ──────────────────────────
  console.log("📦 [Hermes Execution Packets]\n");
  console.log(`   총 패킷: ${hermesPackets.length}\n`);

  if (hermesPackets.length === 0) {
    console.log("   아직 실행 패킷이 없습니다. 작업이 완료되면 여기에 표시됩니다.\n");
  } else {
    const kindCounts = countPacketsByKind(hermesPackets);
    console.log("   패킷 종류별 통계:\n");
    Object.entries(kindCounts).forEach(([kind, count]) => {
      const emoji = {
        "phase-completion": "✅",
        failure: "❌",
        "drift-detection": "⚠️",
        "approval-request": "🔒",
        "re-orchestration": "🔄",
      }[kind] || "📌";
      console.log(`      ${emoji} ${kind}: ${count}개`);
    });

    console.log("\n   최근 5개 패킷:\n");
    hermesPackets.slice(0, 5).forEach((packet) => {
      console.log(`      ${formatPacketSummary(packet)}`);
    });
    console.log("");
  }

  // ── Part 3: Summary & Recommendations ────────────────────────────────────
  console.log("═══════════════════════════════════════════════════");
  const readyCount = waitingTasks.filter((t) => t.nextRetryAt && new Date(t.nextRetryAt).getTime() <= Date.now()).length;
  console.log(`\n📈 Summary: ${readyCount} 준비됨, ${waitingTasks.length} 대기 중, ${hermesPackets.length} 패킷\n`);

  if (isDryRun) {
    console.log("🏃 DRY RUN: 파일 변경 없음. 확인 완료.\n");
  } else {
    console.log("✅ 실제 모드: 패킷 모니터링 및 저장 활성화.\n");

    // Phase G++: Generate and save monitoring packet if there are changes
    if (hermesPackets.length > 0 || waitingTasks.length > 0) {
      const monitoringPacket = generateMonitoringPacket(waitingTasks, hermesPackets);
      saveMonitoringPacket(monitoringPacket);
    }
  }

  // ── Part 4: Recovery Recommendations ───────────────────────────────────
  console.log("🔧 [Auto Recovery Recommendations]\n");
  const recoveryRecs = getRecoveryRecommendations();
  if (recoveryRecs.length === 0) {
    console.log("   ✅ 복구 필요 항목 없음\n");
  } else {
    console.log(`   🤖 자동 복구 가능 (${recoveryRecs.length}개):\n`);
    recoveryRecs.forEach((rec) => {
      console.log(`      • ${rec.taskId}: ${rec.reason}`);
      console.log(`        → ${rec.recommendedAgent} 에이전트로 재시도 가능`);
    });
    console.log("");
  }

  // ── Part 5: Notify (if --notify flag) ──────────────────────────────────
  if (isNotify && hermesPackets.length > 0) {
    console.log("📤 Telegram 알림 미리보기:\n");
    const recentPackets = hermesPackets.slice(0, 3);
    for (const packet of recentPackets) {
      const emoji = {
        "phase-completion": "✅",
        failure: "❌",
        "drift-detection": "⚠️",
        "approval-request": "🔒",
        "re-orchestration": "🔄",
      }[packet.kind] || "📌";
      console.log(`${emoji} ${packet.title}`);
      console.log(`   → ${packet.description}`);
    }
    console.log("");
  }

  // Watch mode: continuous monitoring
  if (isWatch) {
    console.log("👀 연속 모니터링 시작... (10초 간격)\n");
    setInterval(main, 10000);
  }

  process.exit(0);
}

// Phase G++: Generate monitoring packet
function generateMonitoringPacket(waitingTasks, hermesPackets) {
  const now = new Date().toISOString();
  const readyCount = waitingTasks.filter(
    (t) => t.nextRetryAt && new Date(t.nextRetryAt).getTime() <= Date.now()
  ).length;

  return {
    id: `packet-monitoring-${Date.now()}`,
    kind: "re-orchestration",
    title: "Worker 모니터링 현황",
    description: `${readyCount} 작업 준비됨, ${hermesPackets.length} 패킷 기록`,
    createdAt: now,
    updatedAt: now,
    content: {
      sections: [
        {
          id: "section-1",
          title: "대기 작업 상태",
          level: 2,
          body: `총 ${waitingTasks.length}개 대기 중\n복구 준비: ${readyCount}개`,
          format: "markdown",
        },
        {
          id: "section-2",
          title: "Hermes 패킷",
          level: 2,
          body: `총 ${hermesPackets.length}개 기록됨\n가장 최근: ${hermesPackets[0]?.title || "없음"}`,
          format: "markdown",
        },
      ],
      metadata: {
        waitingTasks: waitingTasks.length,
        readyForRetry: readyCount,
        hermesPackets: hermesPackets.length,
        source: "worker-monitoring",
      },
    },
    executionContext: {
      status: "monitoring",
      riskLevel: "low",
      source: "worker",
    },
  };
}

// Phase G++: Save monitoring packet
function saveMonitoringPacket(packet) {
  try {
    const packetsFile = join(__dirname, "../data/hermes-packets.json");
    const dataDir = join(__dirname, "../data");

    if (!existsSync(dataDir)) {
      mkdirSync(dataDir, { recursive: true });
    }

    let store = { packets: [], lastUpdated: new Date().toISOString() };
    if (existsSync(packetsFile)) {
      try {
        const content = readFileSync(packetsFile, "utf-8");
        store = JSON.parse(content);
      } catch (e) {
        console.warn("기존 패킷 파일을 파싱할 수 없음, 새로 시작");
      }
    }

    // Add or update packet (limit to 100 recent packets)
    const existingIndex = store.packets.findIndex((p) => p.id === packet.id);
    if (existingIndex >= 0) {
      store.packets[existingIndex] = packet;
    } else {
      store.packets.push(packet);
    }

    // Keep only last 100 packets
    if (store.packets.length > 100) {
      store.packets = store.packets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 100);
    }

    store.lastUpdated = new Date().toISOString();
    writeFileSync(packetsFile, JSON.stringify(store, null, 2));
  } catch (error) {
    console.error("패킷 저장 오류:", error.message);
  }
}

// ────────────────────────────────────────────────────────────────────────────

main();
