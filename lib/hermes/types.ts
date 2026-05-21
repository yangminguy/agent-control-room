// Hermes: Background worker for summaries, memory, monitoring, and context packing
// Hermes packet types and interfaces

export type HermesPacketKind =
  | "session-summary"
  | "context-pack"
  | "handoff-pack"
  | "failed-task-review"
  | "background-research"
  | "obsidian-note";

export interface HermesPacket {
  id: string;
  kind: HermesPacketKind;
  title: string;
  description: string;
  createdAt: string;
  updatedAt: string;

  // Packet content
  content: {
    sections: HermesSection[];
    metadata?: Record<string, unknown>;
  };
}

export interface HermesSection {
  id: string;
  title: string;
  level: 1 | 2 | 3;
  body: string;
  format: "markdown" | "code" | "checklist";
}

export interface HermesPacketDraft {
  kind: HermesPacketKind;
  title: string;
  description: string;
  sections: HermesSection[];
  markdown: string;
}
