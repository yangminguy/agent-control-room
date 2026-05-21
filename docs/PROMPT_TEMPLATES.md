# PROMPT_TEMPLATES.md — Agent Control Room

## 1. Senior Dev Prompt Compiler Standard

Every generated implementation prompt should include these sections when relevant:
- Goal
- Product Context
- Current Implementation Context
- Scope
- Non-goals
- Files to Inspect First
- Files Allowed to Edit
- Data Model Changes
- UI Requirements
- Do-Not-Do Rules
- Acceptance Criteria
- Tests / Checks
- Handoff Instructions

The compiler's job is to convert broad non-developer direction into a bounded, senior-developer-quality task. It should stay copy-ready and avoid speculative features.

## 2. Universal Task Prompt
```md
# Task for {agent}

## Goal
{goal}

## Product Context
{projectName}

{projectContext}

## Current Implementation Context
{implementationContext}

## Current Task
{taskTitle}

## User Intent
{userIntent}

## Technical Summary
{technicalSummary}

## Scope
{scope}

## Non-goals
{nonGoals}

## Files to Inspect First
- CLAUDE.md
- AGENTS.md
- docs/CONTROL_TOWER_DIRECTION.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TASKS.md
- docs/AGENT_STATE.md

## Files Allowed to Edit
{editableFiles}

## Data Model Changes
{dataModelChanges}

## UI Requirements
{uiRequirements}

## Do Not Edit
{forbiddenFiles}

## Acceptance Criteria
{acceptanceCriteria}

## Tests To Run
{tests}

## Do-Not-Do Rules
- Do not make unrelated changes.
- Keep the implementation aligned with the AI Development Control Tower direction.
- Do not implement automatic AI tool execution unless the task explicitly says so.
- Do not add auto-merge, uncontrolled deployment automation, or unsafe autonomous DB migration.

## Handoff Instructions
After completion, report:
- changed files
- summary
- tests run
- remaining issues
- recommended next task
```

## 3. Claude Code Planning Prompt
```md
# Planning Task for Claude Code

Review the project documents and produce a technical plan.

Read first:
- CLAUDE.md
- AGENTS.md
- docs/CONTROL_TOWER_DIRECTION.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TASKS.md

Goal:
{goal}

Return:
1. Current understanding
2. Technical interpretation
3. Roadmap stage breakdown
4. Small task breakdown
5. Recommended implementation order
6. Risks and user decision points
7. Files likely to change
8. Prompt for the next implementation agent
9. Context Pack if the current session is overloaded

Do not write code unless explicitly asked.
```

## 4. Codex Implementation Prompt
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

Return a session report with changed files, summary, tests run, remaining issues, recommended next task, and any Obsidian insight candidates.
```

## 5. Antigravity UI Prompt
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
- Roadmap-first control panel, not only kanban board
- Clear completion check marks
- Strong information hierarchy for non-developer PMs
- Current task, next action, responsible agent, blockers, and acceptance criteria visible
- No excessive visual complexity

Editable files:
{editableFiles}

Do not edit:
{forbiddenFiles}

Acceptance criteria:
{acceptanceCriteria}

Return changed files, UI decisions, remaining issues, and recommended next task.
```

## 6. Context Pack Template
```md
# Context Pack

## Project Goal
{projectGoal}

## Current Product Direction
{productDirection}

## Completed Work
{completedWork}

## Changed Files
{changedFiles}

## Important Decisions
{importantDecisions}

## Current Blockers
{blockers}

## Next Task
{nextTask}

## Acceptance Criteria
{acceptanceCriteria}

## Do Not Do
{doNotDo}

## Prompt for Next Session
{nextPrompt}
```

## 7. Token Relay Prompt (for relay agent)
```md
# Token Relay from {sourceAgent} to {relayAgent}

This is a token relay. {sourceAgent} completed architectural/implementation work; 
your task is to continue with fresh context.

## Context Summary

**Goal**: {goal}

**Completed by {sourceAgent}**:
{completedWork}

**Changed Files**:
{changedFiles}

**Important Decisions**:
{importantDecisions}

**Current Blockers** (if any):
{blockers}

## Your Task

Continue with the remaining work:
{remainingWork}

## Acceptance Criteria
{acceptanceCriteria}

## Files Allowed to Edit
{editableFiles}

## Files BLOCKED from Editing
{forbiddenFiles}

## Do-Not-Do Rules
{doNotDo}

## When You're Done
1. Run: {tests}
2. Submit session report with:
   - Changed files
   - Summary of what you completed
   - Remaining issues (if any)
   - Recommended next task
3. Indicate if {sourceAgent} should review + integrate before merge

---

Reference: See [[CONTEXT_TOKEN_RESUME_PROTOCOL.md]] for full relay protocol.
```

## 8. Parallel Execution Prompt Preamble
When multiple agents are working in parallel, include this preamble:

```md
# Parallel Execution Notice

You are working in parallel with {otherAgent} on {otherTask}.

**Your work**: {yourTask}

**Their work**: {theirTask}

**Files you CAN edit**: {yourEditableFiles}

**Files they CANNOT edit** (reserved for you): {theirBlockedFiles}

**Files you CANNOT edit** (reserved for them): {yourBlockedFiles}

**Coordination rule**: If you need to edit any of their blocked files, STOP and ask the user.

When both tasks are complete, we will integrate the results together.
```
