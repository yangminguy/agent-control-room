import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStatusChangeHandoff } from "@/lib/orchestration/handoff-generator";
import { getAgentStatuses, updateAgentStatus } from "@/lib/storage/agent-status-store";
import type { AgentType, Handoff } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const HANDOFFS_FILE = "handoffs.json";

const AgentStatusUpdateSchema = z.object({
  agent: z.enum(["claude-code", "codex", "antigravity"]),
  status: z.enum(["available", "limited", "cooling_down", "blocked", "manual_only"]),
  reason: z.string().optional(),
  nextAvailableAt: z.string().optional(),
});

function getFallbackAgent(agent: AgentType): AgentType {
  if (agent === "claude-code") {
    return "codex";
  }

  return "claude-code";
}

async function readHandoffs(): Promise<Handoff[]> {
  const file = await fs.readFile(path.join(DATA_DIR, HANDOFFS_FILE), "utf8");
  return JSON.parse(file) as Handoff[];
}

async function writeHandoffs(handoffs: Handoff[]): Promise<void> {
  await fs.writeFile(
    path.join(DATA_DIR, HANDOFFS_FILE),
    `${JSON.stringify(handoffs, null, 2)}\n`,
    "utf8",
  );
}

export async function GET() {
  const statuses = await getAgentStatuses();
  return NextResponse.json({ statuses });
}

export async function POST(request: Request) {
  const body = AgentStatusUpdateSchema.parse(await request.json());
  const updated = await updateAgentStatus(body.agent, {
    status: body.status,
    reason: body.reason,
    nextAvailableAt:
      body.status === "cooling_down" ? body.nextAvailableAt : undefined,
  });

  if (body.status !== "cooling_down" && body.status !== "blocked") {
    return NextResponse.json({ updated });
  }

  const toAgent = getFallbackAgent(body.agent);
  const handoffReason = body.reason
    ? `${body.status}: ${body.reason}`
    : body.status;
  const handoff: Handoff = {
    ...generateStatusChangeHandoff({
      fromAgent: body.agent,
      toAgent,
      reason: handoffReason,
    }),
    id: `handoff-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const handoffs = await readHandoffs();
  await writeHandoffs([handoff, ...handoffs]);

  return NextResponse.json({ updated, handoff });
}
