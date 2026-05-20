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
  nextTask: z.string(),
  // Extended Session Report fields (optional for backward compatibility)
  executionTimeMinutes: z.number().default(0),
  tokensUsed: z.number().default(0),
  errors: z.array(z.string()).default([]),
  codeReviewScore: z.number().default(0),
  accessibilityScore: z.number().default(0),
  performanceMetrics: z.object({
    bundleSize: z.number().optional(),
    loadTime: z.number().optional(),
    coreWebVitals: z.record(z.number()).optional(),
  }).optional(),
  manualNotes: z.string().default(""),
  completionJudgment: z.enum(["completed", "partial", "not_completed"]).default("completed"),
  completionReason: z.string().default(""),
  nextPrompt: z.string().default(""),
  recommendedAgent: z.enum(["claude-code", "codex", "antigravity", "manual"]).default("manual"),
  prdAlignmentScore: z.number().default(0),
  risks: z.array(z.string()).default([]),
  updatedAt: z.string().optional(),
});

export async function GET() {
  return NextResponse.json(await getSessionReports());
}

export async function POST(request: Request) {
  const body = await request.json();
  const report = await addSessionReport(ReportSchema.parse(body));
  return NextResponse.json(report, { status: 201 });
}
