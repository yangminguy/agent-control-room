import Link from "next/link";
import { SessionReportForm } from "@/components/SessionReportForm";
import { getProjects, getSessionReports, getTasks } from "@/lib/storage/json-store";
import { getFeaturePlans } from "@/lib/storage/feature-plan-store";
import { agentLabel } from "@/lib/prompts/prompt-generator";

export default async function ReportsPage() {
  const [reports, projects, tasks, featurePlans] = await Promise.all([
    getSessionReports(),
    getProjects(),
    getTasks(),
    getFeaturePlans(),
  ]);

  const projectOptions = new Map(
    projects.map((project) => [project.id, project.name]),
  );
  for (const plan of featurePlans) {
    if (!projectOptions.has(plan.projectId)) {
      projectOptions.set(plan.projectId, plan.title);
    }
  }

  const taskOptions = [
    ...tasks.map((task) => ({
      id: task.id,
      projectId: task.projectId,
      title: task.title,
    })),
    ...featurePlans.flatMap((plan) =>
      plan.tasks.map((task) => ({
        id: task.id,
        projectId: plan.projectId,
        title: task.title,
      })),
    ),
  ];

  const projectNameById = new Map(projectOptions);
  const taskTitleById = new Map(
    taskOptions.map((task) => [task.id, task.title]),
  );

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-5 py-6 lg:px-8">
      <header className="flex flex-col gap-3 border-b border-slate-200 pb-5">
        <Link className="text-sm font-medium text-pink-primary" href="/">
          Back to Direction to Prompt
        </Link>
        <div>
          <h1 className="text-3xl font-semibold text-slate-950">Session reports</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            외부 AI 도구에서 완료한 결과를 붙여넣고 다음 작업 또는 핸드오프의
            근거로 저장합니다.
          </p>
        </div>
      </header>

      <SessionReportForm
        projects={[...projectOptions].map(([id, name]) => ({ id, name }))}
        tasks={taskOptions}
      />

      <section className="grid gap-3">
        {reports.map((report) => (
          <article
            className="rounded-lg border border-slate-200 bg-white p-4 text-sm shadow-sm"
            key={report.id}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold text-slate-950">{agentLabel(report.agent)}</h2>
              <time className="text-xs text-slate-500">{report.createdAt}</time>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {[projectNameById.get(report.projectId) ?? report.projectId, taskTitleById.get(report.taskId) ?? report.taskId].join(" / ")}
            </p>
            <p className="mt-2 leading-6 text-slate-700">{report.summary}</p>
            <p className="mt-3 text-sm font-medium text-slate-900">Recommended next task</p>
            <p className="mt-1 leading-6 text-slate-700">
              {report.nextTask || "Not provided"}
            </p>
          </article>
        ))}
      </section>
    </main>
  );
}
