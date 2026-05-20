# PROMPT_TEMPLATES.md — Agent Control Room

## 1. Universal Task Prompt
```md
# Task for {agent}

## Project
{projectName}

## Context
{projectContext}

## Current Task
{taskTitle}

## User Intent
{userIntent}

## Technical Summary
{technicalSummary}

## Read First
- CLAUDE.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TASKS.md
- docs/AGENT_STATE.md

## Editable Files
{editableFiles}

## Do Not Edit
{forbiddenFiles}

## Acceptance Criteria
{acceptanceCriteria}

## Tests To Run
{tests}

## Constraints
- Do not make unrelated changes.
- Keep the implementation aligned with MVP scope.
- Do not implement automatic AI tool execution unless the task explicitly says so.

## Required Report
After completion, report:
- changed files
- summary
- tests run
- remaining issues
- recommended next task
```

## 2. Claude Code Planning Prompt
```md
# Planning Task for Claude Code

Review the project documents and produce a technical plan.

Read first:
- CLAUDE.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TASKS.md

Goal:
{goal}

Return:
1. Current understanding
2. Technical interpretation
3. Small task breakdown
4. Recommended implementation order
5. Risks
6. Files likely to change
7. Prompt for the next implementation agent

Do not write code unless explicitly asked.
```

## 3. Codex Implementation Prompt
```md
# Implementation Task for Codex

Implement this bounded task only.

Project:
{projectName}

Task:
{taskTitle}

Read first:
{readFirstDocs}

Editable files:
{editableFiles}

Do not edit:
{forbiddenFiles}

Acceptance criteria:
{acceptanceCriteria}

Run:
{tests}

Return a session report with changed files, summary, tests run, remaining issues, and recommended next task.
```

## 4. Antigravity UI Prompt
```md
# UI Implementation Task for Antigravity

Build or improve the following UI flow.

Project:
{projectName}

Screen:
{screenName}

User goal:
{userGoal}

Components needed:
{components}

Visual constraints:
- Clean dashboard style
- Clear cards
- Strong information hierarchy
- No excessive visual complexity

Editable files:
{editableFiles}

Do not edit:
{forbiddenFiles}

Acceptance criteria:
{acceptanceCriteria}

Return changed files, UI decisions, remaining issues, and recommended next task.
```
