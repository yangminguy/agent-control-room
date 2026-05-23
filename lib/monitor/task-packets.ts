import { MonitorPacket, MonitorPacketKind } from "./types";
import { getHermesLLMClient } from "./hermes-llm-client";

// Generator: Create example Hermes packets for each kind

export async function generateSessionSummaryPacket(
  sessionName: string,
  workDone: string[],
  nextSteps: string[]
): Promise<MonitorPacket> {
  const client = getHermesLLMClient();
  return client.generatePacket("session-summary", { sessionName, workDone, nextSteps });
}

export async function generateContextPackPacket(
  projectName: string,
  completedPhases: string[],
  remainingWork: string[],
  importantDecisions: string[]
): Promise<MonitorPacket> {
  const client = getHermesLLMClient();
  return client.generatePacket("context-pack", {
    projectName,
    completedPhases,
    remainingWork,
    importantDecisions,
  });
}

export async function generateHandoffPackPacket(
  fromAgent: string,
  toAgent: string,
  changedFiles: string[],
  nextPrompt: string
): Promise<MonitorPacket> {
  const client = getHermesLLMClient();
  return client.generatePacket("handoff-pack", { fromAgent, toAgent, changedFiles, nextPrompt });
}

export async function generateFailedTaskReviewPacket(
  taskName: string,
  errorSummary: string,
  rootCause: string,
  recommendations: string[]
): Promise<MonitorPacket> {
  const client = getHermesLLMClient();
  return client.generatePacket("failed-task-review", {
    taskName,
    errorSummary,
    rootCause,
    recommendations,
  });
}

export async function generateBackgroundResearchPacket(
  topic: string,
  findings: string[],
  sources: string[]
): Promise<MonitorPacket> {
  const client = getHermesLLMClient();
  return client.generatePacket("background-research", { topic, findings, sources });
}

export async function generateObsidianNotePacket(
  insightTitle: string,
  insightBody: string,
  tags: string[]
): Promise<MonitorPacket> {
  const client = getHermesLLMClient();
  return client.generatePacket("obsidian-note", { insightTitle, insightBody, tags });
}

// Renderer: Convert Hermes packet to Markdown

export function renderMonitorPacketMarkdown(packet: MonitorPacket): string {
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

export function exportMonitorPacketMarkdown(packet: MonitorPacket): string {
  return renderMonitorPacketMarkdown(packet);
}

// Export as JSON (for structured handling)

export function exportMonitorPacketJSON(packet: MonitorPacket): string {
  return JSON.stringify(packet, null, 2);
}

// List all supported kinds with descriptions

export const HERMES_PACKET_KINDS: Record<
  MonitorPacketKind,
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
  "phase-completion": {
    label: "Phase Completion",
    description: "Task or phase successfully completed.",
  },
  failure: {
    label: "Execution Failure",
    description: "Task execution failed — review and recovery required.",
  },
  "drift-detection": {
    label: "Drift Detection",
    description: "Execution drifted from plan — re-orchestration needed.",
  },
  "approval-request": {
    label: "Approval Request",
    description: "High-risk operation waiting for user approval.",
  },
  "re-orchestration": {
    label: "Re-Orchestration",
    description: "Plan adjustment or re-prioritization signal.",
  },
};
