"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bot,
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Loader2,
  GitBranch,
  FileCode2,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  Eye,
  EyeOff,
  RefreshCw,
  ChevronRight,
  Lock,
} from "lucide-react";
import type { PlanTask, PlanTaskStatus, AgentType, CompletionJudgment, DiffAnalysisOutput } from "@/lib/types";

const STATUS_CONFIG: Record<
  PlanTaskStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  planned: {
    label: "계획됨",
    color: "text-gray-400",
    bg: "bg-surface-2",
    icon: <span className="text-4xl">🟤</span>,
  },
  ready: {
    label: "준비됨",
    color: "text-pink-primary",
    bg: "bg-pink-primary/10",
    icon: <span className="text-4xl">🟡</span>,
  },
  running: {
    label: "실행중",
    color: "text-sky-400",
    bg: "bg-sky-500/10",
    icon: <span className="text-4xl">🔵</span>,
  },
  done: {
    label: "완료",
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
    icon: <span className="text-4xl">✅</span>,
  },
  partial: {
    label: "부분완료",
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    icon: <span className="text-4xl">⚠️</span>,
  },
  blocked: {
    label: "블로킹됨",
    color: "text-red-400",
    bg: "bg-red-500/10",
    icon: <span className="text-4xl">🚫</span>,
  },
  needs_review: {
    label: "검토필요",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
    icon: <span className="text-4xl">👁️</span>,
  },
};

const AGENT_COLOR: Record<AgentType, string> = {
  "claude-code": "bg-violet-100 text-violet-700",
  codex: "bg-sky-100 text-sky-700",
  antigravity: "bg-fuchsia-100 text-fuchsia-700",
};

const JUDGMENT_CONFIG: Record<
  CompletionJudgment,
  { label: string; color: string }
> = {
  completed: { label: "완료 ✅", color: "text-emerald-600" },
  partial: { label: "부분 완료 🟡", color: "text-orange-500" },
  not_completed: { label: "미완료 ❌", color: "text-red-500" },
  pending: { label: "판정 전 —", color: "text-gray-400" },
};

const NEXT_STATUSES: Record<PlanTaskStatus, PlanTaskStatus[]> = {
  planned: ["ready"],
  ready: ["running"],
  running: ["done", "partial", "blocked", "needs_review"],
  done: [],
  partial: ["running", "blocked"],
  blocked: ["needs_review", "planned"],
  needs_review: ["done", "blocked"],
};

interface KanbanCardProps {
  task: PlanTask;
  planId: string;
  projectPath: string;
  onStatusChange: (taskId: string, status: PlanTaskStatus) => void;
  onTaskUpdate?: (task: PlanTask) => void;
}

export function KanbanCard({
  task,
  planId,
  projectPath,
  onStatusChange,
  onTaskUpdate,
}: KanbanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [copiedNext, setCopiedNext] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<DiffAnalysisOutput | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [showLoopApproval, setShowLoopApproval] = useState(false);
  const [loopMessage, setLoopMessage] = useState<{ text: string; type: "success" | "error" | "info" } | null>(null);
  const [isPreparingNext, setIsPreparingNext] = useState(false);
  const [lastAnalyzedBranch, setLastAnalyzedBranch] = useState<string>("");

  const cfg = STATUS_CONFIG[task.status];

  const handleStatusChange = async (newStatus: PlanTaskStatus) => {
    setUpdating(true);
    try {
      await fetch(`/api/plans/${planId}/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      onStatusChange(task.id, newStatus);
    } finally {
      setUpdating(false);
    }
  };

  const copyToClipboard = async (text: string, which: "prompt" | "next") => {
    await navigator.clipboard.writeText(text);
    if (which === "prompt") {
      setCopiedPrompt(true);
      setTimeout(() => setCopiedPrompt(false), 2000);
    } else {
      setCopiedNext(true);
      setTimeout(() => setCopiedNext(false), 2000);
    }
  };

  const runAnalyzer = async (bn: string) => {
    setIsAnalyzing(true);
    setAnalysisError(null);
    setAnalysisResult(null);

    try {
      const res = await fetch("/api/analyzer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, taskId: task.id, cwd: projectPath }),
      });
      const data = await res.json() as { analysis?: DiffAnalysisOutput; updatedTask?: PlanTask; error?: string };

      if (!res.ok) {
        throw new Error(data.error || "Analyzer request failed.");
      }

      if (data.analysis) {
        setAnalysisResult(data.analysis);
        if (data.updatedTask) {
          onTaskUpdate?.(data.updatedTask);
        }
      } else {
        throw new Error("분석 결과가 없습니다.");
      }
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleLoopContinue = async () => {
    const nextPrompt = analysisResult?.nextPrompt || task.nextPrompt;
    if (!nextPrompt) return;

    setIsPreparingNext(true);
    setLoopMessage(null);

    try {
      const response = await fetch("/api/loop-continue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          taskId: task.id,
          nextPrompt,
        }),
      });
      const data = await response.json() as {
        targetTask?: PlanTask | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error || "Failed to prepare next task.");
      }

      if (data.targetTask) {
        onTaskUpdate?.(data.targetTask);
        setLoopMessage({
          text: `다음 작업 준비 완료: "${data.targetTask.title}"`,
          type: "success",
        });
      } else {
        setLoopMessage({
          text: "이어갈 다음 작업이 없습니다. 현재 계획을 검토하세요.",
          type: "info",
        });
      }
    } catch (error) {
      setLoopMessage({
        text: `다음 작업 준비 실패: ${error instanceof Error ? error.message : String(error)}`,
        type: "error",
      });
    } finally {
      setIsPreparingNext(false);
    }
  };

  const nextActions = NEXT_STATUSES[task.status];
  const runnerAgent = task.assignedAgent === "claude-code" ? task.assignedAgent : null;
  const canExecute = Boolean(projectPath && task.generatedPrompt && runnerAgent);
  const executionUnavailableMessage =
    task.assignedAgent === "codex"
      ? "Codex CLI 실행은 아직 지원하지 않습니다. 생성된 프롬프트를 복사해 수동으로 실행하세요."
      : task.assignedAgent === "antigravity"
        ? "Antigravity는 현재 수동 실행 대상입니다."
        : "프로젝트 경로 또는 생성된 프롬프트가 필요합니다.";

  return (
    <div
      className={`rounded-xl border bg-surface border-border transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl hover:shadow-pink-primary/10 overflow-hidden ${
        task.status === "done" ? "opacity-75" : ""
      }`}
    >
      {/* ── 헤더 ── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* 상태 뱃지와 태스크 ID */}
            <div className="flex items-center gap-3 mb-2">
              <div className="shrink-0 leading-none flex items-center justify-center w-10 h-10">{cfg.icon}</div>
              <div className="flex flex-col">
                <span className={`text-sm font-bold ${cfg.color}`}>{cfg.label}</span>
                <span className="text-[10px] font-mono text-text-secondary">T{task.id}</span>
              </div>
            </div>

            {/* 작업명 */}
            <h3 className="font-semibold text-text-primary text-sm leading-snug">
              {task.title}
            </h3>
          </div>

          {/* 담당 에이전트 */}
          <span
            className={`shrink-0 text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1 ${
              AGENT_COLOR[task.assignedAgent]
            }`}
          >
            <Bot className="w-3 h-3" />
            {task.assignedAgent}
          </span>
        </div>

        {/* 목표 */}
        <p className="mt-2 text-xs text-text-secondary line-clamp-2 leading-relaxed">
          {task.description}
        </p>

        {/* 브랜치 */}
        {task.branchName && (
          <div className="mt-2 flex items-center gap-1 text-xs text-text-secondary/70">
            <GitBranch className="w-3 h-3" />
            <span className="font-mono">{task.branchName}</span>
          </div>
        )}

        {/* Sub-Agent Tracks */}
        {task.subAgentTracks.length > 0 && (
          <div className="mt-3 space-y-1">
            {task.subAgentTracks.map((track) => {
              const t = STATUS_CONFIG[track.status];
              return (
                <div key={track.id} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className={t.color}>{t.icon}</span>
                  <span className="flex-1 truncate">{track.role}</span>
                  <span className={`${t.color} font-medium`}>{t.label}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* 펼치기 버튼 */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-text-secondary hover:text-text-primary transition-colors py-1"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> 접기
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> 세부 정보 보기
            </>
          )}
        </button>
      </div>

      {/* ── 확장 영역 ── */}
      {expanded && (
        <div className="border-t border-border divide-y divide-border animate-slideDown bg-surface-2/50">
          {/* 실행 — Draft-only 패널 (자동 실행 비활성화) */}
          <div className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 border-t-2 border-amber-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Lock className="w-4 h-4 text-amber-700" />
                  <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                    실행 (승인 필요)
                  </span>
                </div>
                <p className="text-xs text-amber-700 leading-relaxed max-w-md">
                  Agent Control Room은 프롬프트와 검토 체크리스트를 준비합니다. 이 작업을 실행하려면 프롬프트를 복사하여 승인된 에이전트 환경에서 수동으로 실행하세요.
                </p>
              </div>
            </div>
            {/* Show workbench link for all agents that have generated prompt */}
            {task.assignedAgent && task.generatedPrompt && (
              <div className="mt-3 flex flex-wrap gap-2">
                {/* Prompt copy/review only for claude-code runner execution */}
                {canExecute && runnerAgent && (
                  <>
                    <button
                      onClick={() => copyToClipboard(task.generatedPrompt!, "prompt")}
                      className="inline-flex items-center gap-1 rounded bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700"
                      title="프롬프트 복사"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      프롬프트 복사
                    </button>
                    <button
                      onClick={() => setShowPrompt(!showPrompt)}
                      className="inline-flex items-center gap-1 rounded border border-amber-300 bg-white px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      프롬프트 검토
                    </button>
                  </>
                )}
                {/* Workbench entry for all agents */}
                <Link
                  href={`/workbench?planId=${planId}&taskId=${task.id}`}
                  className="inline-flex items-center gap-1 rounded border border-amber-400 bg-amber-100 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-200 transition-colors"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                  실행 준비 검토 →
                </Link>
              </div>
            )}
          </div>

          {/* 생성된 프롬프트 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                생성된 프롬프트
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showPrompt ? "숨기기" : "보기"}
                >
                  {showPrompt ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                {task.generatedPrompt && (
                  <button
                    onClick={() => copyToClipboard(task.generatedPrompt!, "prompt")}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="복사"
                  >
                    {copiedPrompt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            {task.generatedPrompt ? (
              showPrompt ? (
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
                  {task.generatedPrompt}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">클릭해서 프롬프트 보기</p>
              )
            ) : (
              <p className="text-xs text-gray-300">아직 생성되지 않음</p>
            )}
          </div>

          {/* 루프 승인 */}
          {showLoopApproval && (
            <div className="p-4 bg-surface">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                  반복 실행 승인
                </span>
                {branchName && (
                  <span className="text-xs text-gray-400 font-mono">
                    {branchName}
                  </span>
                )}
              </div>

              {isAnalyzing ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  실행 결과를 분석하는 중입니다.
                </div>
              ) : analysisError ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-red-600">
                    분석 실패: {analysisError}
                  </p>
                  <button
                    onClick={() => runAnalyzer(lastAnalyzedBranch)}
                    className="inline-flex items-center gap-1 rounded border border-red-300 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                  >
                    <RefreshCw className="h-3 w-3" />
                    분석 다시 시도
                  </button>
                </div>
              ) : analysisResult ? (
                <div className="mt-3 space-y-3">
                  {/* 판정 배지 + 이유 요약 */}
                  <div className="flex items-center gap-2">
                    <p
                      className={`text-sm font-semibold ${
                        JUDGMENT_CONFIG[analysisResult.completionJudgment].color
                      }`}
                    >
                      {JUDGMENT_CONFIG[analysisResult.completionJudgment].label}
                    </p>
                    {analysisResult.diffSummary && (
                      <span className="text-xs text-gray-500 truncate">
                        — {analysisResult.diffSummary}
                      </span>
                    )}
                  </div>

                  {/* 다음 프롬프트 미리보기 */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1">다음 작업 프롬프트</p>
                    <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded border border-border bg-surface-2 p-3 text-xs leading-relaxed text-text-secondary">
                      {analysisResult.nextPrompt}
                    </pre>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleLoopContinue}
                      disabled={isPreparingNext}
                      className="inline-flex items-center gap-1 rounded bg-pink-primary px-3 py-1.5 text-xs font-medium text-background hover:bg-pink-soft disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                      {isPreparingNext ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      {isPreparingNext ? "다음 작업 준비 중..." : "계속 진행"}
                    </button>
                    <button
                      onClick={() => {
                        setShowLoopApproval(false);
                        setLoopMessage({ text: "현재 결과가 저장되었습니다.", type: "success" });
                      }}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      중단
                    </button>
                  </div>
                </div>
              ) : null}

              {/* 피드백 배너 */}
              {loopMessage && (
                <div
                  className={`mt-3 rounded border p-2 text-xs flex items-center justify-between gap-2 ${
                    loopMessage.type === "success"
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : loopMessage.type === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-gray-200 bg-white text-gray-600"
                  }`}
                >
                  <span>{loopMessage.text}</span>
                  {loopMessage.type === "error" && (
                    <button
                      onClick={handleLoopContinue}
                      className="shrink-0 inline-flex items-center gap-1 rounded border border-red-300 px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-100"
                    >
                      <RefreshCw className="h-3 w-3" />
                      다시 시도
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 변경 파일 */}
          <div className="p-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              변경된 파일
            </span>
            {task.changedFiles && task.changedFiles.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {task.changedFiles.map((f) => (
                  <li key={f} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <FileCode2 className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="font-mono truncate">{f}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-xs text-gray-300">실행 전</p>
            )}
          </div>

          {/* Diff 요약 */}
          <div className="p-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              변경된 파일 내용
            </span>
            {task.diffSummary ? (
              <p className="mt-1 text-xs text-gray-600 leading-relaxed">
                {task.diffSummary}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-300">실행 후 자동 생성</p>
            )}
          </div>

          {/* 완료 판정 */}
          <div className="p-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              자동 판단
            </span>
            {task.completionJudgment ? (
              <p
                className={`mt-1 text-sm font-semibold ${
                  JUDGMENT_CONFIG[task.completionJudgment].color
                }`}
              >
                {JUDGMENT_CONFIG[task.completionJudgment].label}
              </p>
            ) : (
              <p className="mt-1 text-xs text-gray-300">판정 전</p>
            )}
          </div>

          {/* 다음 프롬프트 */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                다음 추천 작업
              </span>
              {task.nextPrompt && (
                <button
                  onClick={() => copyToClipboard(task.nextPrompt!, "next")}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title="복사"
                >
                  {copiedNext ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
            {task.nextPrompt ? (
              <pre className="text-xs text-text-secondary bg-surface-2 border border-border rounded-lg p-3 whitespace-pre-wrap leading-relaxed overflow-auto max-h-32">
                {task.nextPrompt}
              </pre>
            ) : (
              <p className="text-xs text-gray-300">실행 후 자동 생성</p>
            )}
          </div>
        </div>
      )}

      {/* ── 상태 변경 버튼 ── */}
      {nextActions.length > 0 && (
        <div className="px-4 pb-4 flex flex-wrap gap-2">
          {nextActions.map((s) => {
            const next = STATUS_CONFIG[s];
            return (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={updating}
                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                  updating
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:shadow-sm active:scale-95"
                } ${next.bg} ${next.color} border-current/20`}
              >
                {updating ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  next.icon
                )}
                → {next.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
