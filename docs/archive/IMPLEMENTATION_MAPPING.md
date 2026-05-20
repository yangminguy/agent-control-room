# IMPLEMENTATION_MAPPING.md — Agent Control Room

## Purpose

Map existing Agent Control Room MVP work against Vibe Kanban so we keep only the orchestration layer and avoid rebuilding what the base tool already does well.

## Keep In Agent Control Room

```txt
Product direction input
Technical translation
Task decomposition
Agent routing recommendation
Agent status / cooling_down logic
Tool-specific prompt generation
Handoff generation
Session report input/storage
Next task recommendation
Technical advisor mode
Project document context reader
```

## Let Vibe Kanban Handle First

```txt
Kanban board
Issue/card lifecycle
Workspace creation
Git worktree management
Agent process execution
Agent sessions
Diff/review UI
PR/review workflow
Dev server preview workflow
```

## Integrate

```txt
Agent Control Room Task -> Vibe Kanban Issue
Generated prompt -> Vibe Kanban issue description
Recommended agent -> Vibe Kanban executor selection
Handoff -> follow-up issue or session prompt
Session report -> Agent Control Room report storage
Agent status -> routing before Vibe Kanban workspace start
```

## Current Code Status

```txt
Implemented:
- Direction to Prompt screen at /
- /api/orchestrate with OpenAI structured output and local fallback
- Session report page at /reports
- /api/reports GET/POST backed by data/session-reports.json
- Local JSON readers for projects, tasks, handoffs, reports, and agent statuses
- Vibe Kanban issue draft conversion in lib/integrations/vibe-kanban.ts
- Project registration/list/detail routes and UI forms
- Dashboard cards
- Handoff generator UI and logic
- Vibe Kanban HTTP REST API issue creation bridge (via Mock fallback)
- Markdown parsers (AGENT_STATE.md, TASKS.md)

Not implemented yet:
- Project/task selection dropdowns in the session report form (minor enhancement)
- Advisor Mode (T015)
- Automated CLI execution for agents
```

## Defer Or Avoid

```txt
Custom kanban board implementation
Custom worktree manager
Custom diff/review system
Direct Claude Code/Codex runner in MVP 1
Deep Vibe Kanban UI fork before MCP/API bridge is tested
```

## First Bridge Shape

```txt
Agent Control Room generates:
- parent task
- child tasks
- acceptance criteria
- recommended executor
- Vibe Kanban-ready issue title
- Vibe Kanban-ready issue description

Then bridge layer sends:
- create_issue
- optionally start_workspace
```

Current bridge status:

```txt
Done:
- Convert one generated task to a VibeKanbanIssueDraft.
- Preserve generated prompt and acceptance criteria in the description.
- Map P0/P1/P2 to high/medium/low.
- Map Claude Code and Codex to native executor IDs.
- Represent Antigravity as a manual executor note.
- Defined `VibeKanbanClient` interface and API route `/api/vibe-kanban/issue`.
- Built `HttpVibeKanbanClient` to target local port 3003.
- Integrated a `MockVibeKanbanClient` as the active fallback while the Vibe Kanban server is offline.
- Added "Vibe Kanban 전송" button to Task cards in the UI.

Remaining:
- Actually start a workspace programmatically (optional for MVP).
- Turn off `MockVibeKanbanClient` and use real `HttpVibeKanbanClient` when upstream server is confirmed stable.
```

## Open Questions

```txt
Does local Vibe Kanban support local-only issue creation without cloud setup?
Is the MCP server enough for issue creation in local mode?
Which project/repository IDs are needed to create and start a workspace?
How should Antigravity be represented if Vibe Kanban has no native executor for it?
```
