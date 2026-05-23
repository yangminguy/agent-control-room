import { NextResponse } from "next/server";
import { z } from "zod";
import { acceptLocalRunnerResult } from "@/lib/control-room/local-runner-bridge";

export const runtime = "nodejs";

const ResultSchema = z.object({
  runnerId: z.string().min(1),
  result: z.object({
    id: z.string().min(1),
    dispatchJobId: z.string().min(1),
    taskId: z.string().min(1),
    agentId: z.enum(["claude-code", "codex", "antigravity"]),
    rawOutput: z.string(),
    resultStatus: z.enum(["pass", "minor_fix", "qa_needed", "blocked", "safety_violation"]),
    changedFiles: z.array(z.string()).optional(),
    extractedSummary: z.string().optional(),
    timestamp: z.string().min(1),
  }),
});

export async function POST(request: Request) {
  try {
    const body = ResultSchema.parse(await request.json());
    const output = await acceptLocalRunnerResult(body);
    return NextResponse.json({
      success: true,
      ...output,
      message: output.runUpdated
        ? "Local runner result accepted and Control Room run updated."
        : "Local runner result accepted. No matching run was found.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid local runner result",
      },
      { status: 400 },
    );
  }
}
