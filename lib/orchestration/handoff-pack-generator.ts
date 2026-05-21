/**
 * Handoff Pack Generator
 *
 * Pure string output — no file writes, no child processes, no network calls.
 * Generates Markdown Handoff Pack documents for transferring context between agents.
 */

export function generateHandoffPackMarkdown(params: {
  fromAgent: string;
  toAgent: string;
  completedWork: string[];
  remainingWork: string[];
  changedFiles: string[];
  blockers?: string[];
  nextPrompt: string;
  contextRequirements?: string[];
}): string {
  const {
    fromAgent,
    toAgent,
    completedWork,
    remainingWork,
    changedFiles,
    blockers = [],
    nextPrompt,
    contextRequirements = [],
  } = params;

  const date = new Date().toISOString().split("T")[0];

  const lines: string[] = [
    "---",
    `type: handoff-pack`,
    `date: ${date}`,
    `from_agent: ${fromAgent}`,
    `to_agent: ${toAgent}`,
    "---",
    "",
    `# Handoff Pack — ${fromAgent} → ${toAgent}`,
    "",
    `**Date:** ${date}`,
    "",
    "## Completed Work",
    "",
    ...completedWork.map((item) => `- ${item}`),
    "",
    "## Remaining Work",
    "",
    ...remainingWork.map((item) => `- ${item}`),
    "",
    "## Changed Files",
    "",
    ...changedFiles.map((f) => `- \`${f}\``),
    "",
    "## Blockers",
    "",
    blockers.length > 0
      ? blockers.map((b) => `- ${b}`).join("\n")
      : "- None",
    "",
    "## Context Requirements",
    "",
    contextRequirements.length > 0
      ? contextRequirements.map((r) => `- ${r}`).join("\n")
      : "- None",
    "",
    "## Next Prompt",
    "",
    nextPrompt,
    "",
  ];

  return lines.join("\n");
}
