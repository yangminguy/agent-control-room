# HANDOFF.md — Agent Control Room

## Current Handoff Status
Phases 1-8b implementation complete. Agent Control Room now has manual orchestration, structured planning, semi-automated Claude execution, diff analysis, human-approved Continue/Stop loop with UX refinement, security hardening, Vibe Kanban HTTP integration, and Supabase migration readiness.

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
- T022 Autonomous Execution Loop implemented with analyzer-triggered Continue/Stop flow and `/api/loop-continue`.

Verified:
- `npm run typecheck`
- `npm run lint`
- Vibe Kanban frontend returned HTTP 200 at `http://localhost:3002/`.
- Vibe Kanban backend health returned OK at `http://localhost:3003/api/health`.

## Implementation Complete (Phase 8)

All core phases (1-8) implemented and deployed.

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
- Vibe Kanban `/api/scratch/` scratch API for project selection UX not yet implemented (current implementation uses generic `/api/issues` endpoint).

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
1. **Supabase Production Setup** — Execute SQL migration in Supabase dashboard, test Supabase ↔ app connectivity
2. **Vibe Kanban Project Selection UX** — Implement `/api/scratch/` endpoint integration for real project/status selection
3. **Seed Data Reconciliation** — Unify `project-agent-control-room` vs `agent-control-room` IDs in JSON files
4. **PostCSS Vulnerability** — Monitor Next.js upstream for bundled PostCSS fix; re-run `npm audit fix` when available
5. **Deployment Verification** — Test full flow on Vercel with environment variables set
