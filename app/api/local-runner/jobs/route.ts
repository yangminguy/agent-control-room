import { NextResponse } from "next/server";
import { z } from "zod";
import {
  claimJobsForLocalRunner,
  parseAgentList,
} from "@/lib/control-room/local-runner-bridge";
import { getPendingLocalRunnerJobs } from "@/lib/control-room/store";

export const runtime = "nodejs";

const ClaimSchema = z.object({
  runnerId: z.string().min(1),
  agents: z.array(z.enum(["claude-code", "codex", "antigravity"])).optional(),
  limit: z.number().int().min(1).max(10).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agents = parseAgentList(url.searchParams.get("agents"));
  const limit = Number(url.searchParams.get("limit") ?? "5");
  const pending = await getPendingLocalRunnerJobs({
    agents,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 10) : 5,
  });

  return NextResponse.json({
    success: true,
    jobs: pending.map(({ run, job }) => ({
      ...job,
      runId: run.id,
      planId: run.planId,
      featurePlanId: job.featurePlanId ?? run.featurePlanId,
    })),
  });
}

export async function POST(request: Request) {
  try {
    const body = ClaimSchema.parse(await request.json());
    const jobs = await claimJobsForLocalRunner({
      runnerId: body.runnerId,
      agents: body.agents,
      limit: body.limit,
    });

    return NextResponse.json({
      success: true,
      jobs,
      message: jobs.length
        ? "Jobs claimed for local runner execution."
        : "No claimable local runner jobs.",
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Invalid local runner claim request",
      },
      { status: 400 },
    );
  }
}
