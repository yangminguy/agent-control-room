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
- `/agent-status` lets the user manually set agent availability; the next model alignment expands statuses to `available`, `cooling_down`, `token_limited`, `blocked`, `context_overloaded`, `manual_only`, and `experimental`.
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

## Phase 9 — Roadmap-First Control Tower UX

Status: IN_PROGRESS (Foundation Complete, T027 DONE)

Strategic direction:
- Agent Control Room is the AI Development Control Tower for non-developer PMs.
- `/plan` becomes a Visual Development Roadmap Control Panel, not only a kanban board.
- Senior Dev Prompt Compiler becomes the standard prompt-generation module.
- Agent availability, context reset, token handoff, Obsidian memory, and Hermes background-worker positioning are documented before implementation.
- Vibe Kanban remains the execution workbench and should not be cloned.

### T027 — `/plan` Visual Development Roadmap Control Panel

Status: DONE  
Recommended agent: Claude Code (Data Model) + Antigravity (UI Components)  
Priority: P1

Goal:
- Reframe `/plan` around the full product development roadmap for a non-developer PM.

Completed:
- **Data Model Foundation (Claude)**:
  - `lib/types.ts`: RoadmapStatus, RoadmapBlocker, RoadmapUserDecision, RoadmapStage, Roadmap types
  - `lib/roadmap.ts`: Helper functions (getRoadmapProgress, getActiveRoadmapStage, getBlockedStages, etc.)
  - `data/roadmap.json`: 10-phase sample roadmap with complete stage data
  - `lib/storage/roadmap-store.ts`: Storage layer with Supabase fallback
  - `app/api/roadmap/route.ts`: GET endpoint for roadmap data

- **UI Components (Antigravity)**:
  - `components/roadmap/RoadmapTimeline.tsx`: Timeline visualization
  - `components/roadmap/RoadmapStageCard.tsx`: Individual stage cards
  - `components/roadmap/RoadmapStatusBadge.tsx`: Status indicators
  - `components/roadmap/AgentBadge.tsx`: Agent assignment display

- **Integration (Claude)**:
  - `lib/roadmap-ui-adapter.ts`: Data model ↔ UI component adapter
  - `/plan` page updated with roadmap-first layout
  - Existing Kanban board preserved as detail view

Acceptance criteria met:
- ✅ `/plan` shows roadmap stages with all required states (completed, active, waiting, blocked, user_input_required)
- ✅ Completed stages show check marks
- ✅ Active stages show responsible agent, current task, next action
- ✅ Blocked stages show blocker reason
- ✅ User-input-required stages show exact user question
- ✅ Acceptance criteria visible
- ✅ Existing Kanban functionality preserved
- ✅ typecheck, lint, build all pass

Completed Tasks:
- Roadmap data model and types defined
- Roadmap helper functions implemented
- Sample roadmap data with 10 phases created
- Storage layer with Supabase support
- API endpoint for roadmap data
- UI components for roadmap visualization
- Adapter layer for data ↔ UI mapping
- `/plan` page refactored as Control Tower (roadmap-first)
- Agent Status Panel data layer added
- Self-review and status corrections applied

Branched from: acr/roadmap-foundation-20260521
Changed files: lib/types.ts, lib/roadmap.ts, lib/roadmap-ui-adapter.ts, lib/agents/agent-status.ts, app/plan/page.tsx, data/roadmap.json, docs/ROADMAP_DATA_MODEL.md

### T027-Hermes — Hermes Packet Draft UI (Safe Static Generation)

Status: DONE  
Recommended agent: Claude Code  
Priority: P1

Goal:
- Design and implement a safe, static UI for generating Hermes task packets without execution.
- Clearly communicate that Hermes is a background worker, not an auto-executor.
- Users should be able to preview, copy, and manually submit packets.

Implemented:

**Type System** (`lib/hermes/types.ts`):
- HermesPacket, HermesSection, HermesPacketKind types
- 6 supported packet kinds: session-summary, context-pack, handoff-pack, failed-task-review, background-research, obsidian-note

**Packet Generators** (`lib/hermes/task-packets.ts`):
- 6 generator functions (one per kind)
- `renderHermesPacketMarkdown()`: Convert packets to copy-ready Markdown
- `exportHermesPacketJSON()`: Export structured JSON
- `HERMES_PACKET_KINDS`: Dictionary of kind labels and descriptions

**Example Data** (`data/hermes-task-packets.json`):
- 6 example packets (one of each kind)
- All follow the Hermes spec with sections, metadata

**UI** (`app/hermes-packets/page.tsx` + `components/hermes/PacketDraftCard.tsx`):
- Static page with example packets
- Grid layout with PacketDraftCard components
- View mode toggle: Markdown preview ↔ JSON data
- Copy-to-clipboard button (both formats)
- Safety notice: "Hermes is not executed" (prominent, amber banner)
- Kind-based filtering and display

**Integration** (`components/agents/AgentStatusCard.tsx`):
- Safe link from Hermes agent card to `/hermes-packets`
- "패킷 드래프트 보기" (View Packet Drafts)
- Minimal change: 1 import + 1 Link element

Acceptance criteria met:
- ✅ Hermes Packet Draft UI exists at `/hermes-packets`
- ✅ All 6 packet kinds displayed and functional
- ✅ Safety language clear: "Hermes is not executed" (top of page)
- ✅ Users can preview Markdown and JSON
- ✅ Copy-to-clipboard works for both formats
- ✅ No execution code added (no runner/spawn wiring)
- ✅ No package.json changes
- ✅ No database migrations
- ✅ typecheck, lint, build all pass
- ✅ No unrelated file changes

Changed files:
- lib/hermes/types.ts (new)
- lib/hermes/task-packets.ts (new)
- data/hermes-task-packets.json (new)
- app/hermes-packets/page.tsx (new)
- components/hermes/PacketDraftCard.tsx (new)
- components/agents/AgentStatusCard.tsx (1 import + 1 link for Hermes)

### T028 — Senior Dev Prompt Compiler Structure

Status: TODO  
Recommended agent: Claude Code  
Priority: P1

Goal:
- Standardize generated prompts so weak product direction becomes precise implementation instructions.

Acceptance criteria:
- Generated prompts include goal, product context, implementation context, scope, non-goals, files to inspect first, files allowed to edit, data model changes, UI requirements, do-not-do rules, acceptance criteria, test/check instructions, and handoff instructions.
- Existing prompt generation remains copy-ready.
- No unrelated UI or dependency changes.

### T029 — Agent Availability Manager Status Model

Status: TODO  
Recommended agent: Codex  
Priority: P1

Goal:
- Align agent availability around the statuses required for control-tower routing and handoffs.

Acceptance criteria:
- Supported statuses are `available`, `cooling_down`, `token_limited`, `blocked`, `context_overloaded`, `manual_only`, and `experimental`.
- Unavailable agents produce a fallback handoff or Context Pack recommendation.
- Token usage remains manually tracked unless a future task explicitly implements an integration.

### T030 — Context Reset Protocol and Context Pack Generator

Status: TODO  
Recommended agent: Claude Code  
Priority: P1

Goal:
- Add the workflow for preserving context when a session is token-limited, overloaded, blocked, or ready to move to another agent.

Acceptance criteria:
- Context Pack includes project goal, current product direction, completed work, changed files, important decisions, blockers, next task, acceptance criteria, do-not-do rules, and next prompt.
- The protocol does not depend on literal `/clear` automation.
- Human approval remains required before risky continuation.

### T031 — Obsidian Knowledge Memory Export

Status: TODO  
Recommended agent: Codex  
Priority: P2

Goal:
- Export durable development insights as Obsidian-compatible Markdown.

Acceptance criteria:
- Export supports development insights, technical decisions, failed attempts, successful prompt patterns, agent performance notes, handoffs, and reusable checklists.
- Generated Markdown includes useful frontmatter where appropriate.
- No external sync or vault automation is required in the first implementation.

### T032 — Hermes Background Worker Positioning

Status: TODO  
Recommended agent: Claude Code  
Priority: P2

Goal:
- Represent Hermes as an optional background/status/memory worker without making it the primary coding brain.

Acceptance criteria:
- Hermes is suitable for monitoring, recurring summaries, Obsidian note generation, development log summarization, and retry candidate discovery.
- Hermes is explicitly blocked from high-risk autonomous code changes, DB migrations, deployment, and auto-merge without explicit user approval.

## Phase 10 — Vibe Kanban Workbench Bridge

Status: TODO

Strategic direction:
- Agent Control Room remains the orchestration brain/control tower.
- Vibe Kanban becomes the execution workbench.
- Do not expand internal kanban/session/diff UI when Vibe Kanban can provide the stronger surface through a stable bridge.

### T033 — Vibe Kanban Open Workspace/Card Link

Status: TODO  
Recommended agent: Codex  
Priority: P1

Goal:
- After sending a task to Vibe Kanban, store enough returned metadata to let the user open the created Vibe Kanban card/workspace from Agent Control Room.

Acceptance criteria:
- `SendToVibeKanbanButton` shows a durable open link after successful issue creation.
- The link target is stored with the related project/task where feasible.
- Missing `VIBE_KANBAN_URL` or mock mode produces clear UI copy instead of a broken link.
- `npm run typecheck` and `npm run lint` pass.

### T034 — Vibe Kanban Workspace/Session Launch Adapter

Status: TODO  
Recommended agent: Claude Code  
Priority: P1

Goal:
- Confirm the smallest stable Vibe Kanban API/MCP surface for starting or opening an execution workspace/session.

Acceptance criteria:
- Document the confirmed API/MCP endpoints and required IDs.
- Add a small isolated adapter; do not couple orchestration logic to Vibe Kanban internals.
- Claude Code/Codex executor hints are preserved.
- Antigravity remains manual unless a reliable native executor exists.

### T035 — Vibe Kanban Result Import

Status: TODO  
Recommended agent: Codex  
Priority: P1

Goal:
- Import or paste a Vibe Kanban execution result back into Agent Control Room and convert it into a session report, diff summary, task status update, and next prompt.

Acceptance criteria:
- User can provide a Vibe Kanban result payload or summary for a specific task.
- Imported result updates the related `FeaturePlan` task conservatively.
- Generated next prompt includes changed files, remaining work, and acceptance criteria.
- No auto-merge or fully autonomous continuation is added.
