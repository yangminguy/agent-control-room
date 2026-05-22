# Agent Control Room Docs

This folder is split into active docs and archived context.

## Current Status
**Phase 39 Complete (2026-05-22)**:
- ✅ Phase 1-39 Fully Implemented and passing all **273 integration and unit tests** (280 total, 7 skipped).
- ✅ Core Autonomous Orchestration Loop, Prompt compilers, Hermes LLM Validation and Auto-Decisions.
- ✅ Multi-Project Queues and Live Monitoring Dashboard (`/dashboard`).
- ✅ **Hermes Telegram Integration** (TelegramClient with 6 message types, mock mode support).
- ✅ **OrchestrationPacket & PhaseCompletePacket** (formalized packet types for Hermes↔Control Room communication).
- ✅ **Risk Classification Engine** (Low/Medium/High auto-classification with file conflict detection).
- ✅ **6 Complete Workflow Scenarios** (approval, classification, phase completion, failure reporting, risk warnings, orchestration loop).
- 🚀 Ready for: Real Telegram Bot Token Configuration, Obsidian Memory Loop, Production Deployment.

## Active Docs — Read in Order

Implementation context (start here):

1. `../CLAUDE.md` — Project summary, current implementation status (Phase 1-39)
2. `../AGENTS.md` — Agent definitions, routing rules, availability manager
3. `CONTROL_TOWER_DIRECTION.md` — Canonical product direction (Control Tower for PMs)
4. `PRD.md` — Concise product requirements
5. `ARCHITECTURE.md` — System architecture and module design
6. `HERMES_IMPLEMENTATION_GUIDE.md` — **NEW**: Comprehensive Hermes implementation guide (Phase 37-39)
7. `ROADMAP.md` — Phase roadmap (Phase 1-39 complete)
8. `TASKS.md` — Current task status (Phase 39 complete)
9. `AGENT_STATE.md` — Current agent status and recommendations
10. `HANDOFF.md` — Tool-to-tool handoff format and templates
11. `DECISIONS.md` — Product and technical decisions (Decisions 001-018)

Agent Execution & Scheduling Policies:

- `AGENT_SCHEDULING_POLICY.md` — When to use Single/Sequential/Parallel/Token Relay modes
- `AGENT_RUN_POLICY.md` — How agents are executed (CLI, Workbench, Manual) + approval gates
- `CONTEXT_TOKEN_RESUME_PROTOCOL.md` — Token limit handoff flow + Context Pack generation
- `AGENT_STATE.md` — Current agent availability status and fallback recommendations

Foundation & Architecture Docs:

- `CONTROL_TOWER_DIRECTION.md` — Canonical current direction for the Control Tower
- `ROADMAP.md` — Phase-level roadmap (Phase 39 complete)
- `TASK_MODEL.md` — Plan, task, kanban, diff, and execution log data models
- `VIBE_KANBAN_INTEGRATION.md` — Vibe Kanban bridge architecture and Phase 36 integration baseline
- `HERMES_INTEGRATION_ROADMAP.md` — Hermes background worker roadmap (3 safe patterns, Phase 1-3)
- `PROMPT_TEMPLATES.md` — Reusable external-agent prompt templates + token relay templates

Supporting Docs:

- `DESIGN_SYSTEM.md` — UI design rules (Dark+Pink theme)
- `LOCAL_RUNNER_ARCHITECTURE.md` — Local terminal/IDE automation architecture
- `DEPLOYMENT_CHECKLIST.md` — production deployment guide (Vercel, Docker, Node.js)
- `SUPABASE_SCHEMA.md` — Production database schema reference

## Archive

`archive/` contains superseded plans, session reports, long research, and task-specific design notes. Use it only when you need historical detail.
