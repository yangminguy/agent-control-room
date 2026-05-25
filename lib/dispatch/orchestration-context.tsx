"use client";

import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from "react";
import type {
  DispatchJob,
  DispatchJobStatus,
  AgentResult,
  ApprovalRequest,
  FeedbackLoopOutput,
} from "@/lib/types";
import type { OrchestrationDecision } from "@/lib/orchestration/types";

// ── Client-safe logger stub ───────────────────────────────────────────────────
// The server-side orchestration-logger.ts uses `fs` (Node-only).
// This stub logs to console.debug in development; Agent B will wire the real logger.

function logOrchestrationEvent(payload: {
  event: string;
  jobId: string;
  detail?: string;
}): void {
  if (process.env.NODE_ENV !== "production") {
    // eslint-disable-next-line no-console
    console.debug("[orchestration]", payload.event, payload.jobId, payload.detail ?? "");
  }
}

// ── Seed data: 5 demo DispatchJobs, one per RiskLevel ────────────────────────

const NOW = new Date().toISOString();
const TIMEOUT_5MIN = new Date(Date.now() + 5 * 60 * 1000).toISOString();

const SEED_JOBS: DispatchJob[] = [
  {
    id: "job-demo-safe-001",
    taskId: "task-001",
    agentId: "claude-code",
    riskLevel: "safe",
    status: "completed",
    createdAt: NOW,
    completedAt: NOW,
    retryCount: 0,
    prompt: "Implement unit tests for the result-classifier module.",
  },
  {
    id: "job-demo-low-002",
    taskId: "task-002",
    agentId: "codex",
    riskLevel: "low",
    status: "running",
    createdAt: NOW,
    retryCount: 0,
    prompt: "Add TypeScript types for the feedback loop output schema.",
  },
  {
    id: "job-demo-medium-003",
    taskId: "task-003",
    agentId: "antigravity",
    riskLevel: "medium",
    status: "queued",
    createdAt: NOW,
    retryCount: 1,
    prompt: "Refactor the ProgressManagerStatusView to support pagination.",
  },
  {
    id: "job-demo-high-004",
    taskId: "task-004",
    agentId: "claude-code",
    riskLevel: "high",
    status: "approved",
    createdAt: NOW,
    approvedAt: NOW,
    timeoutAt: TIMEOUT_5MIN,
    retryCount: 0,
    prompt: "Migrate session reports to Supabase with rollback strategy.",
  },
  {
    id: "job-demo-critical-005",
    taskId: "task-005",
    agentId: "claude-code",
    riskLevel: "critical",
    status: "skipped_due_to_risk",
    createdAt: NOW,
    retryCount: 0,
    prompt: "Force-push updated branch to production remote.",
  },
];

const SEED_APPROVAL: ApprovalRequest = {
  id: "approval-demo-001",
  dispatchJobId: "job-demo-high-004",
  status: "pending",
  createdAt: NOW,
  discordMessagePreview:
    "[APPROVAL REQUIRED]\nJob: job-demo-high-004\nRisk: high\nTask: task-004\nPrompt: Migrate session reports to Supabase with rollback strategy.\n\nReply ✅ to approve or ❌ to reject within 5 minutes.",
};

const SEED_FEEDBACK: FeedbackLoopOutput = {
  decision: "redispatch",
  reason:
    "Minor type errors detected in result-classifier output. Retrying with patched prompt.",
  nextDispatchJob: SEED_JOBS[1],
};

// ── State ─────────────────────────────────────────────────────────────────────

export type OrchestrationState = {
  jobs: DispatchJob[];
  results: AgentResult[];
  approvals: ApprovalRequest[];
  feedbackOutputs: FeedbackLoopOutput[];
  statusFilter: DispatchJobStatus | "all";
  isDemoMode: boolean;
};

const INITIAL_STATE: OrchestrationState = {
  jobs: [],
  results: [],
  approvals: [],
  feedbackOutputs: [],
  statusFilter: "all",
  isDemoMode: false,
};

// ── Reducer ───────────────────────────────────────────────────────────────────

type Action =
  | { type: "SET_STATUS_FILTER"; payload: DispatchJobStatus | "all" }
  | { type: "ADD_JOB"; payload: DispatchJob }
  | { type: "UPDATE_JOB_STATUS"; payload: { id: string; status: DispatchJobStatus } }
  | { type: "COLLECT_RESULT"; payload: AgentResult }
  | { type: "MOCK_APPROVE"; payload: string }
  | { type: "MOCK_REJECT"; payload: string }
  | { type: "ADD_FEEDBACK_OUTPUT"; payload: FeedbackLoopOutput }
  | { type: "TOGGLE_DEMO_MODE" };

function reducer(state: OrchestrationState, action: Action): OrchestrationState {
  switch (action.type) {
    case "SET_STATUS_FILTER":
      return { ...state, statusFilter: action.payload };

    case "ADD_JOB":
      return { ...state, jobs: [...state.jobs, action.payload] };

    case "UPDATE_JOB_STATUS":
      return {
        ...state,
        jobs: state.jobs.map((j) =>
          j.id === action.payload.id ? { ...j, status: action.payload.status } : j
        ),
      };

    case "COLLECT_RESULT":
      return {
        ...state,
        results: [action.payload, ...state.results],
        jobs: state.jobs.map((j) =>
          j.id === action.payload.dispatchJobId
            ? {
                ...j,
                status: action.payload.resultStatus === "pass" ? "completed" : "failed",
                completedAt: new Date().toISOString(),
                resultId: action.payload.id,
              }
            : j
        ),
      };

    case "MOCK_APPROVE":
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.payload
            ? { ...a, status: "approved" as const, resolvedAt: new Date().toISOString() }
            : a
        ),
        jobs: state.jobs.map((j) =>
          state.approvals.some((a) => a.id === action.payload && a.dispatchJobId === j.id)
            ? { ...j, status: "approved" as const, approvedAt: new Date().toISOString() }
            : j
        ),
      };

    case "MOCK_REJECT":
      return {
        ...state,
        approvals: state.approvals.map((a) =>
          a.id === action.payload
            ? { ...a, status: "rejected" as const, resolvedAt: new Date().toISOString() }
            : a
        ),
        jobs: state.jobs.map((j) =>
          state.approvals.some((a) => a.id === action.payload && a.dispatchJobId === j.id)
            ? { ...j, status: "failed" as const, completedAt: new Date().toISOString() }
            : j
        ),
      };

    case "ADD_FEEDBACK_OUTPUT":
      return {
        ...state,
        feedbackOutputs: [action.payload, ...state.feedbackOutputs],
      };

    case "TOGGLE_DEMO_MODE": {
      const nextDemo = !state.isDemoMode;
      return {
        ...state,
        isDemoMode: nextDemo,
        jobs: nextDemo
          ? [...state.jobs, ...SEED_JOBS]
          : state.jobs.filter((j) => !SEED_JOBS.some((s) => s.id === j.id)),
        approvals: nextDemo
          ? [...state.approvals, SEED_APPROVAL]
          : state.approvals.filter((a) => a.id !== SEED_APPROVAL.id),
        feedbackOutputs: nextDemo
          ? [...state.feedbackOutputs, SEED_FEEDBACK]
          : state.feedbackOutputs.filter(
              (f) => f.nextDispatchJob?.id !== SEED_FEEDBACK.nextDispatchJob?.id
            ),
      };
    }

    default:
      return state;
  }
}

// ── Context value type ────────────────────────────────────────────────────────

type OrchestrationContextValue = OrchestrationState & {
  setStatusFilter: (s: DispatchJobStatus | "all") => void;
  addJob: (job: DispatchJob) => void;
  updateJobStatus: (id: string, status: DispatchJobStatus) => void;
  collectResult: (result: AgentResult) => void;
  mockApprove: (approvalId: string) => void;
  mockReject: (approvalId: string) => void;
  addFeedbackOutput: (output: FeedbackLoopOutput) => void;
  toggleDemoMode: () => void;
};

const OrchestrationContext = createContext<OrchestrationContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function OrchestrationProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pending_orchestration_jobs");
      if (!raw) return;

      const items: Array<{ job: DispatchJob; decision: OrchestrationDecision }> =
        JSON.parse(raw);

      items.forEach(({ job, decision }) => {
        const mappedAgentId =
          decision.primaryAgent === "hermes" ||
          decision.primaryAgent === "vibe-kanban" ||
          decision.primaryAgent === "manual-user"
            ? "claude-code"
            : decision.primaryAgent;

        dispatch({
          type: "ADD_JOB",
          payload: {
            ...job,
            riskLevel: decision.riskLevel,
            agentId: mappedAgentId as DispatchJob["agentId"],
          },
        });
      });

      localStorage.removeItem("pending_orchestration_jobs");
    } catch {
      // localStorage parse 실패는 무시
    }
  }, []);

  const setStatusFilter = (s: DispatchJobStatus | "all") => {
    dispatch({ type: "SET_STATUS_FILTER", payload: s });
  };

  const addJob = (job: DispatchJob) => {
    logOrchestrationEvent({
      event: "job_dispatched",
      jobId: job.id,
      detail: job.prompt?.slice(0, 200),
    });
    dispatch({ type: "ADD_JOB", payload: job });
  };

  const updateJobStatus = (id: string, status: DispatchJobStatus) => {
    logOrchestrationEvent({ event: "status_changed", jobId: id, detail: status });
    dispatch({ type: "UPDATE_JOB_STATUS", payload: { id, status } });
  };

  const collectResult = (result: AgentResult) => {
    logOrchestrationEvent({
      event: "result_collected",
      jobId: result.dispatchJobId,
      detail: result.resultStatus,
    });
    dispatch({ type: "COLLECT_RESULT", payload: result });
  };

  const mockApprove = (approvalId: string) => {
    logOrchestrationEvent({
      event: "approval_resolved",
      jobId: approvalId,
      detail: "approved",
    });
    dispatch({ type: "MOCK_APPROVE", payload: approvalId });
  };

  const mockReject = (approvalId: string) => {
    logOrchestrationEvent({
      event: "approval_resolved",
      jobId: approvalId,
      detail: "rejected",
    });
    dispatch({ type: "MOCK_REJECT", payload: approvalId });
  };

  const addFeedbackOutput = (output: FeedbackLoopOutput) => {
    dispatch({ type: "ADD_FEEDBACK_OUTPUT", payload: output });
  };

  const toggleDemoMode = () => {
    dispatch({ type: "TOGGLE_DEMO_MODE" });
  };

  const value: OrchestrationContextValue = {
    ...state,
    setStatusFilter,
    addJob,
    updateJobStatus,
    collectResult,
    mockApprove,
    mockReject,
    addFeedbackOutput,
    toggleDemoMode,
  };

  return (
    <OrchestrationContext.Provider value={value}>
      {children}
    </OrchestrationContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOrchestration(): OrchestrationContextValue {
  const ctx = useContext(OrchestrationContext);
  if (!ctx) {
    throw new Error("useOrchestration must be used within OrchestrationProvider");
  }
  return ctx;
}
