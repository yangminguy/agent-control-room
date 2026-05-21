/**
 * Vibe Kanban Bridge Generator
 *
 * Generates Markdown output for the Agent Control Room ↔ Vibe Kanban bridge.
 * Pure Markdown generation only — no file writes, no HTTP calls.
 */

import type { VibeBridgeKind } from "./types";

export type { VibeBridgeKind };

export function generateVibeBridgeMarkdown(
  kind: VibeBridgeKind,
  data: Record<string, any>
): string {
  switch (kind) {
    case "workspace":
      return generateWorkspaceMarkdown(data);
    case "session":
      return generateSessionMarkdown(data);
    case "issue":
      return generateIssueMarkdown(data);
    case "diff":
      return generateDiffMarkdown(data);
    case "markdown":
      return generateGenericMarkdown(data);
    default:
      return `# Vibe Kanban Bridge\n\nUnknown kind: ${kind}\n`;
  }
}

function generateWorkspaceMarkdown(data: Record<string, any>): string {
  const projectId = data.projectId ?? "unknown";
  const workspaceName = data.workspaceName ?? "Unnamed Workspace";
  const branch = data.branch ?? "";
  const agent = data.agent ?? "";
  const notes = data.notes ?? "";

  return [
    `# Workspace: ${workspaceName}`,
    "",
    `**Project ID:** ${projectId}`,
    ...(branch ? [`**Branch:** \`${branch}\``] : []),
    ...(agent ? [`**Agent:** ${agent}`] : []),
    "",
    ...(notes ? ["## Notes", "", notes, ""] : []),
  ].join("\n");
}

function generateSessionMarkdown(data: Record<string, any>): string {
  const projectId = data.projectId ?? "unknown";
  const taskTitle = data.taskTitle ?? "Unnamed Task";
  const agentId = data.agentId ?? "unknown";
  const prompt = data.prompt ?? "";
  const acceptanceCriteria: string[] = Array.isArray(data.acceptanceCriteria)
    ? data.acceptanceCriteria
    : [];
  const doNotTouchFiles: string[] = Array.isArray(data.doNotTouchFiles)
    ? data.doNotTouchFiles
    : [];

  return [
    `# Session: ${taskTitle}`,
    "",
    `**Project ID:** ${projectId}`,
    `**Agent:** ${agentId}`,
    "",
    "## Prompt",
    "",
    prompt,
    "",
    ...(acceptanceCriteria.length > 0
      ? [
          "## Acceptance Criteria",
          "",
          ...acceptanceCriteria.map((c: string) => `- [ ] ${c}`),
          "",
        ]
      : []),
    ...(doNotTouchFiles.length > 0
      ? [
          "## Do Not Touch",
          "",
          ...doNotTouchFiles.map((f: string) => `- \`${f}\``),
          "",
        ]
      : []),
  ].join("\n");
}

function generateIssueMarkdown(data: Record<string, any>): string {
  const projectId = data.projectId ?? "unknown";
  const title = data.title ?? "Unnamed Issue";
  const description = data.description ?? "";
  const priority = data.priority ?? "medium";
  const agentId = data.agentId ?? "";

  return [
    `# Issue: ${title}`,
    "",
    `**Project ID:** ${projectId}`,
    `**Priority:** ${priority}`,
    ...(agentId ? [`**Agent:** ${agentId}`] : []),
    "",
    "## Description",
    "",
    description,
    "",
  ].join("\n");
}

function generateDiffMarkdown(data: Record<string, any>): string {
  const sessionId = data.sessionId ?? "unknown";
  const changedFiles: string[] = Array.isArray(data.changedFiles)
    ? data.changedFiles
    : [];
  const summary = data.summary ?? "";
  const accepted = data.accepted;
  const notes = data.notes ?? "";

  return [
    `# Diff Review — Session ${sessionId}`,
    "",
    ...(accepted !== undefined
      ? [`**Status:** ${accepted ? "Accepted" : "Pending Review"}`]
      : []),
    "",
    "## Summary",
    "",
    summary,
    "",
    "## Changed Files",
    "",
    ...changedFiles.map((f: string) => `- \`${f}\``),
    "",
    ...(notes ? ["## Notes", "", notes, ""] : []),
  ].join("\n");
}

function generateGenericMarkdown(data: Record<string, any>): string {
  const title = data.title ?? "Vibe Kanban Note";
  const body = data.body ?? data.content ?? "";
  const tags: string[] = Array.isArray(data.tags) ? data.tags : [];

  return [
    `# ${title}`,
    "",
    body,
    "",
    ...(tags.length > 0
      ? [`**Tags:** ${tags.map((t: string) => `#${t}`).join(" ")}`, ""]
      : []),
  ].join("\n");
}
