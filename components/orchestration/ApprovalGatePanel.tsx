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
  isMock?: boolean;
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
  isMock = false,
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
      {/* 위험한 작업 감지 경고 */}
      {hasDestructivePatterns && (
        <div className="mb-6 p-4 bg-red-50 border border-red-300 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="text-red-600 font-bold text-lg">⚠️</div>
            <div>
              <h3 className="text-red-700 font-semibold mb-2">위험한 작업이 감지되었습니다</h3>
              <p className="text-red-600 text-sm mb-2">
                {destructivePatternExplanation(approval.destructivePatterns || [])}
              </p>
              <p className="text-red-700 text-xs font-semibold">
                이 작업에는 되돌릴 수 없는 명령이 포함되어 있습니다. 결과를 완전히 이해한 경우에만 승인하세요.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 승인 요청 사항 */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">승인 요청 사항</h2>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-semibold text-gray-600">상태</label>
            <p className="text-sm text-gray-900 capitalize">{approval.status === 'pending' ? '대기 중' : approval.status}</p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-600">신청 시간</label>
            <p className="text-sm text-gray-900">{new Date(approval.createdAt).toLocaleString('ko-KR')}</p>
          </div>
        </div>
      </div>

      {/* 승인 의견 입력 */}
      <div className="mb-6">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          승인 의견 (선택사항)
        </label>
        <textarea
          value={approverNote}
          onChange={(e) => setApproverNote(e.target.value)}
          placeholder="승인 또는 거절 이유를 작성하세요..."
          className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={3}
          disabled={isLoading || actionInProgress !== null}
        />
      </div>

      {/* 승인/거절 버튼 */}
      <div className="flex gap-3 justify-end">
        <button
          onClick={handleReject}
          disabled={isLoading || actionInProgress !== null}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed ${
            isMock
              ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-600 disabled:bg-zinc-400"
              : "bg-red-600 text-white hover:bg-red-700 disabled:bg-gray-400"
          }`}
        >
          {actionInProgress === "reject" ? "거절 처리 중..." : (isMock ? "[개발자용] 모의 거절" : "거절하고 중단")}
        </button>
        <button
          onClick={handleApprove}
          disabled={isLoading || actionInProgress !== null}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed ${
            isMock
              ? "bg-zinc-800 text-zinc-100 hover:bg-zinc-700 border border-zinc-600 disabled:bg-zinc-400"
              : "bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
          }`}
        >
          {actionInProgress === "approve" ? "승인 처리 중..." : (isMock ? "[개발자용] 모의 승인" : "승인하고 계속 진행")}
        </button>
      </div>

      {/* 이미 처리된 승인 */}
      {approval.status !== "pending" && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-300 rounded-lg text-sm text-blue-700">
          <strong>알림:</strong> 이 승인 요청은 이미 &quot;{approval.status === 'approved' ? '승인됨' : '거절됨'}&quot;으로 처리되었습니다
          {approval.resolvedAt && ` (${new Date(approval.resolvedAt).toLocaleString('ko-KR')})`}.
          {approval.approverNote && (
            <>
              <br />
              <strong>의견:</strong> {approval.approverNote}
            </>
          )}
        </div>
      )}
    </div>
  );
}
