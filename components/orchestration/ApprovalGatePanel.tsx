"use client";

import React, { useState } from "react";
import type { ApprovalRequest } from "@/lib/types";
import { destructivePatternExplanation } from "@/lib/dispatch/destructive-pattern-detector";

export interface ApprovalGatePanelProps {
  approval: ApprovalRequest;
  jobId: string;
  onApprove: (jobId: string, approverNote?: string) => Promise<void>;
  onReject: (jobId: string, approverNote?: string) => Promise<void>;
  isLoading?: boolean;
}

/**
 * T-AUTO-010: Approval Gate Panel
 * Displays approval request details with destructive pattern warnings.
 * Allows user to approve or reject with optional notes.
 */
export function ApprovalGatePanel({
  approval,
  jobId,
  onApprove,
  onReject,
  isLoading = false,
}: ApprovalGatePanelProps) {
  const [approverNote, setApproverNote] = useState<string>("");
  const [actionInProgress, setActionInProgress] = useState<"approve" | "reject" | null>(null);

  const hasDestructivePatterns =
    approval.destructivePatterns && approval.destructivePatterns.length > 0;

  const handleApprove = async () => {
    setActionInProgress("approve");
    try {
      await onApprove(jobId, approverNote || undefined);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReject = async () => {
    setActionInProgress("reject");
    try {
      await onReject(jobId, approverNote || undefined);
    } finally {
      setActionInProgress(null);
    }
  };

  return (
    <div className="border border-gray-300 rounded-lg p-6 bg-white shadow-md">
      {/* Destructive Patterns Warning */}
      {hasDestructivePatterns && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-red-600 font-bold text-lg">⚠️</div>
            <div>
              <h3 className="text-red-700 font-semibold mb-2">Destructive Patterns Detected</h3>
              <p className="text-red-600 text-sm mb-2">
                {destructivePatternExplanation(approval.destructivePatterns || [])}
              </p>
              <p className="text-red-700 text-xs font-semibold">
                This job contains commands that CANNOT be undone. Approve only if you are absolutely certain of the consequences.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Approval Request Details */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Approval Request</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-600">Approval ID</label>
            <p className="text-sm text-gray-900 font-mono">{approval.id}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Job ID</label>
            <p className="text-sm text-gray-900 font-mono">{jobId}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Status</label>
            <p className="text-sm text-gray-900 capitalize">{approval.status}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">Created At</label>
            <p className="text-sm text-gray-900">{new Date(approval.createdAt).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Approver Note Input */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Approver Note (Optional)
        </label>
        <textarea
          value={approverNote}
          onChange={(e) => setApproverNote(e.target.value)}
          placeholder="Provide a reason for your approval or rejection..."
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={isLoading || actionInProgress !== null}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReject}
          disabled={isLoading || actionInProgress !== null}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {actionInProgress === "reject" ? "Rejecting..." : "Reject"}
        </button>
        <button
          onClick={handleApprove}
          disabled={isLoading || actionInProgress !== null}
          className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition"
        >
          {actionInProgress === "approve" ? "Approving..." : "Approve"}
        </button>
      </div>

      {/* Already Resolved Notice */}
      {approval.status !== "pending" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-700">
          <strong>Note:</strong> This approval has already been resolved as &quot;{approval.status}&quot;
          {approval.resolvedAt && ` on ${new Date(approval.resolvedAt).toLocaleString()}`}.
          {approval.approverNote && (
            <>
              <br />
              <strong>Reason:</strong> {approval.approverNote}
            </>
          )}
        </div>
      )}
    </div>
  );
}
