// T050 — Feedback Loop Engine
export {
  FeedbackLoopEngine,
  getGlobalFeedbackLoop,
  resetGlobalFeedbackLoop,
} from "./feedback-loop-engine";

// Existing exports (from prior phases)
export { generateContextPackMarkdown } from "./context-pack-generator";
export { generateHandoffPackMarkdown } from "./handoff-pack-generator";
export {
  classifyResult,
  generateNextActions,
  extractChangedFilesFromResult,
  type ResultClassification,
} from "./result-classifier";

// Phase 40 — Full Orchestration Layer
export type {
  ExtendedAgentType,
  ExecutionMode,
  FileBoundary,
  ApprovalGate,
  OrchestrationDecision,
  OrchestrationDecisionInput,
  ContextPack,
  ContextPackBuilderInput,
  MonitorMemoryNote,
  MonitorMemoryNoteInput,
  AgentRoutingResult,
  ExecutionModeResult,
} from "./types";

export { makeOrchestrationDecision } from "./decision-engine";
export { routeAgent, getAgentRole, isHermesAllowedAsPrimary } from "./agent-router";
export { buildApprovalGate } from "./approval-gate-builder";
export {
  buildContextPack,
  renderContextPackMarkdown as renderContextPackMarkdownV2,
  buildRelayPrompt,
} from "./context-pack-builder";
export { buildPromptWithBoundary } from "./prompt-boundary-builder";
export {
  buildMonitorMemoryNote,
  renderHermesMemoryMarkdown,
  suggestHermesMemoryType,
  getObsidianPath,
} from "./monitor-memory-builder";
