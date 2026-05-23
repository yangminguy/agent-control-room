"use client";

import { FileCode2, CheckCircle2, XCircle, AlertCircle, RotateCcw, Ban, GitFork } from "lucide-react";

export type ExecutionDecision =
  | "pass"
  | "fail"
  | "qa_needed"
  | "retry_needed"
  | "blocked"
  | "drift_detected";

export type ValidationResult = {
  typecheck?: "pass" | "fail" | "skipped";
  lint?: "pass" | "fail" | "skipped";
  test?: "pass" | "fail" | "skipped";
  build?: "pass" | "fail" | "skipped";
};

export type ExecutionResultSummary = {
  decision: ExecutionDecision;
  logSnippet?: string;
  changedFiles?: string[];
  validation?: ValidationResult;
  nextAction?: string;
};

const DECISION_CONFIG: Record<
  ExecutionDecision,
  { label: string; icon: React.ReactNode; borderColor: string; bgColor: string; textColor: string }
> = {
  pass: {
    label: "통과",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
    borderColor: "border-emerald-200",
    bgColor: "bg-emerald-50",
    textColor: "text-emerald-700",
  },
  fail: {
    label: "실패",
    icon: <XCircle className="w-5 h-5 text-red-600" />,
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
    textColor: "text-red-700",
  },
  qa_needed: {
    label: "QA 필요",
    icon: <AlertCircle className="w-5 h-5 text-blue-600" />,
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  retry_needed: {
    label: "다시 시도",
    icon: <RotateCcw className="w-5 h-5 text-amber-600" />,
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    textColor: "text-amber-700",
  },
  blocked: {
    label: "막힘",
    icon: <Ban className="w-5 h-5 text-orange-600" />,
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
    textColor: "text-orange-700",
  },
  drift_detected: {
    label: "방향 이탈 감지",
    icon: <GitFork className="w-5 h-5 text-purple-600" />,
    borderColor: "border-purple-200",
    bgColor: "bg-purple-50",
    textColor: "text-purple-700",
  },
};

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

interface ExecutionResultCardProps {
  result: ExecutionResultSummary;
}

export function ExecutionResultCard({ result }: ExecutionResultCardProps) {
  const config = DECISION_CONFIG[result.decision];
  const logPreview = result.logSnippet?.slice(0, 200);

  return (
    <div className="space-y-3">
      {/* Header */}
      <h3 className="text-base font-semibold text-gray-900">실행 결과 요약</h3>

      {/* Status badge */}
      <div className={`flex items-center gap-2 rounded-lg border ${config.borderColor} ${config.bgColor} px-4 py-3`}>
        {config.icon}
        <span className={`text-sm font-semibold ${config.textColor}`}>
          {config.label}
        </span>
      </div>

      {/* Log snippet */}
      {logPreview && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-1">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            실행 로그
          </span>
          <p className="text-xs text-gray-700 font-mono whitespace-pre-wrap leading-relaxed">
            {logPreview}
            {(result.logSnippet?.length ?? 0) > 200 && (
              <span className="text-gray-400"> …</span>
            )}
          </p>
        </div>
      )}

      {/* Changed files */}
      {result.changedFiles && result.changedFiles.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            변경된 파일 ({result.changedFiles.length}개)
          </span>
          <ul className="space-y-1 max-h-28 overflow-y-auto">
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
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 space-y-2">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            검증 결과
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {(["typecheck", "lint", "test", "build"] as const).map((key) => {
              const status = result.validation?.[key];
              if (!status) return null;
              const statusCfg = VALIDATION_STATUS_CONFIG[status];
              return (
                <div key={key} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">{VALIDATION_LABEL[key]}</span>
                  <span className={`font-medium ${statusCfg.className}`}>
                    {statusCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Next recommended action */}
      {result.nextAction && (
        <div className="rounded-lg border border-gray-200 bg-white p-3 space-y-1">
          <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            다음 추천 작업
          </span>
          <p className="text-sm text-gray-800">{result.nextAction}</p>
        </div>
      )}
    </div>
  );
}
