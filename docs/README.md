# Agent Control Room Docs

This folder is split into active docs and archived context.

## Current Status
**Phase 11 Complete (2026-05-22)**:
- ✅ Phase 10 (Full MVP Control Loop): 18 user requirements, 101 tests passing
- ✅ Phase 11 (Workbench Integration): Vibe Kanban real import, Hermes roadmap, deployment checklist
- 🚀 Ready for: Vercel deployment, Phase 12+ optional features

## Active Docs — Read in Order

Implementation context (start here):

1. `../CLAUDE.md` — Project summary, current implementation status (Phase 1-11)
2. `../AGENTS.md` — Agent definitions, routing rules, availability manager
3. `CONTROL_TOWER_DIRECTION.md` — Canonical product direction (Control Tower for PMs)
4. `PRD.md` — Concise product requirements
5. `ARCHITECTURE.md` — System architecture and module design
6. `ROADMAP.md` — Phase roadmap (Phase 1-11 complete, Phase 12+ optional)
7. `TASKS.md` — Current task status (Phase 11 complete, Phase 12+ blocked)
8. `AGENT_STATE.md` — Current agent status and recommendations
9. `HANDOFF.md` — Tool-to-tool handoff format and templates
10. `DECISIONS.md` — Product and technical decisions (Decisions 001-018)

Agent Execution & Scheduling Policies:

- `AGENT_SCHEDULING_POLICY.md` — When to use Single/Sequential/Parallel/Token Relay modes
- `AGENT_RUN_POLICY.md` — How agents are executed (CLI, Workbench, Manual) + approval gates
- `CONTEXT_TOKEN_RESUME_PROTOCOL.md` — Token limit handoff flow + Context Pack generation
- `AGENT_STATE.md` — Current agent availability status and fallback recommendations

Foundation & Architecture Docs:

- `CONTROL_TOWER_DIRECTION.md` — Canonical current direction for the Control Tower
- `ROADMAP.md` — Phase-level roadmap (Phase 11 complete)
- `TASK_MODEL.md` — Plan, task, kanban, diff, and execution log data models
- `VIBE_KANBAN_INTEGRATION.md` — Vibe Kanban bridge architecture and Phase 11 integration
- `HERMES_INTEGRATION_ROADMAP.md` — Hermes background worker roadmap (3 safe patterns, Phase 1-3)
- `PROMPT_TEMPLATES.md` — Reusable external-agent prompt templates + token relay templates

Supporting Docs (Phase 11 Complete):

- `DESIGN_SYSTEM.md` — UI design rules (Dark+Pink theme)
- `LOCAL_RUNNER_ARCHITECTURE.md` — Local terminal/IDE automation architecture
- `DEPLOYMENT_CHECKLIST.md` — **Updated Phase 11**: production deployment guide (Vercel, Docker, Node.js)
- `SUPABASE_SCHEMA.md` — Production database schema reference

## Archive

`archive/` contains superseded plans, session reports, long research, and task-specific design notes. Use it only when you need historical detail.
