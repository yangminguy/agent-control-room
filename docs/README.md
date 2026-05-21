# Agent Control Room Docs

This folder is split into active docs and archived context.

## Active Docs

Read these first for implementation:

1. `../CLAUDE.md`
2. `../AGENTS.md`
3. `CONTROL_TOWER_DIRECTION.md`
4. `PRD.md`
5. `ARCHITECTURE.md`
6. `ROADMAP.md`
7. `TASKS.md`
8. `AGENT_STATE.md`
9. `HANDOFF.md`
10. `DECISIONS.md`
11. `VIBE_KANBAN_INTEGRATION.md`
12. `PROMPT_TEMPLATES.md`

Agent Execution & Scheduling Policies:

- `AGENT_SCHEDULING_POLICY.md` — when to use single agent, sequential, parallel, or token relay modes
- `AGENT_RUN_POLICY.md` — how agents are executed (CLI, Workbench, Manual) + approval gates + error handling
- `CONTEXT_TOKEN_RESUME_PROTOCOL.md` — token limit handoff flow + Context Pack generation
- `AGENT_STATE.md` — current agent availability status (Phase 10 준비)

Foundation & Architecture Docs:

- `CONTROL_TOWER_DIRECTION.md` — canonical current direction for the AI Development Control Tower
- `ROADMAP.md` — current phase map and next priorities (Phase 10: Vibe Kanban Workbench Bridge)
- `TASK_MODEL.md` — plan, task, kanban, diff, and execution log data model
- `VIBE_KANBAN_INTEGRATION.md` — Vibe Kanban bridge architecture and integration roadmap
- `PROMPT_TEMPLATES.md` — reusable external-agent prompt templates + token relay templates

Supporting Docs:

- `DESIGN_SYSTEM.md` — current UI design rules (Dark+Pink)
- `LOCAL_RUNNER_ARCHITECTURE.md` — local terminal/IDE automation architecture
- `DEPLOYMENT_CHECKLIST.md` — deployment and security checklist
- `SUPABASE_SCHEMA.md` — production database schema reference

## Archive

`archive/` contains superseded plans, session reports, long research, and task-specific design notes. Use it only when you need historical detail.
