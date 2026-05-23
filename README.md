# Agent Control Room

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

It turns product direction into a roadmap, decomposes the roadmap into executable tasks, routes work to local AI agents, runs approved local CLI automation, lets Hermes supervise execution, analyzes logs/diffs/checks, updates roadmap progress, and re-orchestrates when work drifts from the plan.

It is not a copy-paste prompt generator. Prompt compilation and handoff generation are supporting tools inside the control tower loop.

## Core Flow

1. Register or select a project.
2. Enter product direction.
3. Generate a visual roadmap and executable tasks.
4. Review agent assignment, risk, and recommended execution mode.
5. Approve risky execution when required.
6. Run supported local CLI execution or send detailed work to Vibe Kanban.
7. Watch logs and collect git diff/check results.
8. Let Hermes produce completion, failure, drift, or approval packets.
9. Update roadmap and kanban status.
10. Continue, retry, QA, pause, or re-orchestrate.

## UI Map

- `/plan` — main roadmap control panel.
- Kanban/task cards — detailed task inspection.
- `/workbench` — execution readiness, approval, local runner, logs.
- `/orchestration` — queue, approvals, validation, auto-decision suggestions, re-orchestration.
- `/dashboard` — multi-project status summary.
- Hermes panel/routes — supervision packets, monitoring, validation, reports.

Roadmap is the main surface. Kanban is detail.

## Run Locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js, usually `http://localhost:3000`.

Local JSON storage is the default development path. Supabase-related work exists for later durable storage, but Supabase is not required for the current local automation loop.

## Core Docs

- `AGENTS.md` — agent instructions and current project rules
- `CLAUDE.md` — coding context for Claude Code
- `docs/CONTROL_TOWER_DIRECTION.md` — canonical product direction
- `docs/PRD.md` — current requirements
- `docs/ARCHITECTURE.md` — system architecture
- `docs/TASKS.md` — active development focus and backlog
- `docs/ROADMAP.md` — phase roadmap
- `docs/AGENT_STATE.md` — current state
- `docs/HANDOFF.md` — handoff and session context
- `docs/DECISIONS.md` — product/technical decisions
- `docs/LOCAL_RUNNER_ARCHITECTURE.md` — local CLI runner model
- `docs/HERMES_BACKGROUND_WORKER.md` — Hermes supervision policy
- `docs/AGENT_RUN_POLICY.md` — execution surfaces and approval gates
- `docs/AGENT_SCHEDULING_POLICY.md` — single/sequential/parallel/token-relay rules

## Backlog Boundaries

The following are not current core-loop requirements:

- Telegram full approval bot integration
- Obsidian filesystem sync
- Supabase durable storage
- Codex CLI automation if not verified
- Antigravity IDE automation if not verified
- GitHub PR automation
- Production deployment automation
- Multi-user collaboration
- Discord Webhook

## Recommended Start For Agents

```txt
Read AGENTS.md, CLAUDE.md, docs/CONTROL_TOWER_DIRECTION.md, docs/PRD.md,
docs/ARCHITECTURE.md, and docs/TASKS.md.
Keep Roadmap as the main surface.
Keep Kanban as task detail.
Keep Hermes as supervisor, not coder.
Keep high/critical work approval-gated.
```
