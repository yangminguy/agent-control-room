import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrateDirection } from "@/lib/orchestration/openai-orchestrator";
import { intelligentRoute, mapToExternalAgent } from "@/lib/routing/intelligent-router";

const RequestSchema = z.object({
  projectName: z.string().min(1),
  projectContext: z.string().default(""),
  direction: z.string().min(1),
  preferredAgentStatus: z
    .enum(["available", "limited", "cooling_down", "blocked", "manual_only"])
    .default("available"),
  useIntelligentRouting: z.boolean().default(false),
});

export async function POST(request: Request) {
  const body = await request.json();
  const input = RequestSchema.parse(body);
  let result = await orchestrateDirection(input);

  // Optional: Use intelligent routing to refine agent recommendation
  if (input.useIntelligentRouting && result.tasks.length > 0) {
    try {
      const primaryTask = result.tasks[0];
      const routing = intelligentRoute(primaryTask.technicalSummary);
      const externalAgent = mapToExternalAgent(routing.primary.agent_id);
      result.recommendedAgent = externalAgent;
      result.agentReason = `Intelligent Routing: ${routing.primary.reason} Internal specialist: ${routing.primary.agent_id}. External handoff: ${externalAgent}.`;
    } catch (error) {
      console.error("Intelligent routing failed, using default recommendation", error);
    }
  }

  return NextResponse.json(result);
}
