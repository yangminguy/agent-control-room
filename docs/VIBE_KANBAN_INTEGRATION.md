# VIBE_KANBAN_INTEGRATION.md — Agent Control Room

## Purpose

This document consolidates the Vibe Kanban research, base-tool decision, and implementation mapping in the current Control Tower direction.

Archived source docs:
- `docs/archive/OPEN_SOURCE_ANALYSIS.md`
- `docs/archive/BASE_TOOL_DECISION.md`
- `docs/archive/IMPLEMENTATION_MAPPING.md`

## Decision

Use Vibe Kanban as a local-first execution workbench for board, workspace, session, diff/review, and preview capabilities.

Decision status:
- Accepted direction, still bridge-first

Reason:
- Vibe Kanban already has issue cards, workspaces, git worktrees, agent sessions, diff/review flows, and Claude Code/Codex support.
- Agent Control Room should remain the AI Development Control Tower above it.
- Agent Control Room should not compete with Vibe Kanban by rebuilding a weaker board/session UI.

Caveat:
- Upstream says Vibe Kanban is sunsetting.
- Avoid deep fork work until MCP/API bridge proves useful and stable.

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
- idea intake
- product requirement translation
- roadmap generation
- Visual Development Roadmap Control Panel
- product direction input
- technical translation
- task decomposition
- agent routing recommendation
- Senior Dev Prompt Compiler
- handoff generation
- session report storage
- next task recommendation
- advisor mode
- plan/task state above execution
- user approval gates
- completion criteria and next-prompt reasoning
- Context Pack generation
- Obsidian-compatible insight memory

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
- generated prompt and acceptance criteria

Current implemented bridge:
- `lib/integrations/vibe-kanban.ts`
- `app/api/vibe-kanban/issue/route.ts`
- `components/projects/SendToVibeKanbanButton.tsx`

Current client strategy:
- `HttpVibeKanbanClient` targets local port `3003`.
- `MockVibeKanbanClient` is active fallback when local server is unavailable.

## Target UX Direction

Agent Control Room should act as the control panel:
- show the full product roadmap and completion checks
- show what should be done next
- show why an agent is recommended
- show what context and files matter
- generate the execution prompt
- require user approval before execution/continuation
- summarize what came back and recommend the next move

Vibe Kanban should act as the execution workbench:
- hold the detailed issue/card
- open or manage the workspace
- run supported Claude Code/Codex sessions where viable
- expose diffs/reviews/previews
- provide execution status that Agent Control Room can later import

Practical UI rule:
- Keep `/plan` roadmap-first and decision-focused.
- Prefer "Send to Vibe Kanban", "Open Vibe workspace", "Import result", and "Generate next prompt from result" over duplicating Vibe Kanban's full board/session screens.

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

- Confirm stable local issue/workspace creation without cloud setup.
- Add open-workspace links after issue creation.
- Start workspace/session programmatically if Vibe Kanban exposes a stable API/MCP path.
- Read execution results back into Agent Control Room.
- Convert imported Vibe Kanban results into session report, diff summary, and next prompt.
- Decide whether MCP is better than local HTTP API for session/workspace operations.

## Open Questions

- Does local Vibe Kanban support local-only issue creation without cloud setup?
- Is MCP the safer integration surface for issue creation and workspace start?
- Which project/repository IDs are required for workspace start?
- How should Antigravity be represented long-term if Vibe Kanban has no native executor?
- What is the smallest readback payload needed for Agent Control Room to make a good next-step decision?
