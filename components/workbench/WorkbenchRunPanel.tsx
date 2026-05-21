"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Loader2,
  FileCode2,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { RunnerLogView } from "@/components/runner/RunnerLogView";
import type { PlanTask, CompletionJudgment, DiffAnalysisOutput } from "@/lib/types";

type Phase = "pre-execution" | "analyzing" | "analysis-done" | "analysis-error";

const JUDGMENT_CONFIG: Record<
  CompletionJudgment,
  { label: string; color: string }
> = {
  completed: { label: "완료 ✅", color: "text-emerald-600" },
  partial: { label: "부분 완료 🟡", color: "text-orange-500" },
  not_completed: { label: "미완료 ❌", color: "text-red-500" },
  pending: { label: "판정 전 —", color: "text-gray-400" },
};

interface WorkbenchRunPanelProps {
  task: PlanTask;
  planId: string;
  projectPath: string;
  approvalChecklist: {
    riskAck: boolean;
    forbiddenFiles: boolean;
    verifyCommands: boolean;
    finalApproval: boolean;
  };
}

const APPROVAL_STATEMENT = "I approve local execution for this exact task";

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function WorkbenchRunPanel({
  task,
  planId,
  projectPath,
  approvalChecklist,
}: WorkbenchRunPanelProps) {
  const [phase, setPhase] = useState<Phase>("pre-execution");
  const [analysis, setAnalysis] = useState<DiffAnalysisOutput | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [copiedNext, setCopiedNext] = useState(false);
  const [isPreparingNext, setIsPreparingNext] = useState(false);
  const [approvalToken, setApprovalToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);
  const [loopMessage, setLoopMessage] = useState<{
    text: string;
    type: "success" | "error" | "info";
  } | null>(null);

  // Request approval token on mount
  useEffect(() => {
    if (approvalToken || tokenError) return; // Already requested or failed

    const requestApprovalToken = async () => {
      try {
        const promptHash = await sha256(task.generatedPrompt || "");
        const res = await fetch("/api/workbench/approval", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            planId,
            taskId: task.id,
            agent: task.assignedAgent,
            cwd: projectPath,
            approvalChecklist,
            approvalStatement: APPROVAL_STATEMENT,
            promptHash,
          }),
        });

        const data = await res.json() as {
          success?: boolean;
          approvalToken?: string;
          error?: string;
        };

        if (!res.ok || !data.success) {
          throw new Error(data.error || "토큰 요청 실패");
        }

        if (data.approvalToken) {
          setApprovalToken(data.approvalToken);
        }
      } catch (err) {
        setTokenError(
          err instanceof Error ? err.message : "토큰 요청 중 오류 발생"
        );
      }
    };

    requestApprovalToken();
  }, [planId, task.id, task.assignedAgent, task.generatedPrompt, projectPath, approvalChecklist, approvalToken, tokenError]);

  const runAnalyzer = useCallback(async () => {
    setPhase("analyzing");
    setAnalyzeError(null);
    setAnalysis(null);

    try {
      const res = await fetch("/api/analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, taskId: task.id, cwd: projectPath }),
      });
      const data = await res.json() as {
        analysis?: DiffAnalysisOutput;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || "Analyzer request failed.");
      }

      if (data.analysis) {
        setAnalysis(data.analysis);
        setPhase("analysis-done");
      } else {
        throw new Error("분석 결과가 없습니다.");
      }
    } catch (err) {
      setAnalyzeError(err instanceof Error ? err.message : String(err));
      setPhase("analysis-error");
    }
  }, [planId, task.id, projectPath]);

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedNext(true);
    setTimeout(() => setCopiedNext(false), 2000);
  };

  const handleLoopContinue = async () => {
    if (!analysis?.nextPrompt) return;

    setIsPreparingNext(true);
    setLoopMessage(null);

    try {
      const response = await fetch("/api/loop-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          taskId: task.id,
          nextPrompt: analysis.nextPrompt,
        }),
      });
      const data = await response.json() as {
        targetTask?: PlanTask | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to prepare next task.");
      }

      setLoopMessage({
        text: `다음 작업 준비 완료. 실행 계획으로 돌아가서 다음 작업을 확인하세요.`,
        type: "success",
      });
    } catch (error) {
      setLoopMessage({
        text: `다음 작업 준비 실패: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      });
    } finally {
      setIsPreparingNext(false);
    }
  };

  const handleRunnerComplete = (status: "done" | "failed") => {
    if (status === "done") {
      runAnalyzer();
    } else {
      setPhase("analysis-error");
      setAnalyzeError("에이전트 실행에 실패했습니다.");
    }
  };

  return (
    <div className="space-y-4">
      {/* Pre-execution banner */}
      {phase === "pre-execution" && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-amber-700">
              로컬 머신에서 실행됩니다
            </p>
            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
              <li>Claude Code 도구가 실행됩니다</li>
              <li>프로젝트 파일이 수정될 수 있습니다</li>
              <li>실시간 로그를 확인할 수 있습니다</li>
              <li>Claude Code에 이미 로그인되어 있어야 합니다</li>
              <li>기본적으로 유료 API를 호출하지 않습니다</li>
            </ul>
          </div>
        </div>
      )}

      {/* Token error */}
      {tokenError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              승인 토큰 요청 실패
            </p>
            <p className="text-xs text-red-600 mt-1">
              {tokenError}. 페이지를 새로고침하고 다시 시도하세요.
            </p>
          </div>
        </div>
      )}

      {/* RunnerLogView (visible during pre-execution and after) */}
      {task.assignedAgent === "claude-code" && approvalToken ? (
        <div>
          <RunnerLogView
            planId={planId}
            taskId={task.id}
            prompt={task.generatedPrompt || ""}
            agent={task.assignedAgent}
            projectPath={projectPath}
            approvalToken={approvalToken}
            onComplete={(status) => handleRunnerComplete(status)}
          />
        </div>
      ) : task.assignedAgent !== "claude-code" ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-red-700">
              지원하지 않는 에이전트
            </p>
            <p className="text-xs text-red-600 mt-1">
              현재는 Claude Code만 실행 가능합니다. 할당된 에이전트: {task.assignedAgent}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          승인 토큰을 요청하는 중입니다...
        </div>
      )}

      {/* Analyzing state */}
      {phase === "analyzing" && (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          실행 결과를 분석하는 중입니다.
        </div>
      )}

      {/* Analysis error state */}
      {phase === "analysis-error" && analyzeError && (
        <div className="space-y-3 rounded-lg border border-red-200 bg-red-50 p-4">
          <div>
            <p className="text-sm font-semibold text-red-700 mb-2">실행이 실패했습니다</p>
            <p className="text-xs text-red-600 mb-3">{analyzeError}</p>
          </div>

          <div className="rounded-lg border border-red-100 bg-white p-3 text-xs space-y-2">
            <p className="font-semibold text-gray-700">다음 단계:</p>
            <ol className="list-decimal list-inside space-y-1 text-gray-600">
              <li>위의 로그를 확인하여 오류의 원인을 파악하세요</li>
              <li>필요하면 Claude Code를 직접 실행하여 문제를 해결하세요</li>
              <li>해결 후 &apos;다시 분석&apos; 버튼을 클릭하거나 페이지를 새로고침하세요</li>
              <li>여전히 실패하면 Codex 또는 Claude Code 명시적 실행을 고려하세요</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runAnalyzer()}
              className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3" />
              다시 분석
            </button>
            <Link
              href="/plan"
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              계획으로 돌아가기
            </Link>
          </div>
        </div>
      )}

      {/* Analysis done state */}
      {phase === "analysis-done" && analysis && (
        <div className="space-y-4">
          {/* Result summary card */}
          <div className={`rounded-lg border p-4 space-y-3 ${
            analysis.completionJudgment === 'completed'
              ? 'border-emerald-200 bg-emerald-50'
              : analysis.completionJudgment === 'partial'
              ? 'border-amber-200 bg-amber-50'
              : 'border-red-200 bg-red-50'
          }`}>
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                작업 결과
              </span>
              <p
                className={`text-lg font-semibold ${
                  JUDGMENT_CONFIG[analysis.completionJudgment].color
                }`}
              >
                {JUDGMENT_CONFIG[analysis.completionJudgment].label}
              </p>
            </div>

            {/* Diff summary */}
            {analysis.diffSummary && (
              <div className="text-sm leading-relaxed">
                <p className={
                  analysis.completionJudgment === 'completed' ? 'text-emerald-700'
                  : analysis.completionJudgment === 'partial' ? 'text-amber-700'
                  : 'text-red-700'
                }>
                  {analysis.diffSummary}
                </p>
              </div>
            )}
          </div>

          {/* Changed files */}
          {analysis.changedFiles && analysis.changedFiles.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                변경된 파일 ({analysis.changedFiles.length}개)
              </span>
              <ul className="space-y-1 max-h-32 overflow-y-auto">
                {analysis.changedFiles.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-1.5 text-xs text-gray-600"
                  >
                    <FileCode2 className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="font-mono truncate">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Next action based on completion */}
          {analysis.completionJudgment === 'completed' ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-emerald-700">작업이 완료되었습니다 ✅</p>
              <div className="text-xs text-emerald-700 space-y-2">
                <p><strong>다음 단계:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>변경된 파일들을 검토하세요</li>
                  <li>필요하면 세션 리포트를 작성하세요</li>
                  <li>실행 계획에서 다음 작업을 선택하세요</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-700">부분 완료 또는 미완료</p>
              <div className="text-xs text-amber-700 space-y-2">
                <p><strong>옵션:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li>동일한 에이전트로 다시 실행 (다음 프롬프트로)</li>
                  <li>다른 에이전트에게 핸드오프 (Codex, Claude Code 등)</li>
                  <li>수동으로 변경 후 재시도</li>
                </ul>
              </div>
            </div>
          )}

          {/* Next prompt preview */}
          {analysis.nextPrompt && (
            <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                다음 작업 프롬프트
              </span>
              <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded border border-border bg-surface p-3 text-xs leading-relaxed text-text-secondary">
                {analysis.nextPrompt}
              </pre>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            {analysis.nextPrompt && (
              <button
                onClick={() => copyToClipboard(analysis.nextPrompt)}
                className="inline-flex items-center gap-1 rounded bg-pink-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-soft transition-colors"
              >
                {copiedNext ? (
                  <Check className="h-3.5 w-3.5 text-emerald-300" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
                {copiedNext ? "복사됨" : "다음 프롬프트 복사"}
              </button>
            )}

            <Link
              href="/hermes-packets"
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              핸드오프 초안 준비
            </Link>

            {(analysis.completionJudgment === "partial" ||
              analysis.completionJudgment === "not_completed") && (
              <button
                onClick={handleLoopContinue}
                disabled={isPreparingNext}
                className="inline-flex items-center gap-1 rounded border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isPreparingNext ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
                {isPreparingNext ? "준비 중..." : "다음 작업 준비"}
              </button>
            )}

            <Link
              href="/plan"
              className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              <ChevronRight className="h-3.5 w-3.5" />
              실행 계획으로 돌아가기
            </Link>
          </div>

          {/* Loop message banner */}
          {loopMessage && (
            <div
              className={`rounded border p-3 text-xs flex items-center justify-between gap-2 ${
                loopMessage.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : loopMessage.type === "error"
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-600"
              }`}
            >
              <span>{loopMessage.text}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
