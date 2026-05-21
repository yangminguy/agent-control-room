"use client";

import { useState } from "react";
import { AutoDecisionLog } from "@/lib/types";
import { CheckCircle, XCircle, HelpCircle, Loader2 } from "lucide-react";

type DecisionState = "idle" | "pending" | "completed" | "error";

export interface AutoDecisionPanelProps {
  validationId: string;
  onDecision?: (decision: AutoDecisionLog) => void;
}

export function AutoDecisionPanel({ validationId, onDecision }: AutoDecisionPanelProps) {
  const [state, setstate] = useState<DecisionState>("idle");
  const [decision, setDecision] = useState<AutoDecisionLog | null>(null);
  const [error, setError] = useState<string>("");
  const [approvalNote, setApprovalNote] = useState<string>("");

  const handleAutoDecision = async () => {
    setstate("pending");
    setError("");

    try {
      const response = await fetch("/api/orchestration/auto-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          validationId,
          autoApproveThreshold: 75,
          requireUserConfirmation: true,
        }),
      });

      if (!response.ok) {
        throw new Error(`Decision failed: ${response.statusText}`);
      }

      const result = await response.json();
      setDecision(result.decisionLog);
      setstate("completed");
      onDecision?.(result.decisionLog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setstate("error");
    }
  };

  const handleUserApproval = async (approved: boolean) => {
    if (!decision) return;

    try {
      const response = await fetch("/api/orchestration/auto-decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decisionId: decision.id,
          approved,
          note: approvalNote || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Approval failed");
      }

      const result = await response.json();
      setDecision(result.decisionLog);
      setApprovalNote("");
      onDecision?.(result.decisionLog);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  const getDecisionIcon = (decision: string) => {
    if (decision === "auto_approved") {
      return <CheckCircle size={24} className="text-green-600" />;
    } else if (decision === "auto_rejected") {
      return <XCircle size={24} className="text-red-600" />;
    } else {
      return <HelpCircle size={24} className="text-blue-600" />;
    }
  };

  const getDecisionColor = (decision: string) => {
    if (decision === "auto_approved") return "bg-green-50 border-green-200";
    if (decision === "auto_rejected") return "bg-red-50 border-red-200";
    return "bg-blue-50 border-blue-200";
  };

  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Auto-Decision Engine</h3>
        <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">
          Hermes
        </span>
      </div>

      {state === "idle" && (
        <button
          onClick={handleAutoDecision}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
        >
          Request Auto Decision
        </button>
      )}

      {state === "pending" && (
        <div className="text-center py-6">
          <Loader2 size={24} className="mx-auto mb-2 text-blue-600 animate-spin" />
          <p className="text-sm text-slate-600">Processing decision...</p>
        </div>
      )}

      {state === "error" && (
        <div className="bg-red-50 border border-red-200 rounded p-3">
          <p className="text-sm font-medium text-red-900">Error</p>
          <p className="text-xs text-red-700 mt-1">{error}</p>
        </div>
      )}

      {state === "completed" && decision && (
        <div className="space-y-4">
          {/* Decision Card */}
          <div className={`p-4 rounded-lg border ${getDecisionColor(decision.decision)}`}>
            <div className="flex items-start gap-3">
              {getDecisionIcon(decision.decision)}
              <div className="flex-1">
                <p className="font-semibold capitalize text-lg">
                  {decision.decision.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  Decided by: {decision.decisionMaker || "system"}
                </p>
              </div>
            </div>
          </div>

          {/* User Confirmation Needed */}
          {decision.decision === "user_confirmation_required" &&
            decision.userApproval === undefined && (
              <div className="space-y-3 bg-white p-4 rounded border">
                <p className="text-sm font-medium">User Confirmation Required</p>
                <textarea
                  placeholder="Optional: Add approval notes..."
                  value={approvalNote}
                  onChange={(e) => setApprovalNote(e.target.value)}
                  className="w-full text-xs p-2 border rounded bg-slate-50"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleUserApproval(true)}
                    className="flex-1 py-2 px-3 bg-green-600 text-white text-sm rounded hover:bg-green-700 font-medium"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleUserApproval(false)}
                    className="flex-1 py-2 px-3 bg-red-600 text-white text-sm rounded hover:bg-red-700 font-medium"
                  >
                    Reject
                  </button>
                </div>
              </div>
            )}

          {/* User Approval Recorded */}
          {decision.userApproval !== undefined && decision.approvalTimestamp && (
            <div className={`p-3 rounded border ${
              decision.userApproval ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
            }`}>
              <p className="text-xs font-medium mb-1">
                {decision.userApproval ? "✓ Approved" : "✗ Rejected"} by User
              </p>
              {decision.userNote && (
                <p className="text-xs text-slate-700 bg-white p-1 rounded mt-1">
                  Note: {decision.userNote}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1">
                {new Date(decision.approvalTimestamp).toLocaleString()}
              </p>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-slate-500 border-t pt-2">
            <p>Decision ID: {decision.id.slice(0, 12)}...</p>
            <p>Timestamp: {new Date(decision.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
