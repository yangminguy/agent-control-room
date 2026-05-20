"use client";

import { useMemo, useState } from "react";
import type { AgentStatusValue, AgentType, OrchestrationResult } from "@/lib/types";
import { agentLabel } from "@/lib/prompts/prompt-generator";

const DEFAULT_CONTEXT = `MVP focus:
- Direction to Prompt is the first success experience.
- Context is manually pasted by the user.
- Storage is local JSON.
- The app must not automatically execute Claude Code, Codex, or Antigravity.`;

const DEFAULT_DIRECTION = "프로젝트별 에이전트 상태를 카드 형태로 보고 싶어.";

type ResultWithSource = OrchestrationResult & { source: "openai" | "fallback" };

export function DirectionOrchestrator() {
  const [projectName, setProjectName] = useState("Agent Control Room");
  const [projectContext, setProjectContext] = useState(DEFAULT_CONTEXT);
  const [direction, setDirection] = useState(DEFAULT_DIRECTION);
  const [preferredAgentStatus, setPreferredAgentStatus] =
    useState<AgentStatusValue>("available");
  const [result, setResult] = useState<ResultWithSource | null>(null);
  const [editablePrompt, setEditablePrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName,
          projectContext,
          direction,
          preferredAgentStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate orchestration result.");
      }

      const data = (await response.json()) as ResultWithSource;
      setResult(data);
      setEditablePrompt(data.copyReadyPrompt);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }

  const sourceLabel = useMemo(() => {
    if (!result) return "";
    return result.source === "openai" ? "OpenAI structured output" : "Local fallback";
  }, [result]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-5 py-6 lg:px-8">
      <header className="flex flex-col gap-2 border-b border-border pb-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-pink-primary">
          Agent Control Room
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-normal text-text-primary">
              Direction to Prompt
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
              기획 방향을 기술 작업으로 번역하고, 추천 에이전트와 복사용 실행
              프롬프트를 생성합니다.
            </p>
          </div>
          <a
            className="w-fit rounded-md border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-text-primary hover:bg-surface"
            href="/reports"
          >
            Session reports
          </a>
        </div>
      </header>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface-2 p-4 shadow-sm">
          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor="project-name">
              Project
            </label>
            <input
              id="project-name"
              className="mt-2 px-3 py-2"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor="agent-status">
              Preferred agent status
            </label>
            <select
              id="agent-status"
              className="mt-2 px-3 py-2"
              value={preferredAgentStatus}
              onChange={(event) =>
                setPreferredAgentStatus(event.target.value as AgentStatusValue)
              }
            >
              <option value="available">available</option>
              <option value="limited">limited</option>
              <option value="cooling_down">cooling_down</option>
              <option value="blocked">blocked</option>
              <option value="manual_only">manual_only</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor="context">
              Project context
            </label>
            <textarea
              id="context"
              className="mt-2 min-h-44 resize-y px-3 py-2 leading-6"
              value={projectContext}
              onChange={(event) => setProjectContext(event.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium text-text-primary" htmlFor="direction">
              Product direction
            </label>
            <textarea
              id="direction"
              className="mt-2 min-h-28 resize-y px-3 py-2 leading-6"
              value={direction}
              onChange={(event) => setDirection(event.target.value)}
            />
          </div>

          {error ? (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <button
            className="rounded-md bg-pink-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-pink-soft disabled:cursor-not-allowed disabled:bg-gray-600"
            disabled={isLoading || !projectName.trim() || !direction.trim()}
            onClick={handleGenerate}
            type="button"
          >
            {isLoading ? "Generating..." : "Generate prompt"}
          </button>
        </div>

        <div className="flex min-h-[720px] flex-col gap-4">
          {!result ? (
            <div className="flex h-full min-h-96 items-center justify-center rounded-lg border border-dashed border-border bg-surface-2 p-8 text-center text-sm leading-6 text-text-tertiary">
              입력을 확인한 뒤 Generate prompt를 누르면 기술 번역, 작업 분해,
              추천 에이전트, 복사용 프롬프트가 여기에 표시됩니다.
            </div>
          ) : (
            <>
              <section className="rounded-lg border border-border bg-surface-2 p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                      Recommended agent
                    </p>
                    <h2 className="mt-1 text-2xl font-semibold text-text-primary">
                      {agentLabel(result.recommendedAgent)}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-800">
                      {sourceLabel}
                    </span>
                    {result.handoffRequired && (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
                        Handoff required
                      </span>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-text-primary">{result.agentReason}</p>
                {result.statusReason && (
                  <p className="mt-2 text-sm text-amber-700 font-medium">{result.statusReason}</p>
                )}
                {result.fallbackAgent ? (
                  <p className="mt-2 text-sm text-text-secondary">
                    ← Fallback from {agentLabel(result.fallbackAgent as AgentType)}
                  </p>
                ) : null}
              </section>

              <section className="grid gap-4 xl:grid-cols-2">
                <ResultCard title="Technical translation">
                  <p className="font-medium text-text-primary">
                    {result.technicalTranslation.productIntent}
                  </p>
                  <p className="mt-2 leading-6">
                    {result.technicalTranslation.technicalInterpretation}
                  </p>
                </ResultCard>
                <ResultCard title="Tasks">
                  <div className="space-y-3">
                    {result.tasks.map((task) => (
                      <div key={task.title} className="border-b border-border pb-3 last:border-0">
                        <p className="font-medium text-text-primary">{task.title}</p>
                        <p className="mt-1 text-xs text-text-tertiary">
                          {task.priority} · {agentLabel(task.recommendedAgent)}
                        </p>
                        <p className="mt-2 leading-6">{task.technicalSummary}</p>
                      </div>
                    ))}
                  </div>
                </ResultCard>
              </section>

              <section className="grid gap-4 xl:grid-cols-3">
                <ListCard title="Acceptance criteria" items={result.acceptanceCriteria} />
                <ListCard title="Assumptions" items={result.assumptions} />
                <ListCard title="Risks" items={result.risks} />
              </section>

              {result.followUpQuestions.length ? (
                <ListCard title="Follow-up questions" items={result.followUpQuestions} />
              ) : null}

              {result.handoffRequired && result.handoffPrompt ? (
                <section className="rounded-lg border border-amber-200 bg-amber-50 p-4 shadow-sm">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-amber-700">
                    Agent Handoff Prompt
                  </p>
                  <p className="mb-3 text-sm leading-6 text-amber-900">
                    에이전트 전환이 필요합니다. 다음 프롬프트를 대체 에이전트에게 제공하세요.
                  </p>
                  <pre className="max-h-40 overflow-y-auto rounded-md bg-amber-100 px-3 py-2 text-xs leading-5 text-amber-900 font-mono">
                    {result.handoffPrompt}
                  </pre>
                </section>
              ) : null}

              <section className="rounded-lg border border-border bg-surface-2 p-4 shadow-sm">
                <label className="text-sm font-semibold text-text-primary" htmlFor="prompt-preview">
                  Editable copy-ready prompt
                </label>
                <textarea
                  id="prompt-preview"
                  className="mt-3 min-h-80 resize-y px-3 py-3 font-mono text-sm leading-6"
                  value={editablePrompt}
                  onChange={(event) => setEditablePrompt(event.target.value)}
                />
              </section>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

function ResultCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-primary shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">{title}</h3>
      {children}
    </section>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-lg border border-border bg-surface-2 p-4 text-sm text-text-primary shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-text-primary">{title}</h3>
      <ul className="space-y-2">
        {(items.length ? items : ["None"]).map((item) => (
          <li className="leading-6" key={item}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}
