#!/usr/bin/env node

/**
 * Agent Recovery Worker
 *
 * Dry-run worker that monitors waiting tasks and proposes recovery actions.
 * Phase G: Generates Hermes packets for execution results.
 *
 * Usage:
 * npm run agent:worker -- --dry (dry-run mode, no file writes)
 * npm run agent:worker (actual mode, saves packets to data/hermes-packets.json)
 * npm run agent:worker -- --notify (actual mode + verbose Telegram preview)
 *
 * Does NOT execute dangerous work.
 * Does NOT execute high/critical work without approval.
 * Only proposes recovery and prints recommendations.
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isDryRun = process.argv.includes("--dry");
const isNotify = process.argv.includes("--notify");

// Read runtime decisions and release gate requests
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

function getPendingReleaseGates() {
  // Release Gate is stored in memory in current implementation
  // In production, would read from durable storage
  return [];
}

function main() {
  const mode = isDryRun ? "Dry-Run" : "실제 모드";
  console.log("═══════════════════════════════════════════════════");
  console.log(`Agent Recovery Worker — ${mode}`);
  if (isNotify) console.log("📤 Telegram 알림 미리보기 활성화");
  console.log("═══════════════════════════════════════════════════\n");

  const waitingTasks = getWaitingTasks();
  const pendingGates = getPendingReleaseGates();

  console.log(`📊 실행 작업 대기열(Waiting Tasks): ${waitingTasks.length}`);
  console.log(`🔒 승인 대기 중(Pending Release Gates): ${pendingGates.length}\n`);

  const packets = [];

  if (waitingTasks.length === 0 && pendingGates.length === 0) {
    console.log("✅ 현재 대기 중인 작업이나 승인 요청이 없습니다.");
    console.log("   (정상 상태: 기획 채팅에서 작업을 만들거나 실행을 시작하면 이곳에 표시됩니다.)");
    process.exit(0);
  }

  // Analyze waiting tasks
  if (waitingTasks.length > 0) {
    console.log("📋 Waiting Tasks Analysis:\n");

    const now = new Date();

    for (const task of waitingTasks) {
      console.log(`Task: ${task.id}`);
      console.log(`  Plan: ${task.planId || "unknown"}`);
      console.log(`  Assigned Agent: ${task.agent}`);
      console.log(`  Assigned Model: ${task.model || "none"}`);
      console.log(`  Execution Mode: ${task.executionMode}`);

      if (task.nextRetryAt) {
        const retryTime = new Date(task.nextRetryAt);
        const timeUntilRetry = retryTime.getTime() - now.getTime();

        if (timeUntilRetry <= 0) {
          console.log(`  ✅ Status: READY FOR RETRY`);
          console.log(`  Action: Resume execution of task ${task.taskId}`);
        } else {
          const mins = Math.ceil(timeUntilRetry / 60000);
          console.log(`  ⏳ Status: WAITING (ready in ${mins} minutes)`);
          console.log(`  Retry at: ${retryTime.toLocaleString("ko-KR")}`);
        }
      } else {
        console.log(`  📍 Status: Unknown recovery time`);
        console.log(`  Action: Manual review needed`);
      }

      if (task.fallbackReason) {
        console.log(`  Reason: ${task.fallbackReason}`);
      }

      console.log("");
    }
  }

  // Analyze pending Release Gates
  if (pendingGates.length > 0) {
    console.log("🔐 Pending Release Gates:\n");

    for (const gate of pendingGates) {
      console.log(`Request: ${gate.id}`);
      console.log(`  Task: ${gate.taskId}`);
      console.log(`  Operation: ${gate.operation}`);
      console.log(`  Risk Level: ${gate.riskLevel}`);
      console.log(`  Status: ${gate.status}`);
      console.log(`  Expires: ${new Date(gate.expiresAt).toLocaleString("ko-KR")}`);
      console.log(`  Action: User approval required at /orchestration`);
      console.log("");
    }
  }

  // Summary
  console.log("═══════════════════════════════════════════════════");
  const readyForRetry = waitingTasks.filter((t) => {
    if (!t.nextRetryAt) return false;
    return new Date(t.nextRetryAt).getTime() <= Date.now();
  });

  console.log(
    `\n📈 Summary: ${readyForRetry.length} tasks ready for retry, ${pendingGates.length} awaiting approval\n`
  );

  // Phase G: Generate Hermes packets if tasks are waiting
  if (waitingTasks.length > 0) {
    const packet = generateWaitingTasksPacket(waitingTasks, readyForRetry);
    packets.push(packet);

    if (isNotify || !isDryRun) {
      console.log("📦 Hermes Packet Generated:");
      formatPacketForConsole(packet);
    }

    // Save to local store (not in dry-run)
    if (!isDryRun) {
      saveHermesPacket(packet);
      console.log(`✅ Packet saved to data/hermes-packets.json`);
    }
  }

  if (isDryRun) {
    console.log("🏃 DRY RUN: No file writes. To persist packets, remove --dry flag.\n");
  } else if (!isDryRun && packets.length > 0) {
    console.log("✅ Packets saved to local store. Ready for Hermes supervision.\n");
  }

  process.exit(0);
}

/**
 * Generate a waiting tasks packet (Phase G)
 */
function generateWaitingTasksPacket(waitingTasks, readyForRetry) {
  const now = new Date().toISOString();
  const taskSummary = waitingTasks
    .map(
      (t) =>
        `- ${t.id}: ${t.executionMode} (${t.agent}) — ready: ${readyForRetry.some((r) => r.id === t.id) ? "✅" : "⏳"}`
    )
    .join("\n");

  return {
    id: `packet-${Date.now()}`,
    kind: "re-orchestration",
    title: "대기 작업 현황",
    description: `현재 ${waitingTasks.length}개 작업이 대기 중입니다.`,
    createdAt: now,
    updatedAt: now,
    content: {
      sections: [
        {
          id: `section-1`,
          title: "대기 작업 목록",
          level: 2,
          body: taskSummary || "대기 작업 없음",
          format: "markdown",
        },
        {
          id: `section-2`,
          title: "다음 행동",
          level: 2,
          body: `${readyForRetry.length} task(s) ready for immediate retry.`,
          format: "markdown",
        },
      ],
      metadata: {
        totalWaiting: waitingTasks.length,
        readyForRetry: readyForRetry.length,
        source: "agent-worker",
      },
    },
    executionContext: {
      status: "waiting_for_recovery",
      riskLevel: "medium",
      recommendedNextAction: readyForRetry.length > 0 ? "retry_same_agent" : undefined,
      source: "worker",
    },
  };
}

/**
 * Save Hermes packet to local store
 */
function saveHermesPacket(packet) {
  const packetsFile = join(__dirname, "../data/hermes-packets.json");
  const dataDir = join(__dirname, "../data");

  // Ensure data directory exists
  if (!existsSync(dataDir)) {
    require("fs").mkdirSync(dataDir, { recursive: true });
  }

  let store = { packets: [], lastUpdated: new Date().toISOString() };
  if (existsSync(packetsFile)) {
    try {
      const content = readFileSync(packetsFile, "utf-8");
      store = JSON.parse(content);
    } catch (e) {
      console.warn("Could not parse existing packets file, starting fresh");
    }
  }

  // Add or update packet
  const existingIndex = store.packets.findIndex((p) => p.id === packet.id);
  if (existingIndex >= 0) {
    store.packets[existingIndex] = packet;
  } else {
    store.packets.push(packet);
  }

  store.lastUpdated = new Date().toISOString();
  writeFileSync(packetsFile, JSON.stringify(store, null, 2));
}

/**
 * Format packet for console output
 */
function formatPacketForConsole(packet) {
  console.log(`  Kind: ${packet.kind}`);
  console.log(`  Title: ${packet.title}`);
  if (packet.content.sections.length > 0) {
    console.log(`  Sections: ${packet.content.sections.length}`);
  }
  if (packet.executionContext?.recommendedNextAction) {
    console.log(`  Action: ${packet.executionContext.recommendedNextAction}`);
  }
  console.log();
}

main();
