# Agent Control Room Docs

This folder is split into active docs, supporting policy docs, and archived historical context.

## Current Direction

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

The active loop is:

```text
planning → roadmap → local CLI execution → Hermes supervision → result analysis → roadmap update
```

Roadmap is the main product surface. Kanban is detailed task inspection. Hermes is a Background Execution Supervisor, not a coding agent.

## Active Docs — Read In Order

1. `../AGENTS.md`
2. `../CLAUDE.md`
3. `../README.md`
4. `CONTROL_TOWER_DIRECTION.md`
5. `PRD.md`
6. `ARCHITECTURE.md`
7. `TASKS.md`
8. `ROADMAP.md`
9. `AGENT_STATE.md`
10. `HANDOFF.md`
11. `DECISIONS.md`
12. `LOCAL_RUNNER_ARCHITECTURE.md`
13. `HERMES_BACKGROUND_WORKER.md`
14. `AGENT_RUN_POLICY.md`
15. `AGENT_SCHEDULING_POLICY.md`

## Supporting Docs

- `CONTEXT_TOKEN_RESUME_PROTOCOL.md` — token/context handoff and Context Pack protocol
- `TASK_MODEL.md` — plan, task, kanban, diff, and execution log models
- `VIBE_KANBAN_INTEGRATION.md` — workbench bridge notes
- `PROMPT_TEMPLATES.md` — reusable prompt templates, now treated as support material
- `DESIGN_SYSTEM.md` — UI design rules
- `EXECUTION_SAFETY_CHECKLIST.md` — execution safety checklist
- `ORCHESTRATION_PACKET.md` — orchestration packet format
- `PHASE_COMPLETION_PACKET.md` — phase completion packet format

## Backlog / Later-Phase Docs

These are useful references but should not override the current core loop:

- `HERMES_TELEGRAM_APPROVAL.md`
- `HERMES_OBSIDIAN_MEMORY_LOOP.md`
- `SUPABASE_SCHEMA.md`
- `DEPLOYMENT_CHECKLIST.md`
- Discord-related approval docs or code references

## Archive

`docs/archive/` contains superseded plans, session reports, research, and older phase logs.

Use archive only for historical detail. Do not treat archived prompt-first, manual-handoff-first, or Vibe-Kanban-first direction as current product direction.
