# ROADMAP.md — Agent Control Room

## Product Vision

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

The product converts planning intent into a visual roadmap, executes supported local AI agent work through approval-gated runner flows, supervises execution with Hermes, analyzes evidence, and re-orchestrates when work drifts from the plan.

## Strategic Direction

- Roadmap is the main control surface.
- Kanban is a detailed task inspection surface.
- Local CLI automation is part of the core loop when adapters are verified.
- High/critical risk work requires approval.
- Hermes supervises, verifies, reports, and detects drift. Hermes does not code.
- Vibe Kanban is a detailed workbench, not the source of product direction.
- Telegram, Obsidian filesystem sync, Supabase durable storage, GitHub PR automation, production deployment automation, Discord, and multi-user collaboration are backlog unless explicitly activated.

## Current Roadmap

### Phase A — Direction Cleanup

Goal: Remove prompt/manual-handoff-first language and align all core docs around roadmap-driven local automation.

Status: DONE

Outputs:
- Canonical direction in `docs/CONTROL_TOWER_DIRECTION.md`
- Updated PRD and architecture
- Rebuilt `docs/TASKS.md` around the current focus
- Backlog boundaries documented

### Phase B — Main Flow Stabilization

Goal: Stabilize the primary loop.

```text
planning → roadmap → local CLI execution → Hermes supervision → result analysis → roadmap update
```

Status: IN PROGRESS

Required outcomes:
- `/plan` clearly presents roadmap progress and next action.
- `/workbench` explains readiness, risk, approval, and runner launch.
- `/orchestration` shows queue, approvals, validation, and re-orchestration.
- Runner returns logs, diff, and check results to the task/roadmap model.

### Phase C — Connect Core Automation Features

Goal: Ensure implemented pieces are visible in the main workflow.

Status: IN PROGRESS

Connect/verify:
- Approval Gate Panel
- Auto Decision Panel
- Kanban Board as task detail
- Roadmap Status Widget
- Scheduling Mode Panel as recommendation/explanation
- Agent Capability List
- Hermes safe supervision
- Agent capability detection where stable

### Phase D — Local Runner Stabilization

Goal: Make approved local CLI execution reliable.

Status: TODO

Work:
- validate Claude Code CLI runner path
- validate approval token flow
- validate log streaming
- validate git diff capture
- validate typecheck/lint/test/build capture
- keep Codex CLI automation in backlog until verified stable
- keep Antigravity IDE automation in backlog until verified stable

### Phase E — Hermes Supervision Loop

Goal: Convert Hermes from a loose monitoring concept into a safe packet-returning supervisor.

Status: IN PROGRESS

Packet types:
- Phase Completion Packet
- Failure Packet
- Drift Detection Packet
- Approval Request Packet
- Re-orchestration Packet

Hermes allowed automatic commands:

```bash
git status
git diff --stat
git log --oneline -n 10
npm run typecheck
npm run lint
npm run test
npm run build
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Hermes forbidden actions:
- code edits
- dependency changes
- DB migrations
- push/merge/rebase/reset/clean
- production deploy
- secret/env changes

### Phase F — Cleanup

Goal: Prevent old UX paths from steering future agents in the wrong direction.

Status: TODO

Candidates:
- Old Monitor Panel — removed after import check
- Old Direction Orchestrator — removed after route check
- old `components/monitor` folder — removed after current Hermes component migration check
- Discord Webhook and Discord preview components — removed from active exports and moved to backlog

Cleanup rule:
- Delete if unused.
- Archive if useful for reference.
- Keep temporarily only if still imported by current routes.

## Backlog / Later Phase

- Telegram full approval bot integration
- Obsidian filesystem sync
- Supabase durable storage
- Codex CLI automation if not verified
- Antigravity IDE automation if not verified
- GitHub PR automation
- Production deployment automation
- Multi-user collaboration
- Discord Webhook

## Historical Record

Older phase logs and implementation details remain in:
- `PHASE_37_39_COMPLETION_REPORT.md`
- `docs/archive/`
- git history

Historical features should not override the current direction above.
