"use client";

import { useState } from "react";
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
} from "lucide-react";
import { RunnerLogView } from "@/components/runner/RunnerLogView";
import type { PlanTask, PlanTaskStatus, AgentType, CompletionJudgment, DiffAnalysisOutput } from "@/lib/types";

const STATUS_CONFIG: Record<
  PlanTaskStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  planned: {
    label: "Planned",
    color: "text-gray-500",
    bg: "bg-gray-100",
    icon: <Circle className="w-3.5 h-3.5" />,
  },
  ready: {
    label: "Ready",
    color: "text-pink-primary",
    bg: "bg-surface-2",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  running: {
    label: "Running",
    color: "text-amber-600",
    bg: "bg-amber-50",
    icon: <Loader2 className="w-3.5 h-3.5 animate-spin" />,
  },
  done: {
    label: "Done",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  partial: {
    label: "Partial",
    color: "text-orange-600",
    bg: "bg-orange-50",
    icon: <RefreshCw className="w-3.5 h-3.5" />,
  },
  blocked: {
    label: "Blocked",
    color: "text-red-600",
    bg: "bg-red-50",
    icon: <AlertTriangle className="w-3.5 h-3.5" />,
  },
  needs_review: {
    label: "Needs Review",
    color: "text-purple-600",
    bg: "bg-purple-50",
    icon: <Eye className="w-3.5 h-3.5" />,
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
  const [analysisResult, setAnalysisResult] = useState<DiffAnalysisOutput | null>(null);
  const [branchName, setBranchName] = useState<string>("");
  const [showLoopApproval, setShowLoopApproval] = useState(false);
  const [loopMessage, setLoopMessage] = useState<string | null>(null);
  const [isPreparingNext, setIsPreparingNext] = useState(false);

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
        setLoopMessage(`${data.targetTask.title} 작업이 Ready 상태로 준비되었습니다.`);
      } else {
        setLoopMessage("이어갈 다음 작업이 없습니다. 현재 계획을 검토하세요.");
      }
    } catch (error) {
      setLoopMessage(error instanceof Error ? error.message : String(error));
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
      className={`rounded-xl border bg-white shadow-sm transition-all duration-200 hover:shadow-md ${
        task.status === "done" ? "opacity-75" : ""
      }`}
    >
      {/* ── 헤더 ── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* 태스크 ID + 상태 뱃지 */}
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-mono text-gray-400">{task.id}</span>
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}
              >
                {cfg.icon}
                {cfg.label}
              </span>
            </div>

            {/* 작업명 */}
            <h3 className="font-semibold text-gray-900 text-sm leading-snug">
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
        <p className="mt-2 text-xs text-gray-500 line-clamp-2 leading-relaxed">
          {task.description}
        </p>

        {/* 브랜치 */}
        {task.branchName && (
          <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
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
          className="mt-3 w-full flex items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          {expanded ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" /> 접기
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" /> 실행 정보 보기
            </>
          )}
        </button>
      </div>

      {/* ── 확장 영역 ── */}
      {expanded && (
        <div className="border-t divide-y divide-gray-100">
          {/* 실행 */}
          <div className="p-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              실행
            </span>
            {canExecute && runnerAgent && task.generatedPrompt ? (
              <div className="mt-3">
                <RunnerLogView
                  planId={planId}
                  taskId={task.id}
                  prompt={task.generatedPrompt}
                  agent={runnerAgent}
                  projectPath={projectPath}
                  onComplete={(status, bn) => {
                    const newStatus = status === "done" ? "done" : "blocked";
                    onStatusChange(task.id, newStatus);
                    
                    if (status === "done" && bn) {
                      setBranchName(bn);
                      setIsAnalyzing(true);
                      setShowLoopApproval(true);
                      fetch("/api/analyzer", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ planId, taskId: task.id, cwd: projectPath }),
                      })
                        .then((res) => res.json())
                        .then((data) => {
                          if (data.analysis) {
                            setAnalysisResult(data.analysis);
                            if (data.updatedTask) {
                              onTaskUpdate?.(data.updatedTask);
                            }
                          }
                          setIsAnalyzing(false);
                        })
                        .catch((err) => {
                          console.error("Analyzer error:", err);
                          setIsAnalyzing(false);
                        });
                    }
                  }}
                />
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-300">
                {executionUnavailableMessage}
              </p>
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
                  Loop Approval
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
              ) : analysisResult ? (
                <div className="mt-3 space-y-3">
                  <p
                    className={`text-sm font-semibold ${
                      JUDGMENT_CONFIG[analysisResult.completionJudgment].color
                    }`}
                  >
                    {JUDGMENT_CONFIG[analysisResult.completionJudgment].label}
                  </p>
                  <pre className="max-h-36 overflow-auto whitespace-pre-wrap rounded border border-border bg-surface-2 p-3 text-xs leading-relaxed text-text-secondary">
                    {analysisResult.nextPrompt}
                  </pre>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={handleLoopContinue}
                      disabled={isPreparingNext}
                      className="inline-flex items-center gap-1 rounded bg-pink-primary px-3 py-1.5 text-xs font-medium text-background hover:bg-pink-soft disabled:bg-gray-600"
                    >
                      {isPreparingNext ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5" />
                      )}
                      Continue
                    </button>
                    <button
                      onClick={() => {
                        setShowLoopApproval(false);
                        setLoopMessage("현재 결과를 보존하고 루프를 중단했습니다.");
                      }}
                      className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Stop
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-xs text-red-500">
                  분석 결과를 가져오지 못했습니다. Diff Analyzer를 다시 확인하세요.
                </p>
              )}

              {loopMessage && (
                <p className="mt-3 rounded border border-gray-200 bg-white p-2 text-xs text-gray-600">
                  {loopMessage}
                </p>
              )}
            </div>
          )}

          {/* 변경 파일 */}
          <div className="p-4">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
              변경 파일
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
              Diff 요약
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
              완료 판정
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
                다음 프롬프트
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
