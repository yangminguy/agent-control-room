/**
 * Context Pack Generator
 *
 * Pure string output — no file writes, no child processes, no network calls.
 * Generates Markdown Context Pack documents for agent handoffs and session resets.
 */

export interface ContextPackParams {
  projectName: string;
  projectSummary?: string;
  currentSituation?: string;
  currentPhase: string;
  targetAgent?: string;
  completedWork: string[];
  pendingWork?: string[];
  changedFiles: string[];
  allowedFiles?: string[];
  doNotTouchFiles?: string[];
  doNotDoRules?: string[];
  importantDecisions: string[];
  blockers: string[];
  userDecisionsNeeded?: string[];
  validationCommands?: string[];
  nextTask: string;
  acceptanceCriteria: string[];
  nextSessionPrompt?: string;
  finalHandoffExpectations?: string[];
  // T-AUTO-011: Context limit tracking
  contextLimitStatus?: {
    tokensUsed: number;
    tokenLimit: number;
    percentage: number;
    recommendedFallbackAgent?: string;
  };
}

export function generateContextPackMarkdown(params: ContextPackParams): string {
  const {
    projectName,
    projectSummary,
    currentSituation,
    currentPhase,
    targetAgent,
    completedWork,
    pendingWork,
    changedFiles,
    allowedFiles,
    doNotTouchFiles,
    doNotDoRules,
    importantDecisions,
    blockers,
    userDecisionsNeeded,
    validationCommands,
    nextTask,
    acceptanceCriteria,
    nextSessionPrompt,
    finalHandoffExpectations,
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
    `**Target Agent:** ${targetAgent || "Not specified"}`,
    `**Generated:** ${date}`,
    "",
    "## Project Summary",
    "",
    projectSummary || projectName,
    "",
    "## Current Situation",
    "",
    currentSituation || "Continue from the current control-tower state using the sections below as source of truth.",
    "",
    "## Current Phase",
    "",
    currentPhase,
    "",
    "## Target Agent",
    "",
    targetAgent || "Not specified",
    "",
    "## Completed Work",
    "",
    ...listOrNone(completedWork),
    "",
    "## Pending Work",
    "",
    ...listOrNone(pendingWork ?? [nextTask].filter(Boolean)),
    "",
    "## Changed Files",
    "",
    ...fileListOrNone(changedFiles),
    "",
    "## Allowed Files",
    "",
    ...fileListOrNone(allowedFiles ?? []),
    "",
    "## Do-Not-Touch Files",
    "",
    ...fileListOrNone(doNotTouchFiles ?? []),
    "",
    "## Do-Not-Do Rules",
    "",
    ...listOrNone(doNotDoRules ?? [
      "Do not deploy.",
      "Do not run database migrations.",
      "Do not push, merge, auto-commit, or auto-revert.",
      "Do not add autonomous code-running paths.",
    ]),
    "",
    "## Important Decisions",
    "",
    ...listOrNone(importantDecisions),
    "",
    "## Blocked Items",
    "",
    ...listOrNone(blockers),
    "",
    "## User Decisions Needed",
    "",
    ...listOrNone(userDecisionsNeeded ?? []),
    "",
    "## Next Task",
    "",
    nextTask,
    "",
    "## Acceptance Criteria",
    "",
    ...acceptanceCriteria.map((c) => `- [ ] ${c}`),
    "",
    "## Validation Commands",
    "",
    ...codeListOrNone(validationCommands ?? ["npm run typecheck", "npm run lint", "npm run build", "npm test"]),
    "",
    "## Next-Session Prompt",
    "",
    nextSessionPrompt || nextTask || "Review this Context Pack and continue with the next approved task.",
    "",
    ...(params.contextLimitStatus
      ? [
          "## Context Limit Status",
          "",
          `**Tokens Used:** ${params.contextLimitStatus.tokensUsed} / ${params.contextLimitStatus.tokenLimit} (${params.contextLimitStatus.percentage}%)`,
          "",
          "⚠️ Context limit is approaching. Consider saving this pack and resuming in a new session.",
          "",
          ...(params.contextLimitStatus.recommendedFallbackAgent
            ? [
                `**Recommended Fallback Agent:** \`${params.contextLimitStatus.recommendedFallbackAgent}\``,
                "",
              ]
            : []),
        ]
      : []),
    "## Final Handoff Expectations",
    "",
    ...listOrNone(finalHandoffExpectations ?? [
      "Summarize completed work.",
      "List changed files.",
      "List validation commands and results.",
      "Call out blockers, boundary violations, and remaining risks.",
      "Recommend one next action.",
    ]),
    "",
  ];

  return lines.join("\n");
}

function listOrNone(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item}`) : ["- None"];
}

function fileListOrNone(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- \`${item}\``) : ["- None"];
}

function codeListOrNone(items: string[]): string[] {
  return items.length > 0 ? items.map((item) => `- \`${item}\``) : ["- None"];
}
