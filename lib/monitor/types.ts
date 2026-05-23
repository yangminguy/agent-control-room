// Hermes: Background worker for summaries, memory, monitoring, and context packing
// Hermes packet types and interfaces

export type MonitorPacketKind =
  | "session-summary"
  | "context-pack"
  | "handoff-pack"
  | "failed-task-review"
  | "background-research"
  | "obsidian-note"
  | "phase-completion"
  | "failure"
  | "drift-detection"
  | "approval-request"
  | "re-orchestration";

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

  // Execution context (Phase G additions)
  executionContext?: {
    planId?: string;
    runId?: string;
    taskId?: string;
    dispatchJobId?: string;
    agentId?: string;
    status?: string;
    riskLevel?: string;
    recommendedNextAction?: string;
    source?: "worker" | "execution" | "manual" | "mock";
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
