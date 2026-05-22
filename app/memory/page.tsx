import type { Metadata } from "next";
import { AlertCircle, RefreshCw } from "lucide-react";
import { ObsidianNoteBuilder } from "@/components/hermes/ObsidianNoteBuilder";
import {
  getFailedTasks,
  getRetryCandidates,
  type FailedTaskRecord,
} from "@/lib/monitor/failed-task-tracker";

export const metadata: Metadata = {
  title: "Memory — Agent Control Room",
};

export default async function MemoryPage() {
  const [failedTasks, retryCandidates] = await Promise.all([
    getFailedTasks(),
    getRetryCandidates(),
  ]);

  return (
    <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary">
          Memory &amp; Insights
        </h1>
        <p className="text-text-secondary mt-2">
          개발 인사이트, 결정사항, 실패 패턴을 Obsidian 호환 Markdown으로
          저장하세요.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Obsidian Note Builder */}
        <div className="lg:col-span-2">
          <section className="rounded-2xl border border-border bg-surface p-6">
            <h2 className="text-lg font-semibold text-text-primary mb-6">
              Obsidian Note Builder
            </h2>
            <ObsidianNoteBuilder />
          </section>
        </div>

        {/* Right: Failed Tasks + Retry Candidates */}
        <aside className="space-y-6">
          <FailedTasksPanel tasks={failedTasks} />
          <RetryCandidatesPanel candidates={retryCandidates} />
        </aside>
      </div>
    </main>
  );
}

// ─── Server-only panel components ─────────────────────────────────────────────

function FailedTasksPanel({ tasks }: { tasks: FailedTaskRecord[] }) {
  const classificationColors: Record<FailedTaskRecord["classification"], string> = {
    QA: "text-amber-500 bg-amber-500/10 border-amber-500/20",
    Blocked: "text-red-400 bg-red-500/10 border-red-500/20",
    MinorFix: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  };

  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle className="w-4 h-4 text-red-400" />
        <h2 className="text-sm font-semibold text-text-primary">
          실패 태스크 ({tasks.length})
        </h2>
      </div>

      {tasks.length === 0 ? (
        <p className="text-xs text-text-secondary">
          기록된 실패 태스크가 없습니다.
        </p>
      ) : (
        <ul className="space-y-3">
          {tasks.slice(0, 8).map((task) => (
            <li
              key={task.id}
              className="rounded-lg border border-border bg-surface-2 px-3 py-2.5 space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-text-primary leading-snug">
                  {task.taskTitle}
                </span>
                <span
                  className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-semibold ${classificationColors[task.classification]}`}
                >
                  {task.classification}
                </span>
              </div>
              <p className="text-[11px] text-text-secondary leading-snug line-clamp-2">
                {task.reason}
              </p>
              <div className="flex items-center gap-2 text-[10px] text-text-secondary">
                <span>재시도 {task.retryCount}회</span>
                <span>·</span>
                <span>
                  {new Date(task.failedAt).toLocaleDateString("ko-KR")}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function RetryCandidatesPanel({
  candidates,
}: {
  candidates: FailedTaskRecord[];
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2 mb-4">
        <RefreshCw className="w-4 h-4 text-emerald-400" />
        <h2 className="text-sm font-semibold text-text-primary">
          재시도 후보 ({candidates.length})
        </h2>
      </div>

      {candidates.length === 0 ? (
        <p className="text-xs text-text-secondary">재시도 후보가 없습니다.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((c) => (
            <li
              key={c.id}
              className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 space-y-0.5"
            >
              <p className="text-xs font-semibold text-text-primary">
                {c.taskTitle}
              </p>
              <p className="text-[11px] text-text-secondary">
                재시도 {c.retryCount}회 · {c.classification}
              </p>
              {c.notes && (
                <p className="text-[11px] text-text-secondary line-clamp-1">
                  {c.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
