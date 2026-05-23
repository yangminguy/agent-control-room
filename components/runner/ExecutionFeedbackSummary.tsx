"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, FileCode2 } from "lucide-react";
import type { ExecutionResultSummary } from "./ExecutionResultCard";

const SUCCESS_DECISIONS = new Set(["pass"]);

const VALIDATION_LABEL: Record<string, string> = {
  typecheck: "타입 검사",
  lint: "린트",
  test: "테스트",
  build: "빌드",
};

const VALIDATION_STATUS_CONFIG = {
  pass: { label: "통과", className: "text-emerald-600" },
  fail: { label: "실패", className: "text-red-600" },
  skipped: { label: "건너뜀", className: "text-gray-400" },
};

interface ExecutionFeedbackSummaryProps {
  result: ExecutionResultSummary;
  fullLog?: string;
}

export function ExecutionFeedbackSummary({ result, fullLog }: ExecutionFeedbackSummaryProps) {
  const [showDetail, setShowDetail] = useState(false);

  const isSuccess = SUCCESS_DECISIONS.has(result.decision);
  const statusLabel = isSuccess ? "성공" : "실패";
  const statusClass = isSuccess
    ? "text-emerald-700 bg-emerald-50 border-emerald-200"
    : "text-red-700 bg-red-50 border-red-200";

  return (
    <div className="rounded-lg border border-gray-200 bg-white space-y-0 overflow-hidden">
      {/* Summary mode (always visible) */}
      <div className="p-4 space-y-3">
        {/* Success/failure headline */}
        <div className={`inline-flex items-center gap-1.5 rounded border px-2.5 py-1 text-xs font-semibold ${statusClass}`}>
          {statusLabel}
        </div>

        {/* Changed files */}
        {result.changedFiles && result.changedFiles.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              변경된 파일 내용
            </span>
            <ul className="space-y-1 max-h-24 overflow-y-auto">
              {result.changedFiles.map((f) => (
                <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <FileCode2 className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="font-mono truncate">{f}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Validation results */}
        {result.validation && (
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              검증 결과
            </span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              {(["typecheck", "lint", "test", "build"] as const).map((key) => {
                const status = result.validation?.[key];
                if (!status) return null;
                const cfg = VALIDATION_STATUS_CONFIG[status];
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{VALIDATION_LABEL[key]}</span>
                    <span className={`font-medium ${cfg.className}`}>{cfg.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Next action */}
        {result.nextAction && (
          <div className="space-y-1">
            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
              다음 작업
            </span>
            <p className="text-sm text-gray-800">{result.nextAction}</p>
          </div>
        )}
      </div>

      {/* Detail log toggle */}
      {fullLog && (
        <>
          <button
            onClick={() => setShowDetail((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 border-t border-gray-200 hover:bg-gray-100 transition-colors"
          >
            <span>상세 로그 {showDetail ? "숨기기" : "보기"}</span>
            {showDetail ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          {showDetail && (
            <div className="border-t border-gray-200 bg-black p-4 font-mono text-xs">
              <pre className="max-h-64 overflow-y-auto whitespace-pre-wrap break-words text-green-400 leading-relaxed">
                {fullLog}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  );
}
