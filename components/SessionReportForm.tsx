"use client";

import { useState } from "react";
import type { AgentType } from "@/lib/types";

type ProjectOption = {
  id: string;
  name: string;
};

type TaskOption = {
  id: string;
  projectId: string;
  title: string;
};

export function SessionReportForm({
  projects,
  tasks,
}: {
  projects: ProjectOption[];
  tasks: TaskOption[];
}) {
  const defaultProjectId =
    projects.find((project) =>
      tasks.some((task) => task.projectId === project.id),
    )?.id ??
    projects[0]?.id ??
    "";
  const defaultTaskId =
    tasks.find((task) => task.projectId === defaultProjectId)?.id ??
    tasks[0]?.id ??
    "";

  const [projectId, setProjectId] = useState(defaultProjectId);
  const [taskId, setTaskId] = useState(defaultTaskId);
  const [agent, setAgent] = useState<AgentType>("codex");
  const [summary, setSummary] = useState("");
  const [changedFiles, setChangedFiles] = useState("");
  const [testsRun, setTestsRun] = useState("");
  const [remainingIssues, setRemainingIssues] = useState("");
  const [recommendedNextTask, setRecommendedNextTask] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function saveReport() {
    setIsSaving(true);
    setMessage("");

    const response = await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId,
        taskId,
        agent,
        changedFiles: splitLines(changedFiles),
        summary,
        testsRun: splitLines(testsRun),
        remainingIssues: splitLines(remainingIssues),
        nextTask: recommendedNextTask,
      }),
    });

    setIsSaving(false);
    setMessage(response.ok ? "Session report saved." : "Could not save report.");
  }

  const visibleTasks = tasks.filter((task) => task.projectId === projectId);
  const selectedTaskOptions =
    visibleTasks.length > 0
      ? visibleTasks
      : [
          {
            id: `${projectId}:general`,
            projectId,
            title: "General project report",
          },
        ];

  function handleProjectChange(nextProjectId: string) {
    const nextTasks = tasks.filter((task) => task.projectId === nextProjectId);
    setProjectId(nextProjectId);
    setTaskId(nextTasks[0]?.id ?? `${nextProjectId}:general`);
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-4 rounded-lg border border-border bg-surface-2 p-5 shadow-sm">
      <div>
        <label className="text-sm font-medium text-text-primary" htmlFor="project">
          Project
        </label>
        <select
          id="project"
          className="mt-2 px-3 py-2"
          value={projectId}
          onChange={(event) => handleProjectChange(event.target.value)}
        >
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-text-primary" htmlFor="task">
          Task
        </label>
        <select
          id="task"
          className="mt-2 px-3 py-2"
          value={taskId}
          onChange={(event) => setTaskId(event.target.value)}
        >
          {selectedTaskOptions.map((task) => (
            <option key={task.id} value={task.id}>
              {task.title}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-text-primary" htmlFor="agent">
          Agent
        </label>
        <select
          id="agent"
          className="mt-2 px-3 py-2"
          value={agent}
          onChange={(event) => setAgent(event.target.value as AgentType)}
        >
          <option value="claude-code">Claude Code</option>
          <option value="codex">Codex</option>
          <option value="antigravity">Antigravity</option>
        </select>
      </div>

      <TextArea label="Summary" value={summary} onChange={setSummary} />
      <TextArea label="Changed files" value={changedFiles} onChange={setChangedFiles} />
      <TextArea label="Tests run" value={testsRun} onChange={setTestsRun} />
      <TextArea
        label="Remaining issues"
        value={remainingIssues}
        onChange={setRemainingIssues}
      />
      <TextArea
        label="Recommended next task"
        value={recommendedNextTask}
        onChange={setRecommendedNextTask}
      />

      {message ? <p className="text-sm text-text-primary">{message}</p> : null}

      <button
        className="rounded-md bg-pink-primary px-4 py-2.5 text-sm font-semibold text-background hover:bg-pink-soft disabled:bg-gray-600"
        disabled={isSaving || !summary.trim() || !projectId || !taskId}
        onClick={saveReport}
        type="button"
      >
        {isSaving ? "Saving..." : "Save session report"}
      </button>
    </section>
  );
}

function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = label.toLowerCase().replaceAll(" ", "-");

  return (
    <div>
      <label className="text-sm font-medium text-text-primary" htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className="mt-2 min-h-24 resize-y px-3 py-2 leading-6"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}

function splitLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}
