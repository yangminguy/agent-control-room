// Hermes: Background worker for summaries, memory, monitoring, and context packing
// Hermes packet types and interfaces

export type MonitorPacketKind =
  | "session-summary"
  | "context-pack"
  | "handoff-pack"
  | "failed-task-review"
  | "background-research"
  | "obsidian-note";

export interface MonitorPacket {
  id: string;
  kind: MonitorPacketKind;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  // Packet content
  content: {
    sections: MonitorSection[];
    metadata?: Record<string, unknown>;
  };
}

export interface MonitorSection {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  body: string;
  format: "markdown" | "code" | "checklist";
}

export interface MonitorPacketDraft {
  kind: MonitorPacketKind;
  title: string;
  description: string;
  sections: MonitorSection[];
  markdown: string;
}
