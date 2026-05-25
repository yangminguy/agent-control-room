import { MonitorPacket, MonitorPacketKind } from "./types";

function formatPacketTimestamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toISOString().replace("T", " ").replace(".000Z", " UTC");
}

// Client-safe renderer: do not import task-packets because that module loads Hermes CLI helpers.
export function renderMonitorPacketMarkdown(packet: MonitorPacket): string {
  let markdown = `# ${packet.title}\n\n`;
  markdown += `*${packet.description}*\n\n`;
  markdown += `**Created:** ${formatPacketTimestamp(packet.createdAt)}\n\n`;
  markdown += "---\n\n";

  for (const section of packet.content.sections) {
    const heading = "#".repeat(section.level);
    markdown += `${heading} ${section.title}\n\n`;

    if (section.format === "code") {
      markdown += `\`\`\`\n${section.body}\n\`\`\`\n\n`;
    } else {
      markdown += `${section.body}\n\n`;
    }
  }

  return markdown;
}

export function exportMonitorPacketMarkdown(packet: MonitorPacket): string {
  return renderMonitorPacketMarkdown(packet);
}

export function exportMonitorPacketJSON(packet: MonitorPacket): string {
  return JSON.stringify(packet, null, 2);
}

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
