"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Loader2,
  Copy,
  Check,
  ChevronRight,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { RunnerLogView } from "@/components/runner/RunnerLogView";
import { ExecutionResultCard } from "@/components/runner/ExecutionResultCard";
import { ExecutionDecisionPanel } from "@/components/workbench/ExecutionDecisionPanel";
import type { ExecutionResultSummary, ExecutionDecision } from "@/components/runner/ExecutionResultCard";
import type { PlanTask, CompletionJudgment, DiffAnalysisOutput, DecisionClassification } from "@/lib/types";

type Phase = "pre-execution" | "analyzing" | "analysis-done" | "analysis-error";

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

function judgmentToDecision(judgment: CompletionJudgment): ExecutionDecision {
  switch (judgment) {
    case "completed":
      return "pass";
    case "partial":
      return "retry_needed";
    case "not_completed":
      return "fail";
    default:
      return "retry_needed";
  }
}

function buildResultSummary(analysis: DiffAnalysisOutput): ExecutionResultSummary {
  const nextAction =
    analysis.completionJudgment === "completed"
      ? "변경된 파일들을 검토하고 실행 계획에서 다음 작업을 선택하세요."
      : "동일한 에이전트로 다시 시도하거나 다른 에이전트에게 넘기세요.";

  return {
    decision: judgmentToDecision(analysis.completionJudgment),
    logSnippet: analysis.diffSummary,
    changedFiles: analysis.changedFiles,
    nextAction,
  };
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
  const [decisionResult, setDecisionResult] = useState<DecisionClassification | null>(null);
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
    if (approvalToken || tokenError) return;

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
          throw new Error(data.error || "일회성 승인권 요청 실패");
        }

        if (data.approvalToken) {
          setApprovalToken(data.approvalToken);
        }
      } catch (err) {
        setTokenError(
          err instanceof Error ? err.message : "일회성 승인권 요청 중 오류 발생"
        );
      }
    };

    requestApprovalToken();
  }, [planId, task.id, task.assignedAgent, task.generatedPrompt, projectPath, approvalChecklist, approvalToken, tokenError]);

  const runOrchestration = useCallback(async () => {
    setPhase("analyzing");
    setAnalyzeError(null);
    setAnalysis(null);
    setDecisionResult(null);

    // Step 1: Try the orchestration route for decision classification.
    try {
      const orchRes = await fetch("/api/orchestration/execution-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, taskId: task.id }),
      });

      if (orchRes.ok) {
        const orchData = await orchRes.json() as {
          decision?: DecisionClassification;
          summary?: DiffAnalysisOutput;
          error?: string;
        };

        if (orchData.decision) {
          setDecisionResult(orchData.decision);
        }

        // If the orchestration route also returns a summary, use it directly.
        if (orchData.summary) {
          setAnalysis(orchData.summary);
          setPhase("analysis-done");
          return;
        }
      }
      // Orchestration route available but no summary — fall through to analyzer.
    } catch {
      // Orchestration route unavailable — fall through to analyzer.
    }

    // Step 2: Fallback to /api/analyzer for the diff-based analysis display.
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
        throw new Error(data.error || "분석 요청이 실패했습니다.");
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
        throw new Error(data.error || "다음 작업 준비에 실패했습니다.");
      }

      setLoopMessage({
        text: "다음 작업 준비 완료. 실행 계획으로 돌아가서 다음 작업을 확인하세요.",
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
      runOrchestration();
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
              <li>{task.assignedAgent} 로컬 도구가 실행됩니다</li>
              <li>프로젝트 파일이 수정될 수 있습니다</li>
              <li>실시간 로그를 확인할 수 있습니다</li>
              <li>해당 로컬 도구에 이미 로그인되어 있어야 합니다</li>
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
              일회성 승인권 요청 실패
            </p>
            <p className="text-xs text-red-600 mt-1">
              {tokenError}. 페이지를 새로고침하고 다시 시도하세요.
            </p>
          </div>
        </div>
      )}

      {/* RunnerLogView */}
      {approvalToken ? (
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
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          일회성 승인권을 요청하는 중입니다...
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
              <li>해결 후 아래의 &apos;다시 시도&apos; 버튼을 클릭하거나 페이지를 새로고침하세요</li>
              <li>여전히 실패하면 Codex 또는 Claude Code 명시적 실행을 고려하세요</li>
            </ol>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => runOrchestration()}
              className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-3 w-3" />
              다시 시도
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

      {/* Analysis done — ExecutionResultCard + Decision Panel */}
      {phase === "analysis-done" && analysis && (
        <div className="space-y-4">
          <ExecutionResultCard result={buildResultSummary(analysis)} />

          {/* Auto decision classification */}
          {decisionResult && (
            <div className="space-y-3">
              <h3 className="text-base font-semibold text-gray-900">자동 판단 결과</h3>
              <ExecutionDecisionPanel
                decision={decisionResult.decision}
                reason={decisionResult.reason}
                confidence={decisionResult.confidence}
                nextAction={decisionResult.nextAction}
              />
            </div>
          )}

          {/* Next prompt preview */}
          {analysis.nextPrompt && (
            <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                다음 추천 작업
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
                {copiedNext ? "복사됨" : "다음 추천 작업 복사"}
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
                {isPreparingNext ? "준비 중..." : "계속 진행"}
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
