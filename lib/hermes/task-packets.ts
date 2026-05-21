import {
  HermesPacket,
  HermesPacketKind,
  HermesSection,
  HermesPacketDraft,
} from "./types";

// Generator: Create example Hermes packets for each kind

export function generateSessionSummaryPacket(
  sessionName: string,
  workDone: string[],
  nextSteps: string[]
): HermesPacket {
  const sections: HermesSection[] = [
    {
      id: "summary",
      title: "Session Summary",
      level: 2,
      body: `Summary of work performed in ${sessionName}.`,
      format: "markdown",
    },
    {
      id: "completed",
      title: "Completed",
      level: 2,
      body: workDone.map((item) => `- ${item}`).join("\n"),
      format: "checklist",
    },
    {
      id: "next",
      title: "Next Steps",
      level: 2,
      body: nextSteps.map((item) => `- ${item}`).join("\n"),
      format: "checklist",
    },
  ];

  return {
    id: `session-${Date.now()}`,
    kind: "session-summary",
    title: `Session Summary: ${sessionName}`,
    description: `Auto-generated session summary for review and memory.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      sections,
    },
  };
}

export function generateContextPackPacket(
  projectName: string,
  completedPhases: string[],
  remainingWork: string[],
  importantDecisions: string[]
): HermesPacket {
  const sections: HermesSection[] = [
    {
      id: "project",
      title: "Project Context",
      level: 2,
      body: `Context pack for ${projectName}. Use this to reset long-running sessions or hand off to a new agent.`,
      format: "markdown",
    },
    {
      id: "completed-phases",
      title: "Completed Phases",
      level: 2,
      body: completedPhases.map((p) => `- ${p}`).join("\n"),
      format: "checklist",
    },
    {
      id: "remaining",
      title: "Remaining Work",
      level: 2,
      body: remainingWork.map((w) => `- ${w}`).join("\n"),
      format: "checklist",
    },
    {
      id: "decisions",
      title: "Important Decisions",
      level: 2,
      body: importantDecisions.map((d) => `- ${d}`).join("\n"),
      format: "markdown",
    },
  ];

  return {
    id: `context-${Date.now()}`,
    kind: "context-pack",
    title: `Context Pack: ${projectName}`,
    description: `Session reset or handoff context for continuation.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      sections,
    },
  };
}

export function generateHandoffPackPacket(
  fromAgent: string,
  toAgent: string,
  changedFiles: string[],
  nextPrompt: string
): HermesPacket {
  const sections: HermesSection[] = [
    {
      id: "handoff",
      title: "Handoff Instructions",
      level: 2,
      body: `Handoff from ${fromAgent} to ${toAgent}.`,
      format: "markdown",
    },
    {
      id: "changed",
      title: "Changed Files",
      level: 2,
      body: changedFiles.map((f) => `- ${f}`).join("\n"),
      format: "code",
    },
    {
      id: "next-prompt",
      title: "Next Prompt for Agent",
      level: 2,
      body: nextPrompt,
      format: "code",
    },
  ];

  return {
    id: `handoff-${Date.now()}`,
    kind: "handoff-pack",
    title: `Handoff: ${fromAgent} → ${toAgent}`,
    description: `Transfer context and instructions to the next agent.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      sections,
    },
  };
}

export function generateFailedTaskReviewPacket(
  taskName: string,
  errorSummary: string,
  rootCause: string,
  recommendations: string[]
): HermesPacket {
  const sections: HermesSection[] = [
    {
      id: "task",
      title: "Task",
      level: 2,
      body: taskName,
      format: "markdown",
    },
    {
      id: "error",
      title: "Error Summary",
      level: 2,
      body: errorSummary,
      format: "code",
    },
    {
      id: "root-cause",
      title: "Root Cause Analysis",
      level: 2,
      body: rootCause,
      format: "markdown",
    },
    {
      id: "recommendations",
      title: "Recommendations",
      level: 2,
      body: recommendations.map((r) => `- ${r}`).join("\n"),
      format: "checklist",
    },
  ];

  return {
    id: `review-${Date.now()}`,
    kind: "failed-task-review",
    title: `Failed Task Review: ${taskName}`,
    description: `Analysis of a failed task for root cause and recovery.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      sections,
    },
  };
}

export function generateBackgroundResearchPacket(
  topic: string,
  findings: string[],
  sources: string[]
): HermesPacket {
  const sections: HermesSection[] = [
    {
      id: "research",
      title: `Research: ${topic}`,
      level: 2,
      body: `Background research findings for ${topic}.`,
      format: "markdown",
    },
    {
      id: "findings",
      title: "Key Findings",
      level: 2,
      body: findings.map((f) => `- ${f}`).join("\n"),
      format: "markdown",
    },
    {
      id: "sources",
      title: "Sources",
      level: 2,
      body: sources.map((s) => `- ${s}`).join("\n"),
      format: "markdown",
    },
  ];

  return {
    id: `research-${Date.now()}`,
    kind: "background-research",
    title: `Background Research: ${topic}`,
    description: `Research findings for project context and decision-making.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      sections,
    },
  };
}

export function generateObsidianNotePacket(
  insightTitle: string,
  insightBody: string,
  tags: string[]
): HermesPacket {
  const sections: HermesSection[] = [
    {
      id: "insight",
      title: insightTitle,
      level: 2,
      body: insightBody,
      format: "markdown",
    },
    {
      id: "tags",
      title: "Tags",
      level: 2,
      body: tags.map((t) => `#${t}`).join(" "),
      format: "markdown",
    },
  ];

  return {
    id: `obsidian-${Date.now()}`,
    kind: "obsidian-note",
    title: `Note: ${insightTitle}`,
    description: `Obsidian-compatible note for personal knowledge management.`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    content: {
      sections,
    },
  };
}

// Renderer: Convert Hermes packet to Markdown

export function renderHermesPacketMarkdown(packet: HermesPacket): string {
  let markdown = `# ${packet.title}\n\n`;
  markdown += `*${packet.description}*\n\n`;
  markdown += `**Created:** ${new Date(packet.createdAt).toLocaleString()}\n\n`;
  markdown += "---\n\n";

  for (const section of packet.content.sections) {
    const heading = "#".repeat(section.level);
    markdown += `${heading} ${section.title}\n\n`;

    if (section.format === "code") {
      markdown += `\`\`\`\n${section.body}\n\`\`\`\n\n`;
    } else if (section.format === "checklist") {
      markdown += `${section.body}\n\n`;
    } else {
      markdown += `${section.body}\n\n`;
    }
  }

  return markdown;
}

// Export as Markdown (copy-friendly)

export function exportHermesPacketMarkdown(packet: HermesPacket): string {
  return renderHermesPacketMarkdown(packet);
}

// Export as JSON (for structured handling)

export function exportHermesPacketJSON(packet: HermesPacket): string {
  return JSON.stringify(packet, null, 2);
}

// List all supported kinds with descriptions

export const HERMES_PACKET_KINDS: Record<
  HermesPacketKind,
  { label: string; description: string }
> = {
  "session-summary": {
    label: "Session Summary",
    description: "Auto-generated summary of work performed in a session.",
  },
  "context-pack": {
    label: "Context Pack",
    description: "Session reset or handoff context for continuation.",
  },
  "handoff-pack": {
    label: "Handoff Pack",
    description: "Transfer context and instructions to the next agent.",
  },
  "failed-task-review": {
    label: "Failed Task Review",
    description: "Analysis of a failed task for root cause and recovery.",
  },
  "background-research": {
    label: "Background Research",
    description: "Research findings for project context and decision-making.",
  },
  "obsidian-note": {
    label: "Obsidian Note",
    description: "Personal knowledge management note (Obsidian-compatible).",
  },
};
