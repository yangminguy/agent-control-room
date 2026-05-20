# TASKS.md — Agent Control Room

## Status Legend

- `TODO`: not started
- `IN_PROGRESS`: currently being worked on
- `DONE`: completed
- `BLOCKED`: cannot proceed without a decision or fix

Full historical task log is archived at:
- `docs/archive/TASKS_FULL_2026-05-20_part_01.md` and `_part_02.md`

## Phase 1 — Manual Orchestration

Status: DONE

Completed:
- T001 — Initialize project structure
- T002 — Define domain types
- T003 — Create seed storage layer
- T004 — Build dashboard
- T005 — Build project registration and list
- T006 — Build project detail page
- T007 — Implement technical translation model
- T008 — Implement task decomposer
- T009 — Implement agent router
- T010 — Implement prompt generator
- T011 — Implement handoff generator
- T012 — Implement session report form
- T012-A — Session Report Project/Task Selection
- T013 — Add AGENT_STATE.md parser
- T014 — Add TASKS.md parser
- T015 — Add Advisor Mode

Key outputs:
- Direction to Prompt
- Advisor Mode
- Session Reports
- Project/task selection for Session Reports
- Handoffs
- Project pages
- Markdown parsers

## Phase 2 — Structured Planning

Status: DONE

### T016 — Plan & Kanban Data Model

Status: DONE  
Recommended agent: Claude Code  
Priority: P1

Implemented:
- `FeaturePlan`
- `PlanTask`
- `PlanTaskStatus`
- `KanbanCard`
- `SubAgentTrack`
- `DiffSummary`
- `ExecutionLog`
- `data/feature-plans.json`
- `lib/storage/feature-plan-store.ts`

Acceptance criteria:
- Data model represents a feature plan with N tasks.
- Each task has assigned agent, status, acceptance criteria, and sub-agent tracks.
- Kanban card can show task, agent, status, prompt, result, and next prompt.
- `npm run typecheck` and `npm run lint` pass.

### T017 — HTML Implementation Plan View

Status: DONE  
Recommended agent: Antigravity  
Priority: P1

Implemented:
- `app/plan/page.tsx`
- `components/plan/KanbanBoard.tsx`
- `components/plan/KanbanCard.tsx`
- `app/api/plans/[planId]/tasks/[taskId]/route.ts`

Acceptance criteria:
- Plan view shows all tasks and statuses.
- Task status can be updated manually.
- View is readable by a non-developer.

## Phase 3 — Semi-Automated Execution

Status: DONE

### T018 — Agent Execution Runner

Status: DONE  
Recommended agent: Claude Code  
Priority: P2

Implemented:
- `lib/runner/git-utils.ts`
- `lib/runner/spawn-runner.ts`
- `app/api/runner/route.ts`
- `lib/storage/execution-log-store.ts`
- `components/runner/RunnerLogView.tsx`

Acceptance criteria:
- Runner API accepts a generated prompt for a plan task.
- New git branch is created before execution.
- Logs stream to the UI through SSE.
- Task status updates to `done` or `blocked` on completion.
- Execution logs are stored in `data/execution-logs.json`.

Note:
- `RunnerLogView` is wired directly inside `/plan` task cards for Claude Code and Codex tasks.

### T019 — Git Diff & Outcome Analyzer

Status: DONE  
Recommended agent: Claude Code  
Priority: P2

Implemented:
- `lib/analyzer/git-diff-analyzer.ts` with deterministic diff analysis.
- `/api/analyzer` endpoint for POST analysis requests.
- Conservative completion judgment logic (completed/partial/not_completed/pending).
- Integration with `updateKanbanCardResult` for feature plan updates.

Acceptance criteria met:
- Analyzer returns changed files, summary, completion judgment, and next prompt.
- Completed/partial/not_completed/pending judgments reflected in `data/feature-plans.json`.
- No auto-merge; human-in-the-loop preserved.
- `npm run typecheck` and `npm run lint` pass.

## Phase 4 — Multi-Agent Routing

### T020 — Multi-Agent Router Enhancement

Status: DONE  
Recommended agent: Claude Code  
Priority: P2

Implemented:
- Enhanced `routeAgent()` to handle "limited", "cooling_down", and "blocked" states.
- Auto-select fallback agent when preferred agent unavailable.
- Generate handoff prompt via `generateAgentSwitchHandoffPrompt()`.
- Extended `RoutingResult` type with `statusReason`, `handoffRequired`, `handoffPrompt`.
- Updated `OrchestrationResult` type to include handoff fields.
- Enhanced `DirectionOrchestrator` UI to display routing rationale, fallback agent, and handoff prompt.
- Typecheck and lint verified.

Acceptance criteria met:
- Agent status from routing decision respected.
- Fallback agent recommended when primary unavailable.
- Handoff prompt generated on agent switch.
- UI displays routing rationale, status reason, and handoff prompt.
- `npm run typecheck` and `npm run lint` pass.

### T021 — Token / Rate Limit Handoff

Status: TODO  
Recommended agent: Codex  
Priority: P3

Tasks:
- Allow user to manually set agent status.
- Generate handoff on status change.
- Show next available agent recommendation.

## Phase 5 — Autonomous Loop

### T022 — Autonomous Execution Loop

Status: TODO  
Recommended agent: Claude Code  
Priority: P3

Goal:
- After each cycle, generate the next prompt and ask the user whether to continue.

## Immediate Next Task

T021 — Token / Rate Limit Handoff

Next prompt target:
- Codex

Read first:
- `docs/ARCHITECTURE.md`
- `docs/AGENT_STATE.md`
- `docs/TASKS.md`

## Latest Session Report

Summary:
- T020 Multi-Agent Router Enhancement implemented.
- Agent routing now handles "limited", "cooling_down", and "blocked" states.
- Automatic fallback agent selection with handoff prompt generation.
- UI enhanced to display routing rationale and handoff requirements.

Tests run:
- `npm run typecheck` ✓
- `npm run lint` ✓
- API test (blocked/limited states) ✓

Completed:
- T020 Multi-Agent Router Enhancement
- RoutingResult type with statusReason, handoffRequired, handoffPrompt
- OrchestrationResult type extended for handoff fields
- DirectionOrchestrator UI component enhanced

Remaining:
- T021 Token / Rate Limit Handoff
- T022 Autonomous Execution Loop
- Real Vibe Kanban issue creation bridge
