import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { z } from "zod";
import { generateStatusChangeHandoff } from "@/lib/orchestration/handoff-generator";
import { getAgentStatuses, updateAgentStatus } from "@/lib/storage/agent-status-store";
import type { AgentStatus, AgentStatusValue, AgentType, Handoff } from "@/lib/types";

const DATA_DIR = path.join(process.cwd(), "data");
const HANDOFFS_FILE = "handoffs.json";

const AgentStatusUpdateSchema = z.object({
  agent: z.enum(["claude-code", "codex", "antigravity"]),
  status: z.enum(["available", "limited", "cooling_down", "blocked", "manual_only"]),
  reason: z.string().optional(),
  nextAvailableAt: z.string().optional(),
});

const AGENT_FALLBACK_ORDER: Record<AgentType, AgentType[]> = {
  "claude-code": ["codex", "antigravity"],
  codex: ["claude-code", "antigravity"],
  antigravity: ["codex", "claude-code"],
};

const HANDOFF_STATUSES = new Set<AgentStatusValue>([
  "limited",
  "cooling_down",
  "blocked",
  "manual_only",
]);

function isAvailableForRecommendation(status: AgentStatusValue): boolean {
  return status === "available" || status === "manual_only";
}

function getRecommendedFallbackAgent(
  fromAgent: AgentType,
  statuses: AgentStatus[],
): AgentType | null {
  for (const candidate of AGENT_FALLBACK_ORDER[fromAgent]) {
    const currentStatus = statuses.find((status) => status.agent === candidate);

    if (!currentStatus || isAvailableForRecommendation(currentStatus.status)) {
      return candidate;
    }
  }

  return null;
}

function getRecommendationReason(
  fromAgent: AgentType,
  toAgent: AgentType | null,
  status: AgentStatusValue,
): string {
  if (!toAgent) {
    return `${fromAgent} 상태가 ${status}로 변경되었지만 즉시 이어받을 수 있는 에이전트가 없습니다.`;
  }

  return `${fromAgent} 상태가 ${status}로 변경되어 ${toAgent}가 다음 작업을 이어받는 것을 추천합니다.`;
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
      body.status === "cooling_down" || body.status === "blocked"
        ? body.nextAvailableAt
        : undefined,
  });

  if (!HANDOFF_STATUSES.has(body.status)) {
    return NextResponse.json({ updated });
  }

  const statuses = await getAgentStatuses();
  const recommendedAgent = getRecommendedFallbackAgent(body.agent, statuses);
  const recommendationReason = getRecommendationReason(
    body.agent,
    recommendedAgent,
    body.status,
  );

  if (!recommendedAgent) {
    return NextResponse.json({ updated, recommendedAgent, recommendationReason });
  }

  const handoffReason = body.reason
    ? `${body.status}: ${body.reason}`
    : body.status;
  const handoff: Handoff = {
    ...generateStatusChangeHandoff({
      fromAgent: body.agent,
      toAgent: recommendedAgent,
      reason: handoffReason,
    }),
    id: `handoff-${Date.now()}`,
    createdAt: new Date().toISOString(),
  };

  const handoffs = await readHandoffs();
  await writeHandoffs([handoff, ...handoffs]);

  return NextResponse.json({
    updated,
    recommendedAgent,
    recommendationReason,
    handoff,
  });
}
