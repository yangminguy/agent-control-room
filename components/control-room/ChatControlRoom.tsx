"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  Check,
  Circle,
  Loader2,
  Play,
  Send,
  Terminal,
  ShieldCheck,
} from "lucide-react";
import type {
  ControlRoomExecutionRun,
  ControlRoomMessage,
  ControlRoomPlan,
} from "@/lib/types";

function newMessage(role: ControlRoomMessage["role"], content: string): ControlRoomMessage {
  return {
    id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
}

function agentLabel(agent: string): string {
  if (agent === "claude-code") return "Claude Code";
  if (agent === "codex") return "Codex";
  if (agent === "antigravity") return "Antigravity";
  return agent;
}

export function ChatControlRoom({
  initialPlan,
  openAiConfigured,
}: {
  initialPlan: ControlRoomPlan | null;
  openAiConfigured: boolean;
}) {
  const [messages, setMessages] = useState<ControlRoomMessage[]>(
    initialPlan
      ? [
          newMessage("assistant", initialPlan.assistantReply),
        ]
      : [
          newMessage(
            "assistant",
            "무엇을 만들지 말해 주세요. 저는 먼저 Phase 계획을 끝까지 같이 확정하고, 실행 버튼을 누르기 전까지는 어떤 에이전트도 실행하지 않습니다.",
          ),
        ],
  );
  const [input, setInput] = useState("");
  const [plan, setPlan] = useState<ControlRoomPlan | null>(initialPlan);
  const [run, setRun] = useState<ControlRoomExecutionRun | null>(null);
  const [isPlanning, setIsPlanning] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState("");

  const canFinalize = Boolean(plan && !plan.finalPlanReady);
  const canExecute = Boolean(plan?.finalPlanReady && plan.executionReadiness === "ready");

  const progress = useMemo(() => {
    if (!plan || plan.phases.length === 0) return 0;
    return Math.round(
      plan.phases.reduce((sum, phase) => sum + phase.completionPercentage, 0) /
        plan.phases.length,
    );
  }, [plan]);

  async function sendMessage() {
    if (!input.trim()) return;

    const userMessage = newMessage("user", input.trim());
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput("");
    setError("");
    setIsPlanning(true);

    try {
      const response = await fetch("/api/control-room/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: "Agent Control Room",
          message: userMessage.content,
          history: nextMessages,
          existingPlanId: plan?.id,
        }),
      });
      const data = await response.json() as {
        success?: boolean;
        plan?: ControlRoomPlan;
        error?: string;
      };

      if (!response.ok || !data.success || !data.plan) {
        throw new Error(data.error || "기획 응답을 만들지 못했습니다.");
      }

      setPlan(data.plan);
      setMessages((current) => [
        ...current,
        newMessage("assistant", data.plan!.assistantReply),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsPlanning(false);
    }
  }

  async function finalizePlan() {
    if (!plan) return;
    setError("");
    setIsFinalizing(true);

    try {
      const response = await fetch("/api/control-room/finalize-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await response.json() as {
        success?: boolean;
        plan?: ControlRoomPlan;
        error?: string;
      };

      if (!response.ok || !data.success || !data.plan) {
        throw new Error(data.error || "계획을 고정하지 못했습니다.");
      }

      setPlan(data.plan);
      setMessages((current) => [
        ...current,
        newMessage("assistant", data.plan!.assistantReply),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsFinalizing(false);
    }
  }

  async function executePlan() {
    if (!plan) return;
    setError("");
    setIsExecuting(true);

    try {
      const response = await fetch("/api/control-room/execute-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          approvalStatement: "I approve starting this finalized plan",
        }),
      });
      const data = await response.json() as {
        success?: boolean;
        run?: ControlRoomExecutionRun;
        error?: string;
      };

      if (!response.ok || !data.success || !data.run) {
        throw new Error(data.error || "실행을 시작하지 못했습니다.");
      }

      // 각 startedTask에 OrchestrationDecision 부착
      const decisions = await Promise.allSettled(
        data.run.startedTasks.map(async (job) => {
          const res = await fetch("/api/orchestration/decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: job.taskId,
              description: job.prompt?.slice(0, 500) ?? "",
              taskType: "feature",
              planId: plan.id,
              taskId: job.taskId,
            }),
          });
          const { decision } = await res.json() as { decision: { riskLevel: string; primaryAgent: string } };
          return { job, decision };
        })
      );

      // localStorage에 저장
      const resolved = decisions
        .filter((r) => r.status === "fulfilled")
        .map((r) => (r as PromiseFulfilledResult<{ job: typeof data.run.startedTasks[0]; decision: { riskLevel: string; primaryAgent: string } }>).value);

      if (resolved.length > 0) {
        localStorage.setItem("pending_orchestration_jobs", JSON.stringify(resolved));
      }

      setRun(data.run);
      setMessages((current) => [
        ...current,
        newMessage("assistant", data.run!.message),
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setIsExecuting(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8 space-y-6 flex flex-col min-h-[calc(100vh-140px)]">
      
      {/* 1. TOP STATUS PANEL */}
      <div className="rounded-xl border border-zinc-200 bg-white p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-primary/10 border border-pink-primary/20 flex items-center justify-center text-pink-primary">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-text-primary">
              {plan?.title ?? "대기 상태: 새로운 프로젝트 계획 필요"}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              오케스트레이션 런타임: <span className="font-semibold text-text-primary">Auto-Select (direct)</span>
            </p>
          </div>
        </div>

        {/* Overall progress indicator */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-text-secondary">기획/진행 준비도</p>
            <p className="text-sm font-bold text-text-primary">{progress}%</p>
          </div>
          <div className="w-32 h-2.5 bg-zinc-100 border border-zinc-200 rounded-full overflow-hidden shrink-0">
            <div
              className="h-full bg-pink-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Runtime config / status */}
        <div className="flex items-center gap-2">
          {openAiConfigured ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
              <ShieldCheck className="w-3.5 h-3.5" />
              OpenAI Active
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
              <AlertTriangle className="w-3.5 h-3.5" />
              OpenAI Offline
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-pink-primary/10 text-pink-primary border border-pink-primary/20">
            {run ? "실행 중 (Executing)" : "기획 중 (Planning)"}
          </span>
        </div>
      </div>

      {/* 2 & 3. WORKSPACE GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
        
        {/* CENTER ACTIVE WORK STREAM (CHAT) */}
        <section className="flex flex-col h-[580px] rounded-xl border border-zinc-200 bg-white overflow-hidden shadow-sm">
          <div className="border-b border-zinc-200 bg-zinc-50 px-5 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-text-primary">
                기획 대화 스트림
              </h2>
              <p className="text-xs text-text-secondary mt-0.5">
                대화를 통해 로드맵을 먼저 조율하고 검증합니다.
              </p>
            </div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-pink-primary bg-pink-primary/5 border border-pink-primary/10 px-2 py-0.5 rounded">
              Active Stream
            </span>
          </div>

          {!openAiConfigured && (
            <div className="m-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-600">
              ⚠️ OpenAI API key가 설정되지 않았습니다. `.env.local`을 설정하고 개발 서버를 재시작하세요.
            </div>
          )}

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5 bg-white">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "bg-zinc-900 text-white border border-zinc-950 shadow-sm"
                      : "border border-zinc-200 bg-zinc-50 text-zinc-900"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            {isPlanning && (
              <div className="flex items-center gap-2 text-xs text-text-secondary">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-pink-primary" />
                오케스트레이션이 계획을 구성하고 있습니다...
              </div>
            )}
          </div>

          {error && (
            <div className="mx-5 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="border-t border-zinc-200 p-4 bg-zinc-50">
            <div className="flex gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                    void sendMessage();
                  }
                }}
                placeholder="계획, 범위, 우선순위, 제약조건을 말해 주세요. (Cmd+Enter 전송)"
                className="min-h-20 flex-1 resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-pink-primary"
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={isPlanning || !input.trim()}
                className="inline-flex w-12 items-center justify-center rounded-lg bg-zinc-900 text-white disabled:cursor-not-allowed disabled:opacity-50 hover:bg-zinc-800 transition-colors border border-zinc-950"
                title="메시지 보내기"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </section>

        {/* RIGHT DECISION QUEUE */}
        <aside className="space-y-4 h-[580px] overflow-y-auto pr-1">
          
          {/* Roadmap Stage Cards */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary">
                로드맵 결정 큐
              </h3>
              <span className="text-xs font-semibold text-text-primary">
                {plan?.phases.length ?? 0} Stages
              </span>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-0.5">
              {plan?.phases.map((phase) => (
                <div key={phase.id} className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 transition-colors hover:border-pink-primary/30">
                  <div className="flex items-start gap-2.5">
                    {phase.completionPercentage >= 100 ? (
                      <Check className="mt-0.5 h-4 w-4 text-emerald-500 shrink-0" />
                    ) : (
                      <Circle className="mt-0.5 h-4 w-4 text-text-tertiary shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {phase.number}. {phase.title}
                      </p>
                      <p className="mt-0.5 text-[10px] text-text-secondary">
                        {agentLabel(phase.responsibleAgent)} · {phase.tasks.length} tasks
                      </p>
                      <p className="mt-2 text-xs leading-5 text-text-tertiary">
                        {phase.nextAction}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              {!plan && (
                <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-text-secondary">
                  기획 대화를 시작하면 여기에 실시간 로드맵 스테이지가 렌더링됩니다.
                </p>
              )}
            </div>
          </section>

          {/* Confirmations and Blockers */}
          {plan?.clarifyingQuestions.length ? (
            <section className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                추가 조율 사항
              </div>
              <ul className="space-y-1.5 text-xs leading-relaxed text-amber-700">
                {plan.clarifyingQuestions.map((question) => (
                  <li key={question} className="pl-2 border-l border-amber-500/30">
                    {question}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* Actions */}
          <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm">
            <div className="grid gap-2">
              <button
                type="button"
                onClick={finalizePlan}
                disabled={!canFinalize || isFinalizing}
                className="w-full py-2.5 rounded-lg border border-zinc-200 bg-white text-xs font-bold text-zinc-900 disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-50 transition-colors shadow-sm"
              >
                {isFinalizing ? "계획 고정 중..." : "계획 고정 (Finalize Plan)"}
              </button>
              <button
                type="button"
                onClick={executePlan}
                disabled={!canExecute || isExecuting}
                className="w-full py-3 inline-flex items-center justify-center gap-2 rounded-lg bg-zinc-900 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-40 hover:bg-zinc-800 transition-colors border border-zinc-950 shadow-sm"
              >
                {isExecuting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 fill-current" />
                )}
                실제 실행 시작 (Execute)
              </button>
            </div>
            <p className="text-[11px] leading-normal text-text-secondary">
              승인 전까지는 기획 모드로 대기하며, 실행 시 지정된 에이전트들이 순차적으로 로컬 런타임 환경에서 수행을 시작합니다.
            </p>
          </section>

        </aside>
      </div>

      {/* 4. BOTTOM SYSTEM EVENTS & LOGS CONSOLE */}
      <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-pink-primary" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900">
              Hermes Supervisor Summary
            </h3>
          </div>
          <span className="text-[10px] text-text-secondary font-mono">
            {run ? `RUN_ID: ${run.id}` : "MODE: MONITORING_STANDBY"}
          </span>
        </div>

        <div className="grid gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-xs leading-relaxed text-zinc-700">
          <p><span className="font-semibold text-zinc-900">상태:</span> 백그라운드 감독 준비 완료</p>
          <p><span className="font-semibold text-zinc-900">안전 확인:</span> 로컬 워크스페이스 경로 확인됨</p>
          <p><span className="font-semibold text-zinc-900">Git 상태:</span> 대기 중, 변경 감시만 수행</p>
          <p><span className="font-semibold text-zinc-900">사용 가능 런타임:</span> Claude, Codex, Antigravity direct runner</p>
          {run ? (
            <>
              <p className="font-semibold text-pink-primary">실행 승인됨: 대기열 디스패치를 시작합니다.</p>
              <p>현재 작업: {run.startedTasks[0]?.taskId || "task-init"} · {agentLabel(run.startedTasks[0]?.agentId || "agent")}</p>
              <p className="font-semibold text-emerald-700">Hermes가 파일 변경과 검증 결과를 감독 중입니다.</p>
            </>
          ) : (
            <p className="text-zinc-600">계획 확정과 사용자 승인 전까지 실행하지 않고 대기합니다.</p>
          )}
        </div>
      </section>
      
    </div>
  );
}
