# AGENTS.md — Agent Control Room

## Product Direction

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

It is not a copy-paste prompt generator. Prompt compilation and handoff generation are supporting modules inside a larger loop:

```text
planning intent
→ roadmap
→ phase/task decomposition
→ agent routing
→ risk-based execution plan
→ approval when needed
→ local CLI runner or workbench
→ Hermes supervision
→ logs/diff/check analysis
→ roadmap and kanban status update
→ next task, QA, retry, pause, or re-orchestration
```

## User vs System Responsibility

The user owns:
- product direction
- planning intent
- high-risk approval
- final product judgment

The system owns:
- roadmap generation
- task decomposition
- acceptance criteria
- agent assignment
- risk classification
- scheduling recommendation
- local CLI execution through supported approval-gated runner flows
- execution log collection
- git diff analysis
- typecheck, lint, test, and build result analysis
- Hermes supervision and packet generation
- roadmap and kanban status updates
- re-orchestration when execution drifts

## UI Roles

| Surface | Role |
|---|---|
| `/plan` | Main roadmap control panel. |
| Kanban/task cards | Detailed task inspection only. |
| `/workbench` | Execution readiness, approval gate, local runner, logs. |
| `/orchestration` | Queue, approvals, validation, auto-decision suggestions, re-orchestration. |
| Hermes panel | Background supervision, packets, drift and failure reports. |
| `/dashboard` | Multi-project status summary. |

Roadmap is the main product surface. Kanban is for detail.

## Agent Roles

| Agent | Use For | Do Not Use For |
|---|---|---|
| Claude Code | Architecture, complex reasoning, local CLI implementation where approved. | Visual polish, QA-only tasks, background monitoring. |
| Codex | Bounded fixes, tests, type errors, QA verification. | Architecture ownership, unverified automatic CLI execution. |
| Antigravity | UI/UX, visual iteration, screen work. | Backend logic, data models, unverified IDE automation. |
| Hermes | Monitoring, safe checks, logs, packets, drift detection, reporting. | Coding, file edits, dependency changes, DB migration, deployment. |
| Vibe Kanban | Detailed workbench: cards, workspaces, sessions, diffs, previews. | Product brain, roadmap truth, orchestration decisions. |

## Risk-Based Automation Rules

- Low-risk supported local tasks may run through approved runner flows.
- High/critical risk tasks must pause for explicit user approval.
- Critical production actions remain manual unless a future phase adds a dedicated approval and rollback design.
- Two agents must not edit the same files in parallel.
- Runner, approval, auth, package, DB, deployment, and security changes are single-owner work.

## Hermes Rules

Hermes is a **Background Execution Supervisor**, not a coding agent.

Hermes may automatically run only safe verification/status commands:

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

Hermes must not:
- edit code
- run dependency installation/removal
- modify secrets or `.env`
- run database migrations
- push, merge, rebase, reset, or clean git state
- deploy to production
- approve its own work

Hermes returns structured packets to Agent Control Room:
- Phase Completion Packet
- Failure Packet
- Drift Detection Packet
- Approval Request Packet
- Re-orchestration Packet

## Current Development Focus

Read `docs/TASKS.md` for the active focus. The current priority is stabilizing:

```text
planning → roadmap → local CLI execution → Hermes supervision → result analysis → roadmap update
```

Backlog items include Telegram full approval bot integration, Obsidian filesystem sync, Supabase durable storage, unverified Codex CLI automation, unverified Antigravity IDE automation, GitHub PR automation, production deployment automation, multi-user collaboration, and Discord Webhook.

## Core Documents to Read First

1. `AGENTS.md`
2. `CLAUDE.md`
3. `README.md`
4. `docs/CONTROL_TOWER_DIRECTION.md`
5. `docs/PRD.md`
6. `docs/ARCHITECTURE.md`
7. `docs/TASKS.md`
8. `docs/ROADMAP.md`
9. `docs/AGENT_STATE.md`
10. `docs/HANDOFF.md`
11. `docs/DECISIONS.md`
12. `docs/LOCAL_RUNNER_ARCHITECTURE.md`
13. `docs/HERMES_BACKGROUND_WORKER.md`
14. `docs/AGENT_RUN_POLICY.md`
15. `docs/AGENT_SCHEDULING_POLICY.md`

## Coding Rules

- Keep changes small and directly tied to the task.
- Do not add features beyond the requested scope.
- Match existing style.
- Every generated task must include acceptance criteria.
- Every execution must preserve logs, changed files, and result summary.
- Do not expand automatic execution beyond supported approval-gated runner flows.
- Do not make Hermes a coding agent.
- Do not make Kanban or Vibe Kanban the main product surface.

## Report Format After Each Coding Session

```md
# Session Report

## Summary

## Changed Files

## Tests Run

## Completed

## Remaining Issues

## Recommended Next Task

## Handoff Needed?
```
