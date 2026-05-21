/**
 * Context Pack Generator
 *
 * Pure string output — no file writes, no child processes, no network calls.
 * Generates Markdown Context Pack documents for agent handoffs and session resets.
 */

export function generateContextPackMarkdown(params: {
  projectName: string;
  currentPhase: string;
  completedWork: string[];
  changedFiles: string[];
  importantDecisions: string[];
  blockers: string[];
  nextTask: string;
  acceptanceCriteria: string[];
}): string {
  const {
    projectName,
    currentPhase,
    completedWork,
    changedFiles,
    importantDecisions,
    blockers,
    nextTask,
    acceptanceCriteria,
  } = params;

  const date = new Date().toISOString().split("T")[0];

  const lines: string[] = [
    "---",
    `project: ${projectName}`,
    `type: context-pack`,
    `date: ${date}`,
    `phase: ${currentPhase}`,
    "---",
    "",
    `# Context Pack — ${projectName}`,
    "",
    `**Phase:** ${currentPhase}`,
    `**Generated:** ${date}`,
    "",
    "## Completed Work",
    "",
    ...completedWork.map((item) => `- ${item}`),
    "",
    "## Changed Files",
    "",
    ...changedFiles.map((f) => `- \`${f}\``),
    "",
    "## Important Decisions",
    "",
    ...importantDecisions.map((d) => `- ${d}`),
    "",
    "## Blockers",
    "",
    blockers.length > 0
      ? blockers.map((b) => `- ${b}`).join("\n")
      : "- None",
    "",
    "## Next Task",
    "",
    nextTask,
    "",
    "## Acceptance Criteria",
    "",
    ...acceptanceCriteria.map((c) => `- [ ] ${c}`),
    "",
  ];

  return lines.join("\n");
}
