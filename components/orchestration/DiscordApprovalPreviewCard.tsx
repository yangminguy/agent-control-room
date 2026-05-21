"use client";

import { useState, useEffect } from "react";
import { type ApprovalRequest, type DispatchJob } from "@/lib/types";

// ── Helpers ───────────────────────────────────────────────

function getRemainingMs(timeoutAt?: string): number {
  if (!timeoutAt) return 0;
  return Math.max(0, new Date(timeoutAt).getTime() - Date.now());
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Timed out";
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

type MockAction = "idle" | "approved" | "rejected" | "deferred";

// ── Props ─────────────────────────────────────────────────

interface DiscordApprovalPreviewCardProps {
  approvalRequest: ApprovalRequest;
  dispatchJob: DispatchJob;
  discordMessage: string;
}

// ── Component ─────────────────────────────────────────────

export function DiscordApprovalPreviewCard({
  approvalRequest,
  dispatchJob,
  discordMessage,
}: DiscordApprovalPreviewCardProps) {
  const [remainingMs, setRemainingMs] = useState(() => getRemainingMs(dispatchJob.timeoutAt));
  const [mockAction, setMockAction] = useState<MockAction>("idle");

  useEffect(() => {
    if (!dispatchJob.timeoutAt) return;
    const interval = setInterval(() => {
      setRemainingMs(getRemainingMs(dispatchJob.timeoutAt));
    }, 1000);
    return () => clearInterval(interval);
  }, [dispatchJob.timeoutAt]);

  const isExpired = remainingMs <= 0 && !!dispatchJob.timeoutAt;
  const isRed = remainingMs < 60_000;
  const isYellow = remainingMs < 180_000 && !isRed;

  const countdownCls = isExpired
    ? "text-zinc-500"
    : isRed
    ? "text-red-400 font-bold"
    : isYellow
    ? "text-yellow-400 font-semibold"
    : "text-emerald-400";

  return (
    <div className="rounded-lg border border-border bg-surface-2 space-y-4 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4">
        <div>
          <p className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
            Discord Approval Preview
          </p>
          <p className="text-sm font-medium text-text-primary mt-0.5">
            Job: <span className="font-mono">{dispatchJob.id}</span>
          </p>
        </div>
        <span className="text-xs text-amber-400 border border-amber-700 bg-amber-950 px-2 py-1 rounded font-medium">
          Preview — not sent
        </span>
      </div>

      {/* Timeout countdown */}
      {dispatchJob.timeoutAt && (
        <div className="px-4">
          <div className="flex items-center gap-2 rounded border border-border bg-surface px-3 py-2">
            <span className="text-xs text-text-secondary">Timeout:</span>
            <span className={`text-sm font-mono ${countdownCls}`}>
              {isExpired ? "Timed out" : formatCountdown(remainingMs)}
            </span>
            {!isExpired && (
              <div className="ml-auto h-1.5 w-24 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isRed ? "bg-red-500" : isYellow ? "bg-yellow-500" : "bg-emerald-500"
                  }`}
                  style={{
                    width: dispatchJob.timeoutAt
                      ? `${Math.min(100, (remainingMs / (new Date(dispatchJob.timeoutAt).getTime() - new Date(dispatchJob.createdAt).getTime())) * 100)}%`
                      : "100%",
                  }}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Message preview */}
      <div className="px-4">
        <p className="text-xs font-semibold text-text-secondary mb-1.5">Message preview</p>
        <pre className="rounded border border-border bg-surface p-3 text-xs text-text-primary font-mono whitespace-pre-wrap overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
          {discordMessage}
        </pre>
      </div>

      {/* Approval request info */}
      <div className="px-4 grid grid-cols-2 gap-2 text-xs text-text-secondary">
        <div>
          <span className="font-medium text-text-primary">Request ID: </span>
          <span className="font-mono">{approvalRequest.id}</span>
        </div>
        <div>
          <span className="font-medium text-text-primary">Status: </span>
          <span>{approvalRequest.status}</span>
        </div>
        <div>
          <span className="font-medium text-text-primary">Created: </span>
          <span>{new Date(approvalRequest.createdAt).toLocaleString()}</span>
        </div>
        {approvalRequest.resolvedAt && (
          <div>
            <span className="font-medium text-text-primary">Resolved: </span>
            <span>{new Date(approvalRequest.resolvedAt).toLocaleString()}</span>
          </div>
        )}
      </div>

      {/* Mock action buttons */}
      <div className="px-4">
        <p className="text-xs text-text-secondary mb-2">Simulate response (UI only — no backend call):</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMockAction("approved")}
            className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
              mockAction === "approved"
                ? "border-emerald-600 bg-emerald-900 text-emerald-300"
                : "border-border bg-surface text-text-secondary hover:bg-surface-2"
            }`}
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() => setMockAction("rejected")}
            className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
              mockAction === "rejected"
                ? "border-red-700 bg-red-950 text-red-300"
                : "border-border bg-surface text-text-secondary hover:bg-surface-2"
            }`}
          >
            Reject
          </button>
          <button
            type="button"
            onClick={() => setMockAction("deferred")}
            className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
              mockAction === "deferred"
                ? "border-yellow-700 bg-yellow-950 text-yellow-300"
                : "border-border bg-surface text-text-secondary hover:bg-surface-2"
            }`}
          >
            Defer
          </button>
          {mockAction !== "idle" && (
            <button
              type="button"
              onClick={() => setMockAction("idle")}
              className="px-3 py-1.5 rounded border border-border bg-surface text-text-secondary text-xs hover:bg-surface-2 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
        {mockAction !== "idle" && (
          <p className="text-xs text-text-secondary mt-2">
            Mock action selected: <span className="font-semibold text-text-primary">{mockAction}</span>
            {" "}— UI state only, no request was sent.
          </p>
        )}
      </div>

      {/* Safety notice */}
      <div className="px-4 pb-4">
        <div className="rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-text-secondary">
          Message would be sent to Discord if{" "}
          <span className="font-mono text-text-primary">DISCORD_WEBHOOK_URL</span> is configured.
        </div>
      </div>
    </div>
  );
}
