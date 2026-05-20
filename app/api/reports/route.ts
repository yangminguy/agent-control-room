import { NextResponse } from "next/server";
import { z } from "zod";
import { addSessionReport, getSessionReports } from "@/lib/storage/json-store";

const ReportSchema = z.object({
  projectId: z.string().min(1),
  taskId: z.string().min(1),
  agent: z.enum(["claude-code", "codex", "antigravity"]),
  changedFiles: z.array(z.string()),
  summary: z.string().min(1),
  testsRun: z.array(z.string()),
  remainingIssues: z.array(z.string()),
  recommendedNextTask: z.string(),
});

export async function GET() {
  return NextResponse.json(await getSessionReports());
}

export async function POST(request: Request) {
  const body = await request.json();
  const report = await addSessionReport(ReportSchema.parse(body));
  return NextResponse.json(report, { status: 201 });
}
