import { NextResponse } from "next/server";
import { z } from "zod";
import { orchestrateDirection } from "@/lib/orchestration/openai-orchestrator";

const RequestSchema = z.object({
  projectName: z.string().min(1),
  projectContext: z.string().default(""),
  direction: z.string().min(1),
  preferredAgentStatus: z
    .enum(["available", "limited", "cooling_down", "blocked", "manual_only"])
    .default("available"),
});

export async function POST(request: Request) {
  const body = await request.json();
  const input = RequestSchema.parse(body);
  const result = await orchestrateDirection(input);

  return NextResponse.json(result);
}
