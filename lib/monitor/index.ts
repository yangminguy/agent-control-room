// T051 — Hermes Orchestration Insights Generators

// Part 1: Orchestration Insight Generator
export {
  generateOrchestrationInsight,
  type OrchestrationCycleSummary,
} from "./orchestration-insight-generator";

// Part 2: Agent Performance Summary
export {
  generateAgentPerformanceSummary,
  type AgentPerformanceMetrics,
} from "./agent-performance-summary";

// Part 3: Routing Recommendation
export {
  generateRoutingRecommendation,
  type RoutingScore,
} from "./routing-recommendation";

// Part 4: Prompt Improvement Suggestion
export {
  generatePromptImprovementSuggestion,
  type PromptPattern,
} from "./prompt-improvement-suggestion";

// Part 5: Timeout Fallback Summary
export {
  generateTimeoutFallbackSummary,
  type TimeoutSummary,
} from "./timeout-fallback-summary";

// Existing exports (from prior phases)
export { renderMonitorPacketMarkdown, exportMonitorPacketJSON } from "./task-packets";
export {
  type MonitorPacket,
  type MonitorSection,
  type MonitorPacketDraft,
  type MonitorPacketKind,
} from "./types";
