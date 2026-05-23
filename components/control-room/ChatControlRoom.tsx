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
    <div className="mx-auto grid min-h-[calc(100vh-140px)] max-w-7xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:px-8">
      <section className="flex min-h-[640px] flex-col rounded-xl border border-border bg-surface-2">
        <div className="border-b border-border px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-pink-primary">
            Chat Control Room
          </p>
          <h1 className="mt-1 text-2xl font-bold text-text-primary">
            기획을 끝낸 뒤 버튼으로만 실행합니다
          </h1>
          <p className="mt-1 text-sm text-text-secondary">
            이 채팅은 계획만 만듭니다. Claude Code, Codex, Antigravity, Vibe Kanban, Hermes는 실행 버튼 전에는 시작되지 않습니다.
          </p>
        </div>

        {!openAiConfigured && (
          <div className="m-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            OpenAI API key가 서버 런타임에 보이지 않습니다. `.env.local`을 설정한 뒤 dev server를 재시작해야 OpenAI 기획 응답을 사용할 수 있습니다.
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[82%] rounded-xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "bg-pink-primary text-white"
                    : "border border-border bg-surface text-text-primary"
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}
          {isPlanning && (
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Loader2 className="h-4 w-4 animate-spin" />
              오케스트레이션이 계획을 정리하는 중
            </div>
          )}
        </div>

        {error && (
          <div className="mx-5 mb-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </div>
        )}

        <div className="border-t border-border p-4">
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
                  void sendMessage();
                }
              }}
              placeholder="계획, 범위, 우선순위, 제약조건을 말해 주세요."
              className="min-h-24 flex-1 resize-y rounded-lg border border-border bg-surface px-3 py-3 text-sm text-text-primary outline-none focus:border-pink-primary"
            />
            <button
              type="button"
              onClick={sendMessage}
              disabled={isPlanning || !input.trim()}
              className="inline-flex w-12 items-center justify-center rounded-lg bg-pink-primary text-white disabled:cursor-not-allowed disabled:opacity-50"
              title="메시지 보내기"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>

      <aside className="space-y-4">
        <section className="rounded-xl border border-border bg-surface-2 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                Roadmap Preview
              </p>
              <h2 className="mt-1 text-xl font-bold text-text-primary">
                {plan?.title ?? "아직 계획 없음"}
              </h2>
            </div>
            <Bot className="h-5 w-5 text-pink-primary" />
          </div>

          <div className="mt-4">
            <div className="mb-2 flex justify-between text-xs text-text-secondary">
              <span>진행 준비도</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {plan?.phases.map((phase) => (
              <div key={phase.id} className="rounded-lg border border-border bg-surface px-3 py-3">
                <div className="flex items-start gap-3">
                  {phase.completionPercentage >= 100 ? (
                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                  ) : (
                    <Circle className="mt-1 h-3.5 w-3.5 text-text-tertiary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-text-primary">
                      {phase.number}. {phase.title}
                    </p>
                    <p className="mt-1 text-xs text-text-secondary">
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
              <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-secondary">
                채팅을 시작하면 Phase 로드맵이 여기에 생깁니다.
              </p>
            )}
          </div>
        </section>

        {plan?.clarifyingQuestions.length ? (
          <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-200">
              <AlertTriangle className="h-4 w-4" />
              아직 확인할 것
            </div>
            <ul className="space-y-2 text-sm leading-5 text-amber-100">
              {plan.clarifyingQuestions.map((question) => (
                <li key={question}>- {question}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section className="rounded-xl border border-border bg-surface-2 p-4">
          <div className="grid gap-2">
            <button
              type="button"
              onClick={finalizePlan}
              disabled={!canFinalize || isFinalizing}
              className="rounded-lg border border-pink-primary px-4 py-2 text-sm font-semibold text-pink-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isFinalizing ? "계획 고정 중" : "계획 고정"}
            </button>
            <button
              type="button"
              onClick={executePlan}
              disabled={!canExecute || isExecuting}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-pink-primary px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isExecuting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              실제 실행 시작
            </button>
          </div>
          <p className="mt-3 text-xs leading-5 text-text-secondary">
            실행 버튼을 누르기 전까지는 planning-only입니다. 실행 후에는 Vercel이 직접 CLI를 실행하지 않고 로컬 Mac runner/workbench가 작업을 가져가 수행합니다.
          </p>
        </section>

        {run && (
          <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm font-semibold text-emerald-200">실행 루프 시작됨</p>
            <p className="mt-1 text-xs text-emerald-100">
              {run.startedTasks.length}개 작업이 로컬 runner 큐에 등록됐고 Vibe Kanban 추적이 준비됐습니다.
            </p>
            {run.approvalRequired && (
              <p className="mt-2 text-xs text-amber-200">
                Critical 작업은 별도 승인 또는 수동 처리 후 진행됩니다.
              </p>
            )}
            <a
              href="/orchestration"
              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-emerald-500 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-200 hover:bg-emerald-500/30 transition-colors"
            >
              오케스트레이션 보드에서 확인 →
            </a>
          </section>
        )}
      </aside>
    </div>
  );
}
