# VIBE_KANBAN_INTEGRATION.md — Agent Control Room

## Purpose

This document consolidates the Vibe Kanban research, base-tool decision, and implementation mapping.

Archived source docs:
- `docs/archive/OPEN_SOURCE_ANALYSIS.md`
- `docs/archive/BASE_TOOL_DECISION.md`
- `docs/archive/IMPLEMENTATION_MAPPING.md`

## Decision

Use Vibe Kanban as a local-first base/reference for execution-board capabilities.

Decision status:
- Provisional

Reason:
- Vibe Kanban already has issue cards, workspaces, git worktrees, agent sessions, diff/review flows, and Claude Code/Codex support.
- Agent Control Room should remain the orchestration layer above it.

Caveat:
- Upstream says Vibe Kanban is sunsetting.
- Avoid deep fork work until MCP/API bridge proves useful.

## Local Setup

Source path:
- `external/vibe-kanban`

Verified local services:
- Frontend: `http://localhost:3002/`
- Backend health: `http://localhost:3003/api/health`
- Preview proxy: `http://localhost:3004/`

Known state:
- Local server may be offline during normal Agent Control Room work.
- Current bridge can use `MockVibeKanbanClient` fallback.

## Responsibility Split

Agent Control Room owns:
- product direction input
- technical translation
- task decomposition
- agent routing recommendation
- prompt generation
- handoff generation
- session report storage
- next task recommendation
- advisor mode
- plan/task state above execution

Vibe Kanban can own or inspire:
- kanban board
- issue/card lifecycle
- workspace creation
- git worktree management
- agent sessions
- diff/review UI
- dev server preview flow

## Integration Shape

Agent Control Room generates:
- task title
- task description
- acceptance criteria
- recommended agent
- generated prompt
- handoff context

Bridge sends:
- Vibe Kanban issue title
- issue description
- priority
- executor hint

Current implemented bridge:
- `lib/integrations/vibe-kanban.ts`
- `app/api/vibe-kanban/issue/route.ts`
- `components/projects/SendToVibeKanbanButton.tsx`

Current client strategy:
- `HttpVibeKanbanClient` targets local port `3003`.
- `MockVibeKanbanClient` is active fallback when local server is unavailable.

## Completed

- Vibe Kanban source downloaded.
- Dependencies installed.
- Local frontend/backend verified once.
- Issue draft conversion implemented.
- Generated prompt and acceptance criteria preserved in issue description.
- P0/P1/P2 mapped to high/medium/low.
- Claude Code and Codex mapped to executor IDs.
- Antigravity represented as manual executor note.
- API route added for issue creation bridge.
- UI button added for sending task draft to Vibe Kanban.

## Remaining

- Confirm stable local issue creation without cloud setup.
- Replace mock fallback with real client when local API is stable.
- Start workspace programmatically if needed.
- Read execution results back into Agent Control Room.
- Decide whether MCP is better than local HTTP API.

## Open Questions

- Does local Vibe Kanban support local-only issue creation without cloud setup?
- Is MCP the safer integration surface for issue creation and workspace start?
- Which project/repository IDs are required for workspace start?
- How should Antigravity be represented long-term if Vibe Kanban has no native executor?
