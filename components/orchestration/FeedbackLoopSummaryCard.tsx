"use client";

import { type FeedbackLoopOutput, type DispatchJob } from "@/lib/types";

// ── Decision config ───────────────────────────────────────

const DECISION_CONFIG = {
  redispatch: {
    icon: "⚠️",
    label: "Redispatch (Retry)",
    cls: "border-yellow-700 bg-yellow-950",
    textCls: "text-yellow-300",
  },
  create_qa_task: {
    icon: "🟡",
    label: "QA Task Created",
    cls: "border-blue-700 bg-blue-950",
    textCls: "text-blue-300",
  },
  create_blocked_decision: {
    icon: "🔴",
    label: "Blocked — User Decision Required",
    cls: "border-red-700 bg-red-950",
    textCls: "text-red-300",
  },
  halt_safety_violation: {
    icon: "🛑",
    label: "HALT — Safety Violation",
    cls: "border-red-900 bg-red-950",
    textCls: "text-red-200",
  },
} as const;

const MAX_RETRIES = 3;

// ── Props ─────────────────────────────────────────────────

interface FeedbackLoopSummaryCardProps {
  feedbackOutput: FeedbackLoopOutput;
  originalJob: DispatchJob;
}

// ── Component ─────────────────────────────────────────────

export function FeedbackLoopSummaryCard({
  feedbackOutput,
  originalJob,
}: FeedbackLoopSummaryCardProps) {
  const cfg = DECISION_CONFIG[feedbackOutput.decision];
  const retryCount = originalJob.retryCount;
  const isBlocked = retryCount >= MAX_RETRIES;

  return (
    <div className={`rounded-lg border ${cfg.cls} p-4 space-y-4`}>
      {/* Decision header */}
      <div className="flex items-center gap-3">
        <span className="text-2xl leading-none" role="img" aria-label={feedbackOutput.decision}>
          {cfg.icon}
        </span>
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Feedback Loop Decision
          </p>
          <p className={`text-sm font-bold mt-0.5 ${cfg.textCls}`}>{cfg.label}</p>
        </div>
      </div>

      {/* Reason */}
      <div className="rounded border border-border bg-surface px-3 py-2">
        <p className="text-xs font-semibold text-text-secondary mb-1">Reason</p>
        <p className="text-sm text-text-primary">{feedbackOutput.reason}</p>
      </div>

      {/* Retry counter (redispatch) */}
      {feedbackOutput.decision === "redispatch" && (
        <div className={`rounded border px-3 py-2 ${isBlocked ? "border-red-700 bg-red-950" : "border-border bg-surface"}`}>
          <p className="text-xs font-semibold text-text-secondary mb-1">Retry Status</p>
          <div className="flex items-center gap-2">
            <span className={`text-sm font-bold ${isBlocked ? "text-red-400" : "text-text-primary"}`}>
              Attempt {retryCount} of {MAX_RETRIES}
            </span>
            {isBlocked && (
              <span className="text-xs font-medium text-red-300 border border-red-700 bg-red-900 px-2 py-0.5 rounded">
                BLOCKED — max retries reached
              </span>
            )}
          </div>
          {!isBlocked && (
            <div className="mt-2 h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-yellow-500"
                style={{ width: `${(retryCount / MAX_RETRIES) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {/* Redispatch job link */}
      {feedbackOutput.decision === "redispatch" && feedbackOutput.nextDispatchJob && (
        <div className="rounded border border-border bg-surface px-3 py-2">
          <p className="text-xs font-semibold text-text-secondary mb-1">Next Dispatch Job</p>
          <p className="text-xs font-mono text-text-primary">{feedbackOutput.nextDispatchJob.id}</p>
          <p className="text-xs text-text-secondary">Agent: {feedbackOutput.nextDispatchJob.agentId}</p>
        </div>
      )}

      {/* Blocked decision */}
      {feedbackOutput.decision === "create_blocked_decision" && feedbackOutput.blockedDecision && (
        <div className="rounded border border-red-700 bg-red-950/50 px-3 py-2 space-y-2">
          <p className="text-xs font-semibold text-red-300 uppercase tracking-wide">Decision Required</p>
          <p className="text-sm text-text-primary">{feedbackOutput.blockedDecision.question}</p>
          <div className="space-y-1">
            {feedbackOutput.blockedDecision.options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-text-secondary">
                <span className="text-red-400">•</span>
                {opt}
              </div>
            ))}
          </div>
          <p className="text-xs text-text-secondary italic">Read-only — resolve via orchestration layer.</p>
        </div>
      )}

      {/* QA task */}
      {feedbackOutput.decision === "create_qa_task" && feedbackOutput.qaTask && (
        <div className="rounded border border-blue-700 bg-blue-950/50 px-3 py-2 space-y-1">
          <p className="text-xs font-semibold text-blue-300 uppercase tracking-wide">QA Task</p>
          <p className="text-sm text-text-primary">{feedbackOutput.qaTask.title}</p>
          <p className="text-xs font-mono text-text-secondary">ID: {feedbackOutput.qaTask.id}</p>
        </div>
      )}

      {/* Safety halt warning */}
      {feedbackOutput.decision === "halt_safety_violation" && (
        <div className="rounded border border-red-800 bg-red-950 px-3 py-3">
          <p className="text-sm font-bold text-red-200 text-center uppercase tracking-wider">
            Safety violation detected — all execution halted.
          </p>
          <p className="text-xs text-text-secondary text-center mt-1">
            Manual review required before resuming.
          </p>
        </div>
      )}

      {/* Original job reference */}
      <div className="pt-2 border-t border-border text-xs text-text-secondary flex items-center gap-3">
        <span>
          Original job: <span className="font-mono text-text-primary">{originalJob.id}</span>
        </span>
        <span>Agent: {originalJob.agentId}</span>
        <span>Risk: {originalJob.riskLevel}</span>
      </div>
    </div>
  );
}
