// T040 — Conversation-to-Task Engine
export {
  conversationToTasks,
  validateDispatchJob,
  type ConversationToTaskInput,
  type ConversationToTaskOutput,
} from "./conversation-to-task-engine";

// T041 — Risk Classifier
export {
  classifyRisk,
  classifyPlanTaskRisk,
  riskExplanation,
} from "./risk-classifier";

// T042 — Safe Dispatch Queue
export {
  SafeDispatchQueue,
  getGlobalQueue,
  resetGlobalQueue,
} from "./safe-dispatch-queue";

// T049 — Non-Blocking Progress Manager
export {
  NonBlockingProgressManager,
  getGlobalProgressManager,
  resetGlobalProgressManager,
} from "./non-blocking-progress-manager";

// Phase 18 — Orchestration Logger
export {
  logOrchestrationEvent,
  type OrchestrationLogEvent,
} from "./orchestration-logger";

// Phase 18 — Agent Adapters
export {
  getAdapter,
  ClaudeCodeCliAdapter,
  CodexCliAdapter,
  AntigravityCliAdapter,
  type AgentAdapter,
} from "./adapters/index";
