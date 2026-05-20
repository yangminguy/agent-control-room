# TASKS.md — Agent Control Room

## Status Legend
- `TODO`: not started
- `IN_PROGRESS`: currently being worked on
- `DONE`: completed
- `BLOCKED`: cannot proceed without decision or fix

## Product Definition
> Agent Control Room은 PM/비개발자가 구현하고 싶은 목표를 입력하면, 이를 기능 단위 계획으로 분해하고, Claude Code / Codex / Antigravity 같은 AI 개발 환경에 적절히 배정하며, 실행 결과를 분석해 기능 완성까지 이어주는 Human-in-the-loop AI 개발 오케스트레이션 운영실이다.

---

## Phase 1 — Manual Orchestration (완료)

### T001 — Initialize project structure
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T002 — Define domain types
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T003 — Create seed storage layer
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T004 — Build dashboard
Status: DONE  
Recommended agent: Antigravity  
Priority: P0

### T005 — Build project registration and list
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T006 — Build project detail page
Status: DONE  
Recommended agent: Antigravity  
Priority: P0

### T007 — Implement technical translation model
Status: DONE  
Recommended agent: Claude Code  
Priority: P0

### T008 — Implement task decomposer
Status: DONE  
Recommended agent: Claude Code  
Priority: P0

### T009 — Implement agent router
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T010 — Implement prompt generator
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T011 — Implement handoff generator
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T012 — Implement session report form
Status: DONE  
Recommended agent: Codex  
Priority: P0

### T013 — Add AGENT_STATE.md parser
Status: DONE  
Recommended agent: Codex  
Priority: P1

### T014 — Add TASKS.md parser
Status: DONE  
Recommended agent: Codex  
Priority: P1

### T015 — Add Advisor Mode
Status: DONE  
Recommended agent: Antigravity  
Priority: P1

Files created:
- `lib/types.ts` — AdvisorInput, AdvisorResponse types added
- `lib/orchestration/advisor-orchestrator.ts`
- `lib/orchestration/fallback-advisor.ts`
- `app/api/advisor/route.ts`
- `components/advisor/AdvisorForm.tsx`
- `components/advisor/AdvisorResultView.tsx`
- `app/advisor/page.tsx`

Acceptance criteria: ✓
- User technical question returns problem summary, likely causes, options, recommendation, risks, next prompt.
- Handled gracefully with a /advisor route.

---

## Phase 2 — Structured Planning (완료)

### T016 — Plan & Kanban Data Model
Status: DONE  
Recommended agent: Claude Code  
Priority: P1

> Before building a runner, we need a structured plan/task/agent model and Kanban card structure so execution is traceable.

Tasks:
- Define `FeaturePlan`, `PlanTask`, `PlanTaskStatus` types.
- Define Kanban card data model.
- Define Sub-agent track model.
- Create seed data for Plan/Kanban.
- Document in `docs/T016_PLAN_KANBAN_MODEL.md`.

Acceptance criteria:
- ✓ Data model can represent a feature plan with N tasks, each with an assigned agent and a status (Planned / Ready / Running / Done / Partial / Blocked).
- ✓ A Kanban card can display task title, agent, sub-agent tracks, status, and last result.
- ✓ Model is documented and typed in `lib/types.ts`.

Implemented files:
- `lib/types.ts`
- `data/feature-plans.json`
- `lib/storage/feature-plan-store.ts`

---

### T017 — HTML Implementation Plan View
Status: DONE  
Recommended agent: Antigravity  
Priority: P1

> A living, real-time checklist of what's been built and what's left. This is not a static document — it reflects actual plan state.

Tasks:
- Create `app/plan/page.tsx` — Implementation Plan View.
- Render plan tasks by status (Planned / Ready / Running / Done / Partial / Blocked / Needs Review).
- Show assigned agent per task.
- Show sub-agent tracks within a task.
- Allow user to manually mark a task done (MVP).

Acceptance criteria:
- ✓ The plan view shows all tasks and their statuses.
- ✓ When a task is completed, it visually updates.
- ✓ The view is readable by a non-developer.

Implemented files:
- `app/plan/page.tsx`
- `components/plan/KanbanBoard.tsx`
- `components/plan/KanbanCard.tsx`
- `app/api/plans/[planId]/tasks/[taskId]/route.ts`

---

## Phase 3 — Semi-Automated Execution (Current Focus)

### T018 — Agent Execution Runner
Status: DONE  
Recommended agent: Claude Code  
Priority: P2

> Not just a CLI button — this is the execution adapter that creates a Kanban card, creates a git branch, runs the agent, captures logs, and updates task status.

Tasks:
- T018-A: Research Spike (confirm Claude Code / Codex CLI non-interactive flags).
- T018-B: Implement safe branch creation before execution.
- T018-C: Implement `child_process.spawn` runner.
- T018-D: Implement SSE log streaming API.
- T018-E: Build RunnerLogView UI.
- T018-F: Update task status on completion.

Reference: `docs/T018_AGENT_EXECUTION_RUNNER_SPIKE.md`

Acceptance criteria:
- ✓ Runner API accepts a generated prompt for a plan task.
- ✓ A new git branch is created automatically.
- ✓ Logs stream to the UI in real time through SSE.
- ✓ Task status updates to `done` or `blocked` on completion.
- ✓ Execution logs are stored in `data/execution-logs.json`.

Implemented files:
- `lib/runner/git-utils.ts`
- `lib/runner/spawn-runner.ts`
- `app/api/runner/route.ts`
- `lib/storage/execution-log-store.ts`
- `components/runner/RunnerLogView.tsx`

Implementation note:
- `RunnerLogView` exists and calls `/api/runner`, but the next polish pass should wire it directly into the `/plan` task card flow so the Execute action is visible from each ready task.

---

### T019 — Git Diff & Outcome Analyzer
Status: TODO  
Recommended agent: Claude Code  
Priority: P2

> Not just a diff summarizer — this is the judgment layer that determines what was actually completed vs what the plan intended.

Tasks:
- Run `git diff --name-only` and `git diff` after execution.
- Send diff to LLM to generate a human-readable summary.
- Match diff changes to planned task items.
- Set task status to done / partial / blocked.
- Auto-populate the session report with the diff summary.
- Generate next recommended prompt.

Acceptance criteria:
- After agent execution, the diff is automatically captured.
- The system explains what was changed in plain language.
- Completed plan items are automatically marked done.
- A session report draft is auto-created.

---

## Phase 4 — Multi-Agent Routing

### T020 — Multi-Agent Router Enhancement
Status: TODO  
Recommended agent: Claude Code  
Priority: P2

Tasks:
- Enhance routing logic with real-time agent status.
- When preferred agent is cooling_down, auto-select fallback.
- Generate automatic handoff prompt when switching agents.
- Display routing decision and rationale in UI.

Acceptance criteria:
- System always has a recommended agent with a clear reason.
- If the recommended agent is unavailable, a fallback is automatically selected.
- A handoff document is generated when switching agents.

---
