#!/usr/bin/env node

/**
 * Agent Recovery Worker
 *
 * Dry-run worker that monitors waiting tasks and proposes recovery actions.
 *
 * Usage:
 * npm run agent:worker -- --dry
 *
 * Does NOT execute dangerous work.
 * Does NOT execute high/critical work without approval.
 * Only proposes recovery and prints recommendations.
 */

import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const isDryRun = process.argv.includes("--dry");

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
  console.log("═══════════════════════════════════════════════════");
  console.log("Agent Recovery Worker — Dry-Run");
  console.log("═══════════════════════════════════════════════════\n");

  const waitingTasks = getWaitingTasks();
  const pendingGates = getPendingReleaseGates();

  console.log(`📊 실행 작업 대기열(Waiting Tasks): ${waitingTasks.length}`);
  console.log(`🔒 승인 대기 중(Pending Release Gates): ${pendingGates.length}\n`);

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

  if (isDryRun) {
    console.log("🏃 DRY RUN: No actions taken. Script completed successfully.");
    console.log(
      "To execute recovery actions, remove --dry flag and re-run.\n"
    );
  }

  process.exit(0);
}

main();
