/**
 * POST /api/hermes/save-note
 * Generates an Obsidian-compatible Markdown note from a HermesAnalysis
 * and saves it to data/ (or OBSIDIAN_VAULT_PATH if configured).
 */

import { NextResponse } from "next/server";
import path from "path";
import fs from "fs/promises";
import { generateObsidianNote } from "@/lib/memory/obsidian-note-generator";
import type { HermesAnalysis } from "@/lib/types";

type RequestBody = {
  analysis: HermesAnalysis;
  title?: string;
  tags?: string[];
};

export async function POST(req: Request): Promise<NextResponse> {
  let body: RequestBody;

  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.analysis) {
    return NextResponse.json({ error: "analysis is required" }, { status: 400 });
  }

  const { analysis, title = "Hermes Analysis", tags = ["hermes", "analysis"] } = body;

  const noteContent = generateObsidianNote("insight", {
    title,
    source_agent: "hermes",
    content: [
      "## Insights",
      ...analysis.insights.map((s) => `- ${s}`),
      "",
      "## Recommendations",
      ...analysis.recommendations.map((s) => `- ${s}`),
      ...(analysis.riskFlags.length > 0
        ? ["", "## Risk Flags", ...analysis.riskFlags.map((s) => `- ${s}`)]
        : []),
      "",
      `*Analyzed at: ${analysis.analyzedAt}*`,
    ].join("\n"),
    tags,
    status: "active",
  });

  // Determine save directory
  const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
  let saveDir: string;

  if (vaultPath) {
    // Expand ~ for home directory
    saveDir = vaultPath.startsWith("~")
      ? path.join(process.env.HOME ?? "", vaultPath.slice(1))
      : vaultPath;
  } else {
    saveDir = path.join(process.cwd(), "data", "hermes-notes");
  }

  await fs.mkdir(saveDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `hermes-analysis-${timestamp}.md`;
  const filePath = path.join(saveDir, filename);

  await fs.writeFile(filePath, noteContent, "utf-8");

  return NextResponse.json({ savedPath: filePath });
}
