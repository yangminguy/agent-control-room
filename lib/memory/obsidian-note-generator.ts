/**
 * Obsidian Note Generator
 *
 * Generates Obsidian-compatible Markdown notes for development insights,
 * decisions, handoffs, and session summaries.
 */

export type ObsidianNoteType =
  | "insight"
  | "decision"
  | "failed-attempt"
  | "prompt"
  | "handoff"
  | "status"
  | "qa-finding"
  | "session-summary";

export function generateObsidianNote(
  type: ObsidianNoteType,
  data: Record<string, any>
): string {
  const date = new Date().toISOString().split("T")[0];
  const project = data.project ?? "Agent Control Room";
  const sourceAgent = data.source_agent ?? data.sourceAgent ?? "unknown";
  const relatedPhase = data.related_phase ?? data.relatedPhase ?? "";
  const status = data.status ?? "active";

  const frontmatter = [
    "---",
    `project: ${project}`,
    `type: ${type}`,
    `date: ${date}`,
    `source_agent: ${sourceAgent}`,
    ...(relatedPhase ? [`related_phase: ${relatedPhase}`] : []),
    `status: ${status}`,
    "---",
    "",
  ].join("\n");

  const body = buildBody(type, data, date);

  return frontmatter + body;
}

function buildBody(
  type: ObsidianNoteType,
  data: Record<string, any>,
  date: string
): string {
  switch (type) {
    case "insight": {
      const title = data.title ?? "Development Insight";
      const content = data.content ?? data.insight ?? "";
      const tags = Array.isArray(data.tags) ? data.tags : [];
      return [
        `# ${title}`,
        "",
        content,
        "",
        ...(tags.length > 0 ? [`**Tags:** ${tags.map((t: string) => `#${t}`).join(" ")}`, ""] : []),
      ].join("\n");
    }

    case "decision": {
      const title = data.title ?? "Decision";
      const context = data.context ?? "";
      const decision = data.decision ?? data.content ?? "";
      const rationale = data.rationale ?? "";
      const alternatives = Array.isArray(data.alternatives) ? data.alternatives : [];
      return [
        `# Decision: ${title}`,
        "",
        `**Date:** ${date}`,
        "",
        "## Context",
        "",
        context,
        "",
        "## Decision",
        "",
        decision,
        "",
        ...(rationale ? ["## Rationale", "", rationale, ""] : []),
        ...(alternatives.length > 0
          ? ["## Alternatives Considered", "", ...alternatives.map((a: string) => `- ${a}`), ""]
          : []),
      ].join("\n");
    }

    case "failed-attempt": {
      const title = data.title ?? "Failed Attempt";
      const what = data.what ?? data.content ?? "";
      const why = data.why ?? data.reason ?? "";
      const lesson = data.lesson ?? "";
      return [
        `# Failed Attempt: ${title}`,
        "",
        `**Date:** ${date}`,
        "",
        "## What Was Tried",
        "",
        what,
        "",
        "## Why It Failed",
        "",
        why,
        "",
        ...(lesson ? ["## Lesson Learned", "", lesson, ""] : []),
      ].join("\n");
    }

    case "prompt": {
      const title = data.title ?? "Saved Prompt";
      const agent = data.agent ?? "unknown";
      const prompt = data.prompt ?? data.content ?? "";
      const task = data.task ?? "";
      return [
        `# Prompt: ${title}`,
        "",
        `**Agent:** ${agent}`,
        ...(task ? [`**Task:** ${task}`, ""] : [""]),
        "## Prompt",
        "",
        "```",
        prompt,
        "```",
        "",
      ].join("\n");
    }

    case "handoff": {
      const fromAgent = data.from_agent ?? data.fromAgent ?? "unknown";
      const toAgent = data.to_agent ?? data.toAgent ?? "unknown";
      const completedWork = Array.isArray(data.completedWork) ? data.completedWork : [];
      const remainingWork = Array.isArray(data.remainingWork) ? data.remainingWork : [];
      const nextPrompt = data.nextPrompt ?? data.next_prompt ?? "";
      return [
        `# Handoff: ${fromAgent} → ${toAgent}`,
        "",
        `**Date:** ${date}`,
        "",
        "## Completed Work",
        "",
        ...completedWork.map((item: string) => `- ${item}`),
        "",
        "## Remaining Work",
        "",
        ...remainingWork.map((item: string) => `- ${item}`),
        "",
        ...(nextPrompt ? ["## Next Prompt", "", nextPrompt, ""] : []),
      ].join("\n");
    }

    case "status": {
      const title = data.title ?? "Status Update";
      const summary = data.summary ?? data.content ?? "";
      const agents = Array.isArray(data.agents) ? data.agents : [];
      const blockers = Array.isArray(data.blockers) ? data.blockers : [];
      return [
        `# Status: ${title}`,
        "",
        `**Date:** ${date}`,
        "",
        "## Summary",
        "",
        summary,
        "",
        ...(agents.length > 0
          ? ["## Agent Status", "", ...agents.map((a: string) => `- ${a}`), ""]
          : []),
        ...(blockers.length > 0
          ? ["## Blockers", "", ...blockers.map((b: string) => `- ${b}`), ""]
          : []),
      ].join("\n");
    }

    case "qa-finding": {
      const title = data.title ?? "QA Finding";
      const finding = data.finding ?? data.content ?? "";
      const severity = data.severity ?? "medium";
      const file = data.file ?? "";
      const recommendation = data.recommendation ?? "";
      return [
        `# QA Finding: ${title}`,
        "",
        `**Date:** ${date}`,
        `**Severity:** ${severity}`,
        ...(file ? [`**File:** \`${file}\``, ""] : [""]),
        "## Finding",
        "",
        finding,
        "",
        ...(recommendation ? ["## Recommendation", "", recommendation, ""] : []),
      ].join("\n");
    }

    case "session-summary": {
      const title = data.title ?? "Session Summary";
      const summary = data.summary ?? data.content ?? "";
      const changedFiles = Array.isArray(data.changedFiles) ? data.changedFiles : [];
      const completedTasks = Array.isArray(data.completedTasks) ? data.completedTasks : [];
      const nextTask = data.nextTask ?? "";
      return [
        `# Session Summary: ${title}`,
        "",
        `**Date:** ${date}`,
        "",
        "## Summary",
        "",
        summary,
        "",
        ...(completedTasks.length > 0
          ? ["## Completed Tasks", "", ...completedTasks.map((t: string) => `- ${t}`), ""]
          : []),
        ...(changedFiles.length > 0
          ? ["## Changed Files", "", ...changedFiles.map((f: string) => `- \`${f}\``), ""]
          : []),
        ...(nextTask ? ["## Next Task", "", nextTask, ""] : []),
      ].join("\n");
    }

    default: {
      const content = data.content ?? "";
      return [`# Note`, "", content, ""].join("\n");
    }
  }
}
