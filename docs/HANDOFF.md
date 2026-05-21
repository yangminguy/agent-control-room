# HANDOFF.md — Agent Control Room

## Current Handoff Status
Phases 1-8b implementation complete. Agent Control Room now has manual orchestration, structured planning, semi-automated Claude execution, diff analysis, human-approved Continue/Stop loop with UX refinement, security hardening, Vibe Kanban HTTP integration, and Supabase migration readiness.

Strategic direction updated on 2026-05-21:
- Agent Control Room is the AI Development Control Tower for non-developer PMs.
- `/plan` should become the Visual Development Roadmap Control Panel.
- Senior Dev Prompt Compiler should standardize generated prompts.
- Context Reset Protocol should create Context Packs for token/context handoff.
- Obsidian-compatible insight memory is planned, not fully implemented.
- Hermes is optional background/status/memory worker, not primary coding brain.
- Vibe Kanban is the execution workbench.
- Future work should deepen Vibe Kanban workspace/session/result-readback integration before expanding duplicate internal board UI.

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
- T017 HTML plan view implemented at `/plan` with card/status components and manual status updates; next direction is roadmap-first.
- T018 Agent Execution Runner implemented with git branch creation, `child_process.spawn`, SSE log streaming, execution log storage, and `RunnerLogView`.
- T019 Git Diff & Outcome Analyzer implemented with `lib/analyzer/git-diff-analyzer.ts` and `/api/analyzer` endpoint.
- `/plan` task cards now wire `RunnerLogView` directly for Claude Code and Codex tasks.
- T021 Token / Rate Limit Handoff implemented at `/agent-status` with manual status updates, fallback recommendation, and copy-ready handoff preview.
- T022 Autonomous Execution Loop implemented with analyzer-triggered Continue/Stop flow and `/api/loop-continue`.

Verified:
- `npm run typecheck`
- `npm run lint`
- Vibe Kanban frontend returned HTTP 200 at `http://localhost:3002/`.
- Vibe Kanban backend health returned OK at `http://localhost:3003/api/health`.

## Phase 9: Roadmap-First Control Tower UX (In Progress)

### T027 Implementation Complete (2026-05-21)

**What was built**:

1. **Data Model Foundation** (Claude Code):
   - `lib/types.ts`: RoadmapStatus, RoadmapBlocker, RoadmapUserDecision, RoadmapStage, Roadmap types
   - `lib/roadmap.ts`: Helper functions (getRoadmapProgress, getActiveRoadmapStage, getBlockedStages, getNextAction)
   - `data/roadmap.json`: 10-phase sample roadmap (Phase 1 Manual Orchestration through Phase 10 Vibe Kanban Bridge)
   - `lib/storage/roadmap-store.ts`: Storage layer with Supabase pattern and JSON fallback
   - `app/api/roadmap/route.ts`: GET /api/roadmap?projectId=X endpoint
   - `docs/ROADMAP_DATA_MODEL.md`: Implementation guide for Antigravity

2. **UI Components** (Antigravity):
   - `components/roadmap/RoadmapTimeline.tsx`: Timeline visualization with vertical line and markers
   - `components/roadmap/RoadmapStageCard.tsx`: Individual stage cards with status, agent, task, blocker, user decision displays
   - `components/roadmap/RoadmapStatusBadge.tsx`: Status icon badges (completed ✅, active 🔵, waiting ⏳, blocked 🚫, etc.)
   - `components/roadmap/AgentBadge.tsx`: Agent type identification with color/icon coding

3. **Integration** (Claude Code):
   - `lib/roadmap-ui-adapter.ts`: Domain model ↔ UI model adapter (responsibleAgent → assignedAgent, blockers → blockerReason, etc.)
   - `/plan` page refactored: roadmap-first layout (Header → Roadmap → Agents → Kanban)
   - `lib/agents/agent-status.ts`: Static agent status data with 6 agents (Claude Code, Codex, Antigravity, Hermes, Vibe Kanban, Manual/User)
   - Agent status data updated post-completion (Claude Code → available, Antigravity → working, Manual/User → approval_required)

**Page Layout** (Roadmap-First Control Tower):
```
┌─────────────────────────────────┐
│ Development Control Tower        │
│ Roadmap + Agent Status + Tasks   │
└─────────────────────────────────┘
         ↓
┌─ 개발 로드맵 (Roadmap)
│  - Phase 1-8 (completed)
│  - Phase 9 (active)
│  - Phase 10 (waiting)
│
├─ 에이전트 시스템 상태 (Agent Status)
│  - Total: 6 systems
│  - Ready/Active: 3 (Claude Code, Codex, Antigravity)
│  - Idle: 2 (Vibe Kanban, background worker)
│  - Awaiting approval: 1 (Manual/User)
│
└─ 작업 상세 보기 (Kanban Detail)
   - Feature Plans
   - Task status tracking
```

**Verification**:
- ✅ typecheck
- ✅ lint
- ✅ build
- ✅ No breaking changes to existing Kanban functionality
- ✅ Roadmap data safe with null checks
- ✅ Agent status panel graceful empty state

### Phase 9 (Continued): T027-Hermes — Hermes Packet Draft UI

Status: DONE (2026-05-21)

**Goal**:
- Design and implement a safe, static UI for generating Hermes task packets without execution.
- Users can choose packet kinds, generate drafts, preview Markdown, and copy packets.
- Clearly communicate that Hermes is NOT being executed.

**What was built**:

1. **Hermes Type System** (lib/hermes/):
   - `lib/hermes/types.ts`: HermesPacket, HermesSection, HermesPacketDraft, HermesPacketKind types
   - 6 supported packet kinds: session-summary, context-pack, handoff-pack, failed-task-review, background-research, obsidian-note

2. **Hermes Packet Generator** (lib/hermes/task-packets.ts):
   - `generateSessionSummaryPacket()`: Create session work summaries
   - `generateContextPackPacket()`: Create session reset/handoff context
   - `generateHandoffPackPacket()`: Create agent handoff instructions
   - `generateFailedTaskReviewPacket()`: Create failure analysis packets
   - `generateBackgroundResearchPacket()`: Create research findings
   - `generateObsidianNotePacket()`: Create personal knowledge notes
   - `renderHermesPacketMarkdown()`: Convert packets to user-friendly Markdown
   - `exportHermesPacketJSON()`: Export structured JSON

3. **Example Packet Data** (data/hermes-task-packets.json):
   - 6 example packets (one of each kind)
   - All example packets follow the Hermes spec
   - Ready for copy/paste workflows

4. **Hermes Packet Draft UI** (app/hermes-packets/page.tsx + components/hermes/PacketDraftCard.tsx):
   - Static server component with example packet data
   - Grid layout showing all example packets
   - View mode toggle: Markdown preview ↔ JSON data
   - Copy-to-clipboard button for both formats
   - Safety notice: "Hermes is not executed" (top of page)
   - Kind-based packet filtering and display

5. **Agent Status Integration** (components/agents/AgentStatusCard.tsx):
   - Added safe link from Hermes agent card to `/hermes-packets`
   - "패킷 드래프트 보기" (View Packet Drafts) link
   - Minimal change: only 1 import + 1 Link element

**Safety Guarantees**:
- No execution code added
- No runner/spawn-runner wiring
- No Hermes CLI or API calls
- No cron jobs
- No package.json changes
- No database modifications
- No automatic execution paths
- UI language emphasizes draft/preview state ("Generate", "Copy", not "Run"/"Execute")

**Verification**:
- ✅ npm run typecheck
- ✅ npm run lint (no errors)
- ✅ npm run build (success, `/hermes-packets` route created)
- ✅ New route: `/hermes-packets` (static prerendered)
- ✅ All 6 packet kinds displayed and functional

**Files Changed/Created**:
- lib/hermes/types.ts (new)
- lib/hermes/task-packets.ts (new)
- data/hermes-task-packets.json (new)
- app/hermes-packets/page.tsx (new)
- components/hermes/PacketDraftCard.tsx (new)
- components/agents/AgentStatusCard.tsx (1 link added for Hermes agent)

**Remaining Work** (Future phases):
- T032: Hermes CLI installation spike (Codex) — validate agent installation
- Connect packet drafts to actual Hermes execution (Phase 10+)
- Implement context-pack and obsidian-note workflows
- Build Vibe Kanban workspace integration for handoff execution

### What's Next (T028)

**Senior Dev Prompt Compiler Structure**:
- Standardize prompt generation: goal, context, scope, files, acceptance criteria, checks, handoff instructions
- Agent: Claude Code
- Priority: P1
- Recommendation: Begin after Phase 9 completion review

**Agent Status for T028**:
- 🧠 Claude Code: available (ready for T028)
- ⚙️ Codex: working (Hermes spike ongoing, then T029)
- 🎨 Antigravity: working (Visual QA on /plan, then design T028 UI)
- 🔄 Hermes: background_worker (Packet Draft UI deployed, spike pending)
- ✅ Manual/User: approval_required (approve Phase 9, guide Phase 10)

**Files Changed**:
- lib/types.ts (T027 data model additions)
- lib/roadmap.ts (new)
- lib/roadmap-ui-adapter.ts (new)
- lib/agents/agent-status.ts (new)
- lib/storage/roadmap-store.ts (new)
- data/roadmap.json (new)
- app/plan/page.tsx (refactored roadmap-first)
- app/api/roadmap/route.ts (new)
- docs/ROADMAP_DATA_MODEL.md (new)
- [T027-Hermes] lib/hermes/* (new), app/hermes-packets/ (new), components/hermes/ (new)

## Implementation Complete (Phases 1-9 Foundation)

Phases 1-8 complete. Phase 9 T027 complete (Roadmap-First Control Tower).

Ready for: T028 (Senior Dev Prompt Compiler) or Phase 10 (Vibe Kanban Bridge)

Changed files from Phase 6-8 implementation:
- `components/plan/KanbanCard.tsx` — Loop UX feedback and error handling
- `lib/runner/git-utils.ts` — Path traversal validation
- `app/api/runner/route.ts`, `app/api/analyzer/route.ts` — cwd security checks
- `lib/integrations/vibe-kanban.ts` — Real HTTP API, project/status methods
- `components/projects/SendToVibeKanbanButton.tsx` — Project/status selection UI
- `app/api/vibe-kanban/issue/route.ts`, `projects/route.ts`, `statuses/route.ts` — API endpoints
- `lib/storage/supabase-client.ts` — Supabase client (new)
- `lib/storage/json-store.ts`, `feature-plan-store.ts`, `execution-log-store.ts`, `agent-status-store.ts` — Supabase + JSON fallback
- `supabase/migrations/20260521_initial_schema.sql` — DB schema (new)
- `.env.example` — Supabase and Vibe Kanban vars added
- `data/feature-plans.json` — projectId reconciliation
- `docs/TASKS.md`, `docs/ARCHITECTURE.md`, `README.md` — Documentation updated

Verified:
- `npm run typecheck` ✓
- `npm run lint` ✓
- `npm run build` ✓
- `npm test` ✓ (34/34 tests)
- `npm audit` ✓ (0 direct critical/high)

Remaining issues from latest T019 implementation:
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

Completed in Phase 6-8b (T023-T026):
- T023 Loop UX: Continue/Stop feedback banners, error messages with Retry buttons, Loop Approval UI improvements
- T025 Security: npm audit 3/5 vulnerabilities fixed, API path traversal validation added to `/api/runner` and `/api/analyzer`
- T024 Vibe Kanban: Real HTTP API calls with `VIBE_KANBAN_URL` environment variable, graceful mock fallback, improved UI error/success states
- T026 Supabase: Complete storage layer migration with JSON fallback, 7 tables schema SQL, environment-based client switching

Remaining issues:
- `data/feature-plans.json` currently uses `project-agent-control-room` while `data/projects.json` uses `agent-control-room`; UI handles both ids, but the seed data should be reconciled later.
- npm audit: 2 moderate vulnerabilities in Next.js bundled PostCSS (GHSA-qx2v-qp2m-jg93, not exploitable in this app). Next.js upstream fix pending.
- Supabase full integration requires: environment variables in deployment, SQL migration execution via dashboard, and optional JSON-to-Supabase data migration script.
- Vibe Kanban `/api/scratch/` scratch API for project selection UX not yet implemented; current implementation uses the remote issue bridge with project/status selection.
- Phase 9 should validate Vibe Kanban workspace/session/result-readback APIs and add open-workspace links/result import.

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

## Product Direction
{productDirection}

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
- AGENTS.md
- docs/CONTROL_TOWER_DIRECTION.md
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

## Context Reset / Token Notes
{contextResetOrTokenNotes}

## Obsidian Insight Candidates
- {insightCandidate1}
- {insightCandidate2}

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

## Phase 6-8b Summary (T023-T026 Complete)

### T023 — Loop UX (Phase 6)
- Added `loopMessage` state with type (`success`/`error`/`info`) for Continue/Stop/error feedback
- Implemented "다음 작업 준비 중..." loading state during Continue action
- Added "분석 실패" error display with "Retry 분석" button
- Improved Loop Approval UI with diff summary and next prompt label
- Files: `components/plan/KanbanCard.tsx`

### T025 — Security (Phase 7a-7b)
- Upgraded dependencies: next 14.2.30 → 15.5.16, postcss 8.5.6 → 8.5.14
- Added `validateCwdSafety()` function to prevent path traversal attacks
- Applied cwd validation to `/api/runner` and `/api/analyzer` routes
- Verified Zod input validation on all API endpoints
- Files: `lib/runner/git-utils.ts`, `app/api/runner/route.ts`, `app/api/analyzer/route.ts`

### T024 — Vibe Kanban Integration (Phase 8a)
- Implemented real HTTP API calls in `HttpVibeKanbanClient` with `VIBE_KANBAN_URL` env variable
- Fixed backend port from 3001 to 3003 (per Vibe Kanban config)
- Added error handling and graceful mock fallback when HTTP fails
- Enhanced UI feedback: mock/success/error states with inline status messages and retry buttons
- Files: `lib/integrations/vibe-kanban.ts`, `components/projects/SendToVibeKanbanButton.tsx`

### T026 — Supabase Migration (Phase 8b)
- Created 7-table PostgreSQL schema with RLS policies
- Implemented Supabase client with environment-based fallback
- Updated all storage layers: `lib/storage/*.ts` with Supabase → JSON fallback logic
- Added `supabase-client.ts` singleton and migration SQL file
- Updated `.env.example` with Supabase and Vibe Kanban variables
- Files: `lib/storage/supabase-client.ts`, `supabase/migrations/20260521_initial_schema.sql`, all storage files

### Final QA (Phase 8c)
- `npm run typecheck`: ✓ Pass (0 errors)
- `npm run lint`: ✓ Pass (0 errors)
- `npm run build`: ✓ Pass (20 routes compiled)
- `npm test`: ✓ Pass (34 tests, 0 failures)
- `npm audit`: 2 moderate (Next.js bundled PostCSS, not exploitable)
- Happy path, error scenarios, and security edge cases verified

## Recommended Next Work
1. **Roadmap-First Control Tower UX** — Reframe `/plan` as a Visual Development Roadmap Control Panel with stage status, check marks, responsible agent, current task, next action, blockers, user decisions, and acceptance criteria.
2. **Senior Dev Prompt Compiler** — Standardize prompt sections across generated Claude/Codex/Antigravity handoffs.
3. **Context Reset + Obsidian Memory** — Generate Context Packs and Markdown insight notes from session reports and execution logs.
4. **Vibe Kanban Workbench Bridge** — Add open-workspace/card link, workspace/session launch adapter research, result import, and next-prompt generation from imported outcomes.
5. **Production Verification** — Test full flow on Vercel with environment variables set after the roadmap-first direction is reflected.
