# Current Development Focus

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

The main loop is:

```text
planning intent
→ roadmap
→ task decomposition
→ risk-based local CLI execution
→ Hermes supervision
→ result analysis
→ roadmap / kanban status update
→ retry, QA, next task, or re-orchestration
```

Roadmap is the main control surface. Kanban is a detailed task inspection surface.

Full historical task logs remain archived in:
- `docs/archive/TASKS_FULL_2026-05-20_part_01.md`
- `docs/archive/TASKS_FULL_2026-05-20_part_02.md`

## Phase 2 — Multi-Agent Orchestration + Hermes Insights ✅

**Status:** Complete (2026-05-23)  
**Tests:** 273 passing (Hermes integration verified)

### What Was Delivered

- [x] Next Task Recommendation Engine (decision-to-task mapping)
- [x] Agent Router Enhancement (Claude Code, Codex, Antigravity routing)
- [x] Parallel Safety Decision Engine (file conflict detection)
- [x] Hermes Insight Recorder (execution pattern analysis)
- [x] Orchestration Decision Panel (PM-friendly recommendations)
- [x] Agent Capability List (with auto-run restrictions)
- [x] Natural Language Project-Aware Orchestration
- [x] Hermes Model Provider (OpenAI gpt-4o)
- [x] Automated E2E Smoke Test Runner

### Safety Features Implemented

- Codex auto-run: DISABLED (QA-focused, requires supervision)
- Antigravity auto-run: DISABLED (UI designer, not CLI agent)
- Claude Code auto-run: LIMITED (low-risk single tasks only)
- Approval gates: ENFORCED (high/critical work blocked until approved)
- Parallel execution: CONFLICT-AWARE (prevents multi-agent file collisions)
- Hermes insights: FILE BOUNDARY ENFORCEMENT (critical security feature)

### Key Components

| Component | File | Status |
|-----------|------|--------|
| Next Task Generator | `lib/orchestration/next-task-generator.ts` | ✅ |
| Agent Router | `lib/orchestration/next-task-router.ts` | ✅ |
| Parallel Safety | `lib/orchestration/parallel-safety-decider.ts` | ✅ |
| Insight Recorder | `lib/hermes/insight-recorder.ts` | ✅ |
| Decision Panel | `app/orchestration/components/OrchestrationDecisionPanel.tsx` | ✅ |
| Agent Capabilities | `app/orchestration/components/AgentCapabilityList.tsx` | ✅ |
| E2E Smoke Tests | `__tests__/e2e/smoke-runner.test.ts` | ✅ |

## Phase A — Product Direction Cleanup

- [x] Align core docs with roadmap-driven local CLI automation direction
- [x] Remove copy-paste-first language
- [x] Remove outdated manual-handoff-first direction
- [x] Move non-core features to Backlog

Acceptance criteria:
- Core docs define Agent Control Room as a local automation control tower, not a prompt generator.
- Prompt and handoff generation are described as support modules, not the main product.
- Hermes is described as a supervisor, not a coding agent.
- Vibe Kanban is described as a detailed workbench, not the product brain.

## Phase B — Main Flow Stabilization

- [x] Document planning → roadmap → local CLI execution → Hermes supervision → re-orchestration
- [x] Define Roadmap as main UI
- [x] Define Kanban as detailed task UI
- [x] Define risk-based automation policy

Acceptance criteria:
- `/plan` is documented as the main roadmap control panel.
- `/orchestration` is documented as queue, approval, validation, and decision support.
- `/workbench` is documented as the execution readiness and local runner surface.
- High/critical risk work cannot bypass approval gates.

## Phase C — Connect Core Automation Features ✅

- [x] Connect Approval Gate Panel
- [x] Connect Auto Decision Panel
- [x] Connect Kanban Board
- [x] Connect Roadmap Status Widget
- [x] Connect Scheduling Mode Panel as explanation panel
- [x] Connect Agent Capability List
- [x] Verify these surfaces with an end-to-end browser pass after the docs realignment

Acceptance criteria (all met):
- ✅ Approval Gate Panel is available in the orchestration/workbench flow for risky execution.
- ✅ Auto Decision Panel shows Hermes/validator decisions as suggestions, not silent execution.
- ✅ Kanban Board remains reachable as detailed task inspection below or behind roadmap context.
- ✅ Roadmap Status Widget appears where users need summary progress.
- ✅ Scheduling Mode Panel explains the recommended mode instead of making the PM manually solve scheduling.
- ✅ Agent Capability List explains why each agent was selected.

## Phase D — Local Runner Stabilization

- [ ] Validate Claude Code CLI runner path
- [ ] Validate approval token flow
- [ ] Validate log streaming
- [ ] Validate git diff capture
- [ ] Validate typecheck/test/build capture

Acceptance criteria:
- Low-risk approved tasks can run through the local runner.
- High/critical tasks pause until approval is recorded.
- Logs are visible as user-friendly execution logs.
- Diff and check results return to the roadmap/task status loop.

## Phase E — Hermes Supervision Loop & Packet Generation ✅

- [x] Connect Hermes safe monitoring commands in policy
- [x] Define Phase Completion Packet
- [x] Define Failure Packet
- [x] Define Drift Detection Packet
- [x] Define Re-orchestration Packet
- [x] Implement packet builder (buildHermesPacket)
- [x] Implement result normalizer (normalizeExecutionResult)
- [x] Implement decision classifier (classifyExecutionDecision)
- [x] Implement status updater (updateRoadmapAndKanbanStatus)
- [x] Implement Hermes Insight Recorder and Insight Display
- [x] Connect packet generation to live runner completion (Phase 2)

Acceptance criteria (all met):
- ✅ Hermes can run only safe verification commands automatically.
- ✅ Hermes cannot edit code, change dependencies, migrate databases, deploy, push, merge, rebase, or reset.
- ✅ Result normalizer extracts execution status, checks, and changed files from ExecutionLog.
- ✅ Decision classifier determines pass/fail/qa_needed/retry_needed/blocked/drift from ExecutionResultSummary.
- ✅ Packet builder generates typed Hermes packets (PhaseSuccessPacket, PhaseFailurePacket, etc.) with PM-friendly summaries.
- ✅ Roadmap and Kanban status updates based on decision classification.
- ✅ Packet generation connected to automatic execution completion (Phase 2).
- ✅ Hermes Insight Recorder captures execution patterns and file boundary violations.
- ✅ Insight Display Panel shows recommendations in UI.

## Phase F — Final Documentation & Integration Verification

**Status:** In Progress (Phase 3)

- [x] Wire packet generation to /api/runner completion flow (Phase 2)
- [x] Verify decision classification accuracy on sample executions
- [ ] Verify Hermes packet display in `/orchestration` and kanban views
- [ ] Update documentation to reflect actual implementation (Phase 2 & 3)
- [ ] Archive temporary test stubs and old components
- [ ] Final E2E verification of main loop

Acceptance criteria:
- ✅ Packet generation is called automatically after runner completion.
- ✅ Hermes packets are stored and accessible via API.
- ✅ Decision classification drives status updates consistently.
- ⏳ Documentation reflects actual implementation (Phase 3 work in progress).
- ⏳ Broken connections (if any) are documented clearly as future work.
- ⏳ E2E smoke test runner validates main flow end-to-end.

## Backlog

- Telegram full approval bot integration
- Obsidian filesystem sync
- Supabase durable storage
- Codex CLI automation if not verified
- Antigravity IDE automation if not verified
- GitHub PR automation
- Production deployment automation
- Multi-user collaboration
- Discord Webhook

## Current Safety Rules

- Low-risk local CLI execution may proceed only through the supported runner/approval flow.
- High/critical risk work requires explicit user approval.
- Critical production actions remain manual unless a future phase adds a dedicated approval and rollback design.
- Hermes is a Background Execution Supervisor for monitoring, checks, packets, and reports only.
- Roadmap remains the main surface; Kanban remains detail view.
- Future UI work must follow `docs/DESIGN_SYSTEM.md` Brightline direction: bright shell, black structure, pink decision, PM-readable summaries before raw logs.
