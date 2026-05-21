"use client";

import React, { useState } from "react";
import { Copy, Check, AlertTriangle, ShieldAlert, Info } from "lucide-react";
import type { ExecutionMonitorSummary } from "@/lib/hermes/monitoring-layer";

interface HermesMonitorPanelProps {
  summary: ExecutionMonitorSummary;
}

function StatusIcon({ status }: { status: "done" | "failed" | "partial" }) {
  if (status === "done") return <span className="text-green-600">✅</span>;
  if (status === "partial") return <span className="text-amber-500">⏳</span>;
  return <span className="text-red-500">❌</span>;
}

export function HermesMonitorPanel({ summary }: HermesMonitorPanelProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopyAction = async (text: string, index: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  return (
    <div className="space-y-4">
      {/* Safety banner */}
      <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <p className="text-sm font-semibold text-amber-800">
            Hermes는 코드를 실행하지 않습니다.
          </p>
          <p className="text-xs text-amber-700 mt-0.5">
            모니터링 및 요약만 제공합니다. 실행 권한 없음.
          </p>
        </div>
      </div>

      {/* Recent executions */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">최근 실행 목록</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {summary.recentExecutions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">실행 기록 없음.</li>
          ) : (
            summary.recentExecutions.map((exec) => (
              <li
                key={exec.taskId}
                className="flex items-center gap-3 px-4 py-3"
              >
                <StatusIcon status={exec.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {exec.taskTitle}
                  </p>
                  <p className="text-xs text-slate-500">
                    {exec.agent} &mdash;{" "}
                    {new Date(exec.completedAt).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                    exec.status === "done"
                      ? "bg-green-100 text-green-700"
                      : exec.status === "partial"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {exec.status}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Blocked issues */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">차단 이슈</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {summary.blockedIssues.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">차단 이슈 없음.</li>
          ) : (
            summary.blockedIssues.map((issue, i) => (
              <li key={i} className="px-4 py-3">
                <div className="flex items-start gap-2">
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {issue.reason}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      차단 시작:{" "}
                      {new Date(issue.blockedSince).toLocaleString()}
                    </p>
                    <span className="mt-1 inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                      권장: {issue.requiredAction}
                    </span>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Risk signals */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">리스크 신호</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {summary.riskSignals.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">리스크 신호 없음.</li>
          ) : (
            summary.riskSignals.map((signal, i) => (
              <li key={i} className="flex items-center gap-2 px-4 py-3">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {signal}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Recommended actions */}
      <section className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-700">권장 행동</h2>
        </div>
        <ul className="divide-y divide-slate-100">
          {summary.recommendedActions.length === 0 ? (
            <li className="px-4 py-3 text-sm text-slate-500">권장 행동 없음.</li>
          ) : (
            summary.recommendedActions.map((action, i) => (
              <li
                key={i}
                className="flex items-center gap-3 px-4 py-3"
              >
                <Info className="h-4 w-4 shrink-0 text-indigo-400" />
                <span className="flex-1 text-sm text-slate-700">{action}</span>
                <button
                  onClick={() => handleCopyAction(action, i)}
                  className="shrink-0 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1"
                  title="클립보드에 복사"
                >
                  {copiedIndex === i ? (
                    <>
                      <Check className="h-3 w-3 text-green-600" />
                      복사됨
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3" />
                      복사
                    </>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      </section>

      {/* Last updated footer */}
      <p className="text-right text-xs text-slate-400">
        마지막 업데이트: {new Date(summary.lastUpdated).toLocaleString()}
      </p>
    </div>
  );
}
