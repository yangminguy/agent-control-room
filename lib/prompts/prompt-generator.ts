import type { AgentType, GeneratedTask } from "@/lib/types";

const AGENT_LABELS: Record<AgentType, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  antigravity: "Antigravity",
};

export function agentLabel(agent: AgentType): string {
  return AGENT_LABELS[agent];
}

export function generatePrompt(input: {
  agent: AgentType;
  projectName: string;
  projectContext: string;
  direction: string;
  task: GeneratedTask;
  assumptions: string[];
  risks: string[];
}): string {
  return `# Task for ${agentLabel(input.agent)}

## Project
${input.projectName}

## Context
${input.projectContext || "No project context was provided. State assumptions before editing."}

## User Direction
${input.direction}

## Current Task
${input.task.title}

## Technical Summary
${input.task.technicalSummary}

## Read First
- CLAUDE.md or AGENTS.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TASKS.md
- docs/AGENT_STATE.md

## Editable Files
- Only files needed for this task

## Do Not Edit
- Do not implement automatic Claude Code, Codex, or Antigravity execution.
- Do not add Slack, GitHub PR automation, auth, or token auto-detection.
- Do not refactor unrelated code.

## Acceptance Criteria
${input.task.acceptanceCriteria.map((criterion) => `- ${criterion}`).join("\n")}

## Assumptions
${input.assumptions.map((assumption) => `- ${assumption}`).join("\n") || "- None"}

## Risks
${input.risks.map((risk) => `- ${risk}`).join("\n") || "- None"}

## Required Report
After completion, report:
- changed files
- summary
- tests run
- completed items
- remaining issues
- recommended next task
- handoff needed?`;
}
