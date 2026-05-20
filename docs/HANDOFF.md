# HANDOFF.md — Agent Control Room

## Current Handoff Status
Phase 1-3 implementation complete. Agent Control Room now has full manual orchestration, structured planning, and semi-automated execution with diff analysis.

Implemented:
- Next.js App Router project scaffold.
- TypeScript domain types.
- Tailwind styling.
- Local JSON seed storage.
- Direction to Prompt screen.
- OpenAI Responses API structured output endpoint.
- Local fallback orchestration.
- Editable copy-ready prompt preview.
- Session report form, project/task selection, and local JSON persistence.
- `/api/orchestrate` for direction orchestration.
- `/api/reports` for session report reads and writes.
- Vibe Kanban source downloaded to `external/vibe-kanban`.
- Vibe Kanban dependencies and Rust toolchain installed.
- Vibe Kanban local frontend/backend verified.
- Open-source analysis, base decision, and implementation mapping documents created.
- Vibe Kanban issue draft converter added in `lib/integrations/vibe-kanban.ts`.
- T016 Plan & Kanban Data Model implemented in `lib/types.ts`, `data/feature-plans.json`, and `lib/storage/feature-plan-store.ts`.
- T017 HTML Implementation Plan View implemented at `/plan` with Kanban board/card components and manual status updates.
- T018 Agent Execution Runner implemented with git branch creation, `child_process.spawn`, SSE log streaming, execution log storage, and `RunnerLogView`.
- T019 Git Diff & Outcome Analyzer implemented with `lib/analyzer/git-diff-analyzer.ts` and `/api/analyzer` endpoint.
- `/plan` task cards now wire `RunnerLogView` directly for Claude Code and Codex tasks.
- T021 Token / Rate Limit Handoff implemented at `/agent-status` with manual status updates, fallback recommendation, and copy-ready handoff preview.

Verified:
- `npm run typecheck`
- `npm run lint`
- Vibe Kanban frontend returned HTTP 200 at `http://localhost:3002/`.
- Vibe Kanban backend health returned OK at `http://localhost:3003/api/health`.

Changed files from latest T019 implementation:
- `lib/analyzer/git-diff-analyzer.ts` (new)
- `app/api/analyzer/route.ts` (new)
- `docs/AGENT_STATE.md`
- `docs/HANDOFF.md`

Changed files from latest T021 implementation:
- `app/agent-status/page.tsx`
- `app/api/agent-status/route.ts`
- `docs/AGENT_STATE.md`
- `docs/HANDOFF.md`
- `docs/TASKS.md`

Changed files from previous Codex UI wiring:
- `app/plan/page.tsx`
- `app/reports/page.tsx`
- `components/SessionReportForm.tsx`
- `components/plan/KanbanBoard.tsx`
- `components/plan/KanbanCard.tsx`
- `components/runner/RunnerLogView.tsx`
- `docs/AGENT_STATE.md`
- `docs/HANDOFF.md`
- `docs/TASKS.md`

Previous session changed files (T016-T018):
- `tsconfig.json`
- `lib/types.ts`
- `lib/integrations/vibe-kanban.ts`
- `lib/storage/feature-plan-store.ts`
- `lib/runner/git-utils.ts`
- `lib/runner/spawn-runner.ts`
- `lib/storage/execution-log-store.ts`
- `app/api/runner/route.ts`
- `components/plan/KanbanBoard.tsx`
- `components/plan/KanbanCard.tsx`
- `components/runner/RunnerLogView.tsx`
- `docs/TASKS.md`
- `docs/DECISIONS.md`
- `docs/ARCHITECTURE.md`
- `docs/PRD.md`

Remaining issues:
- First MCP/API bridge to actually create Vibe Kanban issues is not implemented yet.
- No `/api` route, MCP client, or local HTTP client currently calls Vibe Kanban issue creation.
- `data/feature-plans.json` currently uses `project-agent-control-room` while `data/projects.json` uses `agent-control-room`; UI handles both ids, but the seed data should be reconciled later.
- T022 Autonomous Execution Loop is next focus.
- `npm install` reported 5 audit vulnerabilities.
- Upstream Vibe Kanban says it is sunsetting; avoid deep fork work until the bridge proves useful.

This document defines the handoff format that every AI coding tool should use when transferring work to another tool.

---

## Handoff Template

```md
# Handoff

## From
{fromAgent}

## To
{toAgent}

## Transfer Reason
{reason}

## Project
{projectName}

## Task
{taskTitle}

## Context Summary
{shortContextSummary}

## Completed Work
- {completedItem1}
- {completedItem2}

## Remaining Work
- {remainingItem1}
- {remainingItem2}

## Changed Files
- {file1}
- {file2}

## Files To Read First
- CLAUDE.md
- docs/PRD.md
- docs/ARCHITECTURE.md
- docs/TASKS.md
- docs/AGENT_STATE.md
- docs/HANDOFF.md

## Do Not Edit
- {forbiddenFile1}
- {forbiddenFile2}

## Acceptance Criteria
- {criterion1}
- {criterion2}

## Cautions
- {caution1}
- {caution2}

## Next Prompt
```txt
{copyReadyPromptForNextAgent}
```
```

---

## Tool-Specific Handoff Guidance

### Claude Code → Codex
Use when:
- Architecture is decided.
- Implementation is clear.
- Remaining work is bounded.

Handoff must include:
- Exact files to edit
- Exact acceptance criteria
- Tests to run
- What not to refactor

### Codex → Claude Code
Use when:
- Implementation reveals architecture ambiguity.
- Multiple design paths exist.
- PRD or architecture needs revision.

Handoff must include:
- What was attempted
- Where ambiguity appeared
- Options considered
- Recommended decision question

### Claude Code / Codex → Antigravity
Use when:
- UI implementation needs product/visual refinement.
- Multi-file screen work is needed.
- Layout, state, and visual hierarchy matter.

Handoff must include:
- Target screens
- Component list
- UX behavior
- Visual constraints
- Do-not-change logic files

### Antigravity → Codex
Use when:
- UI exists but type errors, tests, or logic cleanup remain.

Handoff must include:
- Changed UI files
- Known issues
- Type errors if any
- Expected behavior

---

## Current Handoff Recommendation
The next handoff should be:

From: Codex  
To: Claude Code  
Reason: T022 Autonomous Execution Loop needs architecture-level workflow design and human-in-the-loop guardrail decisions.

Next prompt:
```txt
Implement T022 (Autonomous Execution Loop) for Agent Control Room.

Read first:
- CLAUDE.md
- docs/ARCHITECTURE.md
- docs/AGENT_STATE.md
- docs/TASKS.md
- docs/HANDOFF.md

Current state:
- T021 is complete.
- `/agent-status` supports manual status changes for Claude Code, Codex, and Antigravity.
- Status changes persist through `data/agent-statuses.json`.
- Transfer states generate saved handoff prompts and next-agent recommendations.

Task:
- Design and implement the smallest human-approved cycle continuation flow.
- After an execution/analyzer result, present the generated next prompt.
- Ask the user whether to continue before starting another agent action.
- Preserve current plan/task context when continuing.

Do not:
- Implement automatic token usage detection.
- Start another execution without explicit user approval.
- Auto-merge or auto-commit.
- Build Slack/GitHub notification integrations.

Acceptance criteria:
- User sees a next prompt after a cycle result.
- User can explicitly continue or stop.
- Continue action keeps plan/task context intact.
- No next execution starts without user approval.
- `npm run typecheck` and `npm run lint` pass.

Report back with:
- changed files
- summary
- tests run
- remaining issues
- recommended next task
```
