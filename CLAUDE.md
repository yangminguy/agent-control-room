# CLAUDE.md — Agent Control Room

## Project Summary
Agent Control Room is a personal AI development orchestration system for a PM/non-developer user. It converts product direction into technical tasks, recommends the right AI coding tool, generates execution prompts, and creates handoffs between Claude Code, Codex, and Antigravity.

The MVP is a human-in-the-loop Prompt & Handoff Orchestrator. It now includes a limited Claude Code execution runner, but the product should keep user approval and review at the center.

## Product Principle
The product must reduce context loss and decision burden. It should help the user answer:

- What should be done next?
- Which AI tool should do it?
- What context should the tool read first?
- What files can it edit?
- What does completion mean?
- How should the work be handed off?

## Current MVP Scope
Build MVP 1: Prompt & Handoff Orchestrator.

Included:
- Project registration
- Project document reader
- Direction input
- Technical translation
- Task decomposition
- Agent routing recommendation
- Tool-specific prompt generation
- Handoff generation
- Session report input/storage
- Next task recommendation

Excluded:
- Codex automatic execution
- Antigravity automatic execution
- Token usage automatic detection
- Slack integration
- GitHub PR automation
- Auto-merge
- fully autonomous code execution without user approval

## Current Implementation Status
As of 2026-05-20, the codebase implements:

- Direction to Prompt at `/`.
- `/api/orchestrate` with OpenAI structured output and deterministic local fallback.
- TypeScript domain types in `lib/types.ts`.
- Local JSON seed/read storage in `data/` and `lib/storage/json-store.ts`.
- Session report input and persistence at `/reports` and `/api/reports`.
- Vibe Kanban issue draft conversion in `lib/integrations/vibe-kanban.ts`.
- Project registration/list/detail routes and UI.
- Handoff preview UI.
- Plan & Kanban data model (`FeaturePlan`, `PlanTask`, `KanbanCard`, `SubAgentTrack`, `ExecutionLog`).
- `/plan` HTML Implementation Plan View with Kanban board/card UI and manual task status updates.
- Agent Execution Runner foundation: git branch creation, Claude Code CLI spawn, SSE log streaming, execution log storage, and `RunnerLogView`.
- T019 Git Diff & Outcome Analyzer.
- T020 Multi-Agent Router Enhancement.
- T021 Token / Rate Limit Handoff.
- T022 human-approved Autonomous Execution Loop.

Still missing:

- Real Vibe Kanban issue creation through MCP or local HTTP API.
- Loop UX polish, error recovery, and production hardening.

## Recommended Tech Stack
Use this unless the user explicitly changes direction.

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI: shadcn/ui where useful
- Icons: lucide-react
- Storage MVP: local JSON or SQLite
- Storage later: Supabase
- Deployment: Vercel

## Key Domain Terms

### Agent
An external AI coding tool used by the user.
Allowed values:
- `claude-code`
- `codex`
- `antigravity`

### Orchestrator
The product layer that translates user intent into technical execution plans.

### Handoff
A structured transfer document from one AI tool to another.

### Session Report
A structured record of what an AI tool did in a specific work session.

## Agent Routing Rules
Use these defaults:

| Work Type | Preferred Agent | Reason |
|---|---|---|
| Architecture, complex reasoning, document review | Claude Code | Strong at context-heavy planning |
| Clear implementation, bug fixing, tests, type errors | Codex | Strong at bounded implementation |
| UI prototype, visual iteration, multi-file screen work | Antigravity | Strong for visual/product implementation |
| Unknown or ambiguous work | Claude Code first | Analyze before implementation |

If preferred agent status is `cooling_down`, `limited`, or `blocked`, recommend a viable fallback and generate a handoff.

## Core Flow
1. User selects or registers a project.
2. System reads core docs.
3. User enters product direction.
4. System converts direction into technical translation.
5. System decomposes work into small tasks.
6. System recommends an agent.
7. System generates a copy-ready prompt.
8. User runs the prompt in the selected tool.
9. User pastes the result back.
10. System saves a session report.
11. System recommends next task or creates a handoff.

## Core Documents to Read First
For any implementation task, read in this order:

1. `CLAUDE.md`
2. `docs/README.md`
3. `docs/PRD.md`
4. `docs/ARCHITECTURE.md`
5. `docs/TASKS.md`
6. `docs/AGENT_STATE.md`
7. `docs/HANDOFF.md`
8. `docs/DECISIONS.md`

## Coding Rules
- Keep MVP small and explicit.
- Do not expand automatic tool execution beyond explicitly supported, human-approved runner flows.
- Do not add multi-user collaboration unless requested.
- Do not invent token usage integrations.
- Prefer structured markdown and deterministic templates.
- Keep prompt output copy-ready.
- Every generated task must include acceptance criteria.
- Every handoff must include changed files, remaining work, and next prompt.

## Suggested Folder Structure
```txt
agent-control-room/
  app/
    page.tsx
    projects/
      page.tsx
      [id]/page.tsx
    direction/new/page.tsx
    handoffs/page.tsx
    reports/page.tsx
  components/
    agents/
    projects/
    prompts/
    handoffs/
    reports/
    ui/
  lib/
    orchestration/
    project-docs/
    routing/
    prompts/
    storage/
    types.ts
  data/
    projects.json
    tasks.json
    handoffs.json
    session-reports.json
  docs/
    PRD.md
    ARCHITECTURE.md
    TASKS.md
    HANDOFF.md
    AGENT_STATE.md
    DECISIONS.md
  CLAUDE.md
```

## Initial Implementation Order
1. Define TypeScript domain types.
2. Create seed data storage layer.
3. Build project registration/list/detail UI.
4. Implement document summary input/manual paste flow.
5. Build direction input form.
6. Implement technical translation output model.
7. Implement task decomposition model.
8. Implement routing rules.
9. Implement prompt generator.
10. Implement handoff generator.
11. Implement session report form.
12. Build dashboard cards.

## Acceptance Standard
The MVP is acceptable when the user can:

1. Register a project.
2. Enter a product direction.
3. Receive technical translation.
4. See decomposed tasks.
5. See recommended agent and reason.
6. Copy a tool-specific prompt.
7. Paste back a result.
8. Save a session report.
9. Generate a handoff to another agent.

## Do Not Do Yet
- Do not connect to Claude Code CLI.
- Do not connect to Codex CLI.
- Do not connect to Antigravity automatically.
- Do not implement GitHub PR creation.
- Do not implement Slack alerts.
- Do not overbuild permissions/authentication.

## Report Format After Each Coding Session
```md
# Session Report

## Summary

## Changed Files

## Tests Run

## Completed

## Remaining Issues

## Recommended Next Task

## Handoff Needed?
```
