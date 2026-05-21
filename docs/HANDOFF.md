# HANDOFF.md — Agent Control Room

## Current Handoff Status
Phase 9 Complete (T027–T030 Done). Agent Control Room is now a roadmap-first AI Development Control Tower with Senior Dev Prompt Compiler, Agent Availability Manager, Hermes Packet Draft UI, and Foundation Modules. All core control-tower orchestration, planning, execution, and analysis loops are stable and ready for Phase 10 Vibe Kanban Workbench Bridge implementation.

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

## Phase 9: Roadmap-First Control Tower with Foundation Modules (Complete)

### T027-T030 Implementation Complete (2026-05-21)

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

### Phase 9 (Final): T028-T030 — Foundation Modules Completion

Status: DONE (2026-05-21)

**Goal**:
Complete all remaining control tower foundation modules so Antigravity can do full UI/UX QA before moving to Phase 10 production integration.

**What was built** (3-Wave parallel + sequential approach):

**Wave 1 (Parallel — 3 agents simultaneously)**:

1. **Agent Availability Manager** (typescript-pro):
   - `lib/agents/agent-availability-manager.ts`: Centralized agent state management
   - Supports 8 states: available, working, idle, blocked, token_limited, cooling_down, background_worker, approval_required, experimental, offline
   - Functions: getAgentAvailability(), isAgentAvailableForWork(), getFallbackAgent(), getRecommendedAgentForTask(), shouldAvoidAgentForNow()
   - Encodes: Codex token_limited, Hermes background_worker, Vibe Kanban foundation-only

2. **Generators** (typescript-pro):
   - `lib/orchestration/context-pack-generator.ts`: Context Pack generation (project state → Markdown)
   - `lib/orchestration/handoff-pack-generator.ts`: Handoff Pack generation (agent A → B transfer → Markdown)
   - `lib/memory/obsidian-note-generator.ts`: Obsidian-compatible notes (7 types: insight, decision, failed-attempt, prompt, handoff, status, qa-finding)
   - All outputs: Markdown strings (no file writes, no API calls)

3. **Vibe Kanban Bridge + Hermes Spike** (documentation-engineer):
   - `lib/integrations/vibe-kanban/types.ts`: WorkspaceHandoff, SessionBrief, DiffReviewChecklist, PreviewReviewChecklist, TaskExecutionPacket types
   - `lib/integrations/vibe-kanban/bridge.ts`: 5 Markdown generators (workspace, session, diff, preview, execution packet)
   - `docs/VIBE_KANBAN_BRIDGE.md`: Bridge architecture (execution workbench only, not product brain)
   - `docs/HERMES_CLI_INSTALLATION_SPIKE.md`: Spike preparation guide with explicit safety boundaries

**Wave 2 (Sequential after Wave 1)**:

4. **Prompt Compiler Enhancement** (typescript-pro):
   - `lib/prompts/senior-dev-compiler.types.ts`: Added 4 optional fields to SeniorDevCompiledPrompt
     - suggestedHandoffRequired?: boolean
     - suggestedFallbackAgent?: string
     - suggestedContextPackRequired?: boolean
     - contextPackNotes?: string
   - `lib/prompts/senior-dev-prompt-compiler.ts`: 5 targeted enhancements
     - Agent Availability Check (token_limited/cooling_down → userApprovalRequired = true)
     - Hermes Safety Check (background work only, never primary coding)
     - Vibe Kanban Boundaries (never primary agent)
     - Handoff Recommendation (high-risk + unavailable agent)
     - Context Pack Recommendation (long task or many criteria)
   - All 24 existing tests pass ✅

**Wave 3 (Sequential after Wave 2)**:

5. **Prompt Compiler UI Enhancement** (frontend-developer):
   - `components/prompt-compiler/PromptCompilerUI.tsx`: 6 new UI sections
     - Fallback Agent display (amber badge, "if primary unavailable")
     - User Approval Required banner (AlertTriangle icon, prominent)
     - Suggested Handoff Pack button ("Generate Handoff Pack Draft")
     - Suggested Context Pack button ("Generate Context Pack Draft")
     - Do-Not-Touch Files list (red warning icon, monospace)
     - Validation Commands code block (copyable, emerald text)
   - All buttons: safe language ("Generate", "Copy", NOT "Run"/"Execute")
   - TypeScript: 0 errors

6. **Production Hardening** (qa-expert):
   - npm run typecheck: ✅ 0 errors
   - npm run lint: ✅ 0 errors (1 deprecation advisory only)
   - npm run build: ✅ success (25 static pages, 4.5s, 10.4kB largest bundle)
   - npm run test: ✅ 58/58 tests pass

**Safety Guarantees Maintained**:
- ❌ No agent auto-execution added
- ❌ No Hermes CLI/API execution
- ❌ No Vibe Kanban API calls
- ❌ No runner/spawn-runner wiring
- ❌ No package.json changes
- ❌ No database migrations
- ❌ No deployment automation

**Files Changed/Created** (T028-T030):
- lib/agents/agent-availability-manager.ts (new)
- lib/orchestration/context-pack-generator.ts (new)
- lib/orchestration/handoff-pack-generator.ts (new)
- lib/memory/obsidian-note-generator.ts (new)
- lib/integrations/vibe-kanban/types.ts (new)
- lib/integrations/vibe-kanban/bridge.ts (new)
- docs/VIBE_KANBAN_BRIDGE.md (new)
- docs/HERMES_CLI_INSTALLATION_SPIKE.md (new)
- lib/prompts/senior-dev-compiler.types.ts (4 optional fields added)
- lib/prompts/senior-dev-prompt-compiler.ts (5 enhancements added)
- components/prompt-compiler/PromptCompilerUI.tsx (6 UI sections added)

### What's Next (Phase 10)

**Immediate priorities**:
1. **Antigravity Full UI/UX Polish** (est. 2-3 days)
   - /plan visual refinement
   - /prompt-compiler fallback badge, approval banner, handoff sections styling
   - /hermes-packets design review
   - Mobile responsiveness, color palette, typography, icon improvements

2. **Integration Testing** (after UI polish)
   - End-to-end: idea → roadmap → prompt → agent selection → execution
   - Mock agent response handling
   - Handoff workflow validation

3. **Vibe Kanban Real Integration** (T029 extended)
   - Use existing bridge types/generators
   - Add Vibe Kanban API calls (workspace creation, session handoff, result import)
   - Test against Vibe Kanban running locally

4. **Context Pack Workflow** (T030 extended)
   - Use existing generators
   - Add context pack storage/retrieval UI
   - Handle token-limited agent handoff

5. **Production Monitoring**
   - Error tracking (Sentry)
   - Token usage monitoring
   - Agent execution logs

**Agent Status for Phase 10**:
- 🧠 Claude Code: available (refactoring, integration work)
- ⚙️ Codex: available (tests, implementation spikes)
- 🎨 Antigravity: working (UI/UX QA and polish)
- 🔄 Hermes: background_worker (spike research, not execution)
- ✅ Manual/User: approval_required (approve Polish → Integration → Real Integration)

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
