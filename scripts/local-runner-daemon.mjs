#!/usr/bin/env node
import { spawn } from "node:child_process";
import os from "node:os";

const controlRoomUrl = process.env.CONTROL_ROOM_URL ?? "http://localhost:3000";
const runnerId = process.env.LOCAL_RUNNER_ID ?? `${os.hostname()}-${process.pid}`;
const agents = process.env.LOCAL_RUNNER_AGENTS ?? "claude-code,codex";
const intervalMs = Number(process.env.LOCAL_RUNNER_INTERVAL_MS ?? "5000");

function resultId() {
  return `local-result-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function commandForJob(job) {
  if (job.agentId === "claude-code") return { command: "claude", args: ["-p", job.prompt ?? ""] };
  if (job.agentId === "codex") return { command: "codex", args: ["-p", job.prompt ?? ""] };
  if (job.agentId === "antigravity") {
    return {
      command: "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide",
      args: ["chat", "--mode", "agent", job.prompt ?? ""],
    };
  }
  throw new Error(`Unsupported agent: ${job.agentId}`);
}

function classifyOutput(rawOutput, exitCode) {
  const normalized = rawOutput.toLowerCase();
  if (normalized.includes("safety violation") || normalized.includes("forbidden file")) return "safety_violation";
  if (normalized.includes("minor fix") || normalized.includes("follow-up fix")) return "minor_fix";
  if (normalized.includes("qa needed") || normalized.includes("needs review")) return "qa_needed";
  if (normalized.includes("blocked") || normalized.includes("failed") || normalized.includes("error")) return "blocked";
  return exitCode === 0 ? "pass" : "blocked";
}

async function claimJobs() {
  const response = await fetch(`${controlRoomUrl}/api/local-runner/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      runnerId,
      agents: agents.split(",").map((agent) => agent.trim()).filter(Boolean),
      limit: 1,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to claim jobs");
  }
  return data.jobs ?? [];
}

function runJob(job) {
  const { command, args } = commandForJob(job);
  const stdout = [];
  const stderr = [];

  console.log(`[local-runner] running ${job.id} with ${job.agentId}`);

  return new Promise((resolve) => {
    const child = spawn(command, args, { cwd: process.cwd(), shell: false });

    child.stdout?.on("data", (chunk) => {
      const text = chunk.toString();
      stdout.push(text);
      process.stdout.write(text);
    });

    child.stderr?.on("data", (chunk) => {
      const text = chunk.toString();
      stderr.push(text);
      process.stderr.write(text);
    });

    child.on("error", (error) => {
      const rawOutput = `Local runner spawn error: ${error.message}`;
      resolve({
        id: resultId(),
        dispatchJobId: job.id,
        taskId: job.taskId,
        agentId: job.agentId,
        rawOutput,
        resultStatus: "blocked",
        changedFiles: [],
        extractedSummary: rawOutput,
        timestamp: new Date().toISOString(),
      });
    });

    child.on("close", (code) => {
      const rawOutput = [...stdout, ...stderr].join("");
      resolve({
        id: resultId(),
        dispatchJobId: job.id,
        taskId: job.taskId,
        agentId: job.agentId,
        rawOutput,
        resultStatus: classifyOutput(rawOutput, code),
        changedFiles: [],
        extractedSummary: rawOutput.slice(0, 800),
        timestamp: new Date().toISOString(),
      });
    });
  });
}

async function submitResult(result) {
  const response = await fetch(`${controlRoomUrl}/api/local-runner/results`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ runnerId, result }),
  });
  const data = await response.json();
  if (!response.ok || !data.success) {
    throw new Error(data.error ?? "Failed to submit result");
  }
}

async function tick() {
  const jobs = await claimJobs();
  if (jobs.length === 0) {
    console.log("[local-runner] no jobs");
    return;
  }

  for (const job of jobs) {
    const result = await runJob(job);
    await submitResult(result);
    console.log(`[local-runner] submitted ${result.id} (${result.resultStatus})`);
  }
}

console.log(`[local-runner] connected to ${controlRoomUrl} as ${runnerId}`);
console.log(`[local-runner] agents: ${agents}`);

await tick();
setInterval(() => {
  tick().catch((error) => {
    console.error(`[local-runner] ${error.message}`);
  });
}, intervalMs);
