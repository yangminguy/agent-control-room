import { promises as fs } from "fs";
import path from "path";
import { AgentType, TaskStatus, Task } from "../types";
import { parseAgentType } from "./agent-state-parser";

export interface ParsedMarkdownTask {
  id: string;
  title: string;
  status: TaskStatus;
  recommendedAgent?: AgentType;
  priority: "P0" | "P1" | "P2";
  files: string[];
  tasks: string[];
  acceptanceCriteria: string[];
}

export function parseTaskStatus(val: string): TaskStatus {
  const normalized = val.toUpperCase().trim();
  if (normalized === "TODO") return "planned";
  if (normalized === "IN_PROGRESS") return "in_progress";
  if (normalized === "DONE") return "completed";
  if (normalized === "BLOCKED") return "blocked";
  return "draft";
}

export async function parseTasks(): Promise<ParsedMarkdownTask[]> {
  const filePath = path.join(process.cwd(), "docs", "TASKS.md");
  let content = "";
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (e) {
    return [];
  }

  const sections = content.split('\n### ');
  const parsedTasks: ParsedMarkdownTask[] = [];

  // Skip the first section since it's before the first '### '
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i];
    const lines = section.split('\n');
    const headerLine = lines[0];
    
    // e.g. T013 — Add AGENT_STATE.md parser
    const match = headerLine.match(/^(T\d+[A-Z]?)\s*[—-]\s*(.*)/);
    if (!match) continue;

    const id = match[1].trim();
    const title = match[2].trim();

    const task: ParsedMarkdownTask = {
      id,
      title,
      status: "draft",
      priority: "P2", // default
      files: [],
      tasks: [],
      acceptanceCriteria: []
    };

    let currentListSection = "";

    for (let j = 1; j < lines.length; j++) {
      const line = lines[j].trim();
      if (!line) continue;

      if (line.startsWith("Status:")) {
        const val = line.substring("Status:".length).trim();
        task.status = parseTaskStatus(val);
      } else if (line.startsWith("Recommended agent:")) {
        const val = line.substring("Recommended agent:".length).trim();
        task.recommendedAgent = parseAgentType(val);
      } else if (line.startsWith("Priority:")) {
        const val = line.substring("Priority:".length).trim();
        if (val === "P0" || val === "P1" || val === "P2") {
          task.priority = val;
        }
      } else if (line === "Files:") {
        currentListSection = "files";
      } else if (line === "Tasks:") {
        currentListSection = "tasks";
      } else if (line === "Acceptance criteria:") {
        currentListSection = "acceptanceCriteria";
      } else if (line.startsWith("- ") || line.startsWith("* ")) {
        const item = line.substring(2).trim();
        if (currentListSection === "files") {
          task.files.push(item.replace(/`/g, ''));
        } else if (currentListSection === "tasks") {
          task.tasks.push(item);
        } else if (currentListSection === "acceptanceCriteria") {
          task.acceptanceCriteria.push(item);
        }
      } else if (line.startsWith("Current code state:") || line.startsWith("Scope:")) {
        currentListSection = "none";
      }
    }
    parsedTasks.push(task);
  }

  return parsedTasks;
}

export function toDomainTask(parsed: ParsedMarkdownTask, projectId: string): Task {
  return {
    id: parsed.id,
    projectId,
    title: parsed.title,
    userIntent: parsed.tasks.join(" "),
    technicalSummary: `Files: ${parsed.files.join(", ")}`,
    status: parsed.status,
    recommendedAgent: parsed.recommendedAgent || "claude-code",
    priority: parsed.priority,
    acceptanceCriteria: parsed.acceptanceCriteria,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
