# Agent Control Room

Agent Control Room is a personal Human-in-the-loop AI Development Orchestrator.
It turns product direction into technical tasks, recommends the right AI coding
tool, generates execution prompts, tracks work, and preserves handoff context.

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Next.js.

## MVP flow

1. Register or select a project.
2. Enter product direction in natural language.
3. Generate technical translation, tasks, routing, and prompt.
4. Track plan tasks in `/plan`.
5. Run or copy the prompt into Claude Code, Codex, or Antigravity.
6. Save the result as a session report or handoff.

## Files

- `CLAUDE.md` — Main AI coding context file
- `docs/PRD.md` — Current concise product requirements
- `docs/ARCHITECTURE.md` — System architecture and module design
- `docs/TASKS.md` — Current task status and next task
- `docs/HANDOFF.md` — Tool-to-tool handoff format
- `docs/AGENT_STATE.md` — Current project state and next prompt
- `docs/DECISIONS.md` — Product/technical decisions
- `docs/ROADMAP.md` — Phase-level roadmap
- `docs/TASK_MODEL.md` — Plan, task, kanban, diff, and execution log models
- `docs/VIBE_KANBAN_INTEGRATION.md` — Vibe Kanban bridge notes
- `docs/PROMPT_TEMPLATES.md` — Reusable prompts for Claude Code, Codex, Antigravity
- `docs/archive/` — Historical long-form research and superseded docs

## Recommended Start
Run the app and start from the Direction to Prompt screen. For implementation
handoffs, keep prompts bounded:

```txt
Read CLAUDE.md, docs/PRD.md, docs/ARCHITECTURE.md, and docs/TASKS.md.
Keep the change scoped to the current task and update docs if task status changes.
```
