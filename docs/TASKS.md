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

Status: DONE  
Recommended agent: Codex  
Priority: P3

Implemented:
- `/agent-status` lets the user manually set `available`, `limited`, `cooling_down`, `blocked`, or `manual_only`.
- Status changes persist through `/api/agent-status` and `data/agent-statuses.json`.
- Runtime fallback recommendation is returned after a manual status change.
- Handoff prompts are generated and saved when a status requires agent transfer.
- Copy-ready handoff preview is shown in the UI.

Acceptance criteria met:
- User can update agent status via `/agent-status`.
- Status changes persist in `data/agent-statuses.json`.
- Handoff prompt generated on manual status change for unavailable/manual transfer states.
- UI shows recommended fallback agent and reason.
- `npm run typecheck` and `npm run lint` pass.

## Phase 5 — Autonomous Loop

### T022 — Autonomous Execution Loop

Status: DONE  
Recommended agent: Claude Code  
Priority: P3

Implemented:
- KanbanCard: Auto-run analyzer after execution completion
- Loop Approval UI: Display judgment badge, nextPrompt preview, Continue/Stop buttons
- RunnerLogView: Pass branchName to onComplete callback
- `/api/loop-continue` endpoint: Prepare next task with updated generatedPrompt
- State management: isAnalyzing, analysisResult, branchName, showLoopApproval

Acceptance criteria met:
- After execution completes → Analyzer auto-called → Judgment displayed
- Continue button → Next task ready with updated prompt
- Stop button → Current result preserved
- Human-in-the-loop loop design (no auto-execution)
- `npm run typecheck` and `npm run lint` pass

## Phase 6 — Loop UX Refinement

Status: DONE

### T023 — Loop UX Polish

Status: DONE  
Recommended agent: frontend-developer  
Priority: P1

Implemented:
- Continue/Stop feedback banners with state messages
- Error handling for analyzer/runner failures with Retry buttons
- Loop Approval UI improvements (judgment badge, diff summary, next prompt label)
- `loopMessage` state with type-safe messaging (success/error/info)

Acceptance criteria met:
- Continue/Stop feedback displays immediately and distinctly
- Errors are recoverable with Retry buttons
- Loop Approval shows context before user decides
- `npm run typecheck` and `npm run lint` pass

## Phase 7 — Security Hardening

Status: DONE

### T025 — Security & Dependency Hardening

Status: DONE  
Recommended agent: dependency-manager + security-review  
Priority: P2

Implemented:

**Phase 7a — npm Audit Fix:**
- Upgraded next 14.2.30 → 15.5.16 (3 vulnerabilities fixed)
- Upgraded postcss 8.5.6 → 8.5.14 (XSS vulnerability GHSA fixed)
- 2 moderate remaining (Next.js bundled postcss, not exploitable in this app)

**Phase 7b — API Security:**
- Added `validateCwdSafety()` function to prevent path traversal
- Applied cwd validation to `/api/runner` and `/api/analyzer`
- Verified Zod input validation on `/api/loop-continue` and `/api/reports`

Acceptance criteria met:
- Direct dependency vulnerabilities: 0 critical/high
- Path traversal attacks blocked (403 on invalid paths)
- Input validation complete
- `npm run typecheck` and `npm run lint` pass

## Phase 8 — Vibe Kanban & Supabase Integration

Status: DONE

### T024 — Vibe Kanban Real HTTP Integration

Status: DONE  
Recommended agent: backend-developer + frontend-developer  
Priority: P2

Implemented:

**Backend (`lib/integrations/vibe-kanban.ts`):**
- Fixed API path: `/api/issues` → `/api/remote/issues`
- Added `listProjects(orgId)` and `listStatuses(projectId)` methods
- Added required fields: `project_id`, `status_id`, `sort_order`, `extension_metadata`
- Created proxy endpoints: `/api/vibe-kanban/projects` and `/api/vibe-kanban/statuses`

**Frontend (`SendToVibeKanbanButton.tsx`):**
- Added Dialog with orgId input (or auto-fill from env var)
- Project selection dropdown (fetches from `/api/vibe-kanban/projects`)
- Status selection dropdown (fetches from `/api/vibe-kanban/statuses`)
- Issue creation with both selections
- Error handling and UI state feedback

Acceptance criteria met:
- Real HTTP calls to `/api/remote/issues` with all required fields
- Project/status selection UI functional
- Mock mode fallback preserved
- `npm run typecheck` and `npm run lint` pass

### T026 — Supabase Storage Migration

Status: DONE  
Recommended agent: data-engineer  
Priority: P2

Implemented:
- 7-table PostgreSQL schema (`projects`, `tasks`, `handoffs`, `session_reports`, `feature_plans`, `execution_logs`, `agent_statuses`)
- `lib/storage/supabase-client.ts` with environment-based switching
- All storage layers updated with Supabase fallback pattern
- Migration SQL: `supabase/migrations/20260521_initial_schema.sql`
- RLS policies enabled (allow-all for single-user personal tool)

Acceptance criteria met:
- Supabase migration applied successfully
- 7 tables created with 0 rows (seed data optional)
- JSON fallback logic in place
- Environment variables documented
- `npm run typecheck`, `npm run lint`, and `npm run build` pass

## Post-Phase-8 Polish Tasks

Status: DONE (2026-05-21)

### Seed Data ID Reconciliation

Status: DONE  
Priority: P3

Fixed:
- `data/feature-plans.json`: `projectId` "project-agent-control-room" → "agent-control-room"
- Reconciled with `data/projects.json` primary key

### Vibe Kanban Project Selection UX

Status: DONE  
Priority: P3

Enhanced:
- Dialog-based project/status selector
- Environment variable support (`VIBE_KANBAN_ORG_ID`)
- API error handling with retry

### Supabase Deployment Configuration

Status: DONE  
Priority: P3

Completed:
- Supabase MCP: Applied schema migration
- Created 7 tables with RLS enabled
- Generated API credentials
- Documented environment variable setup

## Latest Session Report (2026-05-21)

Summary:
- Phase 6-8b (T023-T026) completed with QA pass
- Seed data reconciliation, Vibe Kanban full HTTP, Supabase schema deployed
- 3 additional polish tasks completed
- `npm audit`: 2 moderate (Next.js bundle, not exploitable)
- All core loops stable, ready for production use

Tests run:
- `npm run typecheck` ✓
- `npm run lint` ✓
- `npm run build` ✓
- `npm test` ✓ (34/34 tests pass)
- `npm audit` ✓ (0 direct critical/high)

Completed:
- T023 Loop UX (feedback, errors, Retry buttons)
- T025 Security (npm audit fix, path validation)
- T024 Vibe Kanban (real HTTP, project/status selection)
- T026 Supabase (schema, storage layer, fallback pattern)
- Seed data ID reconciliation
- Vibe Kanban UX enhancement
- Supabase deployment setup

Remaining:
- Vibe Kanban scratch API project selection (future, optional)
- Multi-user auth support (future, after MVP)
