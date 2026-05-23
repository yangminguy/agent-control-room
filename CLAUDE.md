# CLAUDE.md — Agent Control Room

## Product Direction

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

It is not a copy-paste prompt generator. The Senior Dev Prompt Compiler and handoff generators are supporting modules. The product's main job is to turn planning intent into a roadmap, execute approved local automation, supervise execution, and re-orchestrate when reality drifts from the plan.

## Core Loop

```text
User idea or product direction
→ senior-developer translation
→ visual roadmap
→ phase/task decomposition with acceptance criteria
→ agent routing
→ risk classification and scheduling recommendation
→ approval gate when needed
→ local CLI runner or Vibe Kanban workbench
→ execution logs and git diff capture
→ Hermes supervision and verification
→ completion/failure/drift/approval packet
→ roadmap and kanban status update
→ next task, QA, retry, pause, or re-orchestration
```

## Product Boundaries

The user owns product direction, planning intent, high-risk approval, and final judgment.

The system owns roadmap generation, task decomposition, agent assignment, local CLI execution through supported approval-gated flows, log/diff/check analysis, Hermes supervision, roadmap status updates, and re-orchestration.

Roadmap is the main control surface. Kanban is a detailed task inspection surface.

## Agent Roles

- **Claude Code**: architecture, complex reasoning, approved local CLI implementation.
- **Codex**: bounded fixes, tests, type errors, QA. Automatic CLI execution remains backlog until verified stable.
- **Antigravity**: UI/UX and visual iteration. IDE automation remains backlog until verified stable.
- **Hermes**: background supervision, safe checks, logs, packets, drift/failure reporting. Never a coding agent.
- **Vibe Kanban**: detailed execution workbench for cards, sessions, diffs, and previews. Not the product brain.

## Safety Rules

- Low-risk supported local runner tasks may execute after the required approval flow.
- High/critical risk work must pause for explicit approval.
- No uncontrolled autonomous execution.
- No automatic push, merge, rebase, reset, production deploy, DB migration, dependency changes, or secret changes.
- Two agents must not edit the same files in parallel.
- Hermes can run safe checks only and must return structured packets to Agent Control Room.

Hermes safe commands:

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

## Current Implementation Summary

The codebase contains the major control tower pieces:
- roadmap-first `/plan`
- workbench approval and runner surfaces
- orchestration queue, scheduling, validation, and auto-decision suggestions
- local adapters and runner infrastructure
- risk classification and file conflict logic
- Hermes packet, validation, Telegram-message, and monitoring support
- Vibe Kanban bridge
- multi-project dashboard
- local JSON storage with Supabase-oriented schema work

The current focus is not adding peripheral integrations. It is stabilizing the main automation loop and cleaning up old prompt/manual-handoff-first language.

## Current Priorities

See `docs/TASKS.md`.

Immediate priorities:
- Verify main flow end to end: planning → roadmap → local runner → Hermes packet → roadmap update.
- Keep Approval Gate, Auto Decision Panel, Roadmap Status Widget, Scheduling Mode Panel, Agent Capability List, and Kanban detail views connected to that flow.
- Archive or isolate old monitor/direction components only after import and route checks.
- Move Telegram full bot, Obsidian filesystem sync, Supabase durable storage, GitHub PR automation, production deployment automation, multi-user collaboration, Discord Webhook, and unverified Codex/Antigravity automation to backlog.

## Required Reading Order

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
