# AGENTS.md — Agent Control Room

## Project Summary
Agent Control Room is a personal **AI Development Control Tower** for a PM/non-developer user. It turns an idea or product direction into a visual development roadmap, decomposes it into executable tasks, recommends the right AI agent or workbench, compiles senior-developer-quality prompts, tracks outcomes, and preserves handoff context until the product or feature is complete.

The current MVP began with prompt and handoff orchestration. The updated direction expands it into a roadmap-first control tower while keeping user approval, review, and explicit execution gates at the center.

## Current Direction
Agent Control Room should now be described first as an AI Development Control Tower for non-developer PMs.

The product loop is: idea or product direction → senior developer translation → visual roadmap → task decomposition → agent routing → senior-dev prompt compilation → human approval → execution/workbench handoff → result/diff analysis → roadmap completion checks → Obsidian-compatible insight memory → next task, handoff, or Context Pack.

Prompt and handoff generation remain core submodules, but they are no longer the whole product definition.

## Product Principle
The product must reduce context loss and decision burden. It should help the user answer:

- What should be done next?
- Which AI tool should do it?
- What context should the tool read first?
- What files can it edit?
- What does completion mean?
- How should the work be handed off?

Agent Control Room should remain the orchestration brain. Open-source execution tools such as Vibe Kanban should be used as the execution workbench: issue cards, workspaces, agent sessions, diffs, and previews. Do not make Agent Control Room compete with Vibe Kanban's board/execution UI; use it to decide what should happen, prepare the right prompt/context, and hand the work to the best execution surface.

## Current MVP Scope
Build the roadmap-first MVP of the AI Development Control Tower.

Included:
- Project registration
- Project document reader
- Idea or product direction input
- Technical translation
- Product roadmap generation
- Visual `/plan` roadmap control panel
- Task decomposition with acceptance criteria
- Agent routing recommendation
- Senior Dev Prompt Compiler for tool-specific prompts
- Handoff generation
- Session report input/storage
- Next task recommendation
- Agent availability manager
- Context reset / handoff pack generation
- Obsidian-compatible insight memory export concept

Excluded:
- Codex automatic execution
- Antigravity automatic execution
- Token usage automatic detection
- Slack integration
- GitHub PR automation
- Auto-merge
- fully autonomous code execution without user approval
- deep Vibe Kanban fork or replacement of Agent Control Room's orchestration layer

## Current Implementation Status
As of 2026-05-21, the codebase implements:

- Direction to Prompt at `/`.
- `/api/orchestrate` with OpenAI structured output and deterministic local fallback.
- TypeScript domain types in `lib/types.ts`.
- Local JSON seed/read storage in `data/` and `lib/storage/json-store.ts`.
- Session report input and persistence at `/reports` and `/api/reports`.
- Vibe Kanban issue draft conversion and HTTP bridge in `lib/integrations/vibe-kanban.ts`.
- Project registration/list/detail routes and UI.
- Handoff preview UI.
- Plan, task, and card data model (`FeaturePlan`, `PlanTask`, `KanbanCard`, `SubAgentTrack`, `ExecutionLog`).
- `/plan` HTML plan view with current card/status UI and manual task status updates; next direction is roadmap-first.
- Agent Execution Runner foundation: git branch creation, Claude Code CLI spawn, SSE log streaming, execution log storage, and `RunnerLogView`.
- T019 Git Diff & Outcome Analyzer.
- T020 Multi-Agent Router Enhancement.
- T021 Token / Rate Limit Handoff.
- T022 human-approved Autonomous Execution Loop.
- T024 Vibe Kanban HTTP issue integration with mock fallback.
- T026 Supabase schema/storage migration readiness with JSON fallback.

Still missing:

- Deeper Vibe Kanban workbench usage: workspace/session launch, open workspace links, result import, and diff/review handoff.
- Clear separation between Agent Control Room's control panel and Vibe Kanban's board/execution UI.
- Production hardening.

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
- `hermes` (optional background/status/memory worker, not primary coding brain)

### Orchestrator
The product layer that translates user intent into a roadmap, task sequence, agent routing, prompts, approval gates, and next-step decisions.

### Senior Dev Prompt Compiler
The module that converts vague non-developer direction into copy-ready prompts with goal, context, scope, non-goals, files to inspect, editable files, acceptance criteria, checks, and handoff instructions.

### Handoff
A structured transfer document from one AI tool to another.

### Session Report
A structured record of what an AI tool did in a specific work session.

### Context Pack
A reset/handoff document used when a session becomes long, token-limited, blocked, or ready to move to a new agent. It must include project goal, completed work, changed files, important decisions, blockers, next task, acceptance criteria, do-not-do rules, and the next prompt.

## Agent Routing Rules
Use these defaults:

| Work Type | Preferred Agent | Reason |
|---|---|---|
| Architecture, complex reasoning, document review | Claude Code | Strong at context-heavy planning |
| Clear implementation, bug fixing, tests, type errors | Codex | Strong at bounded implementation |
| UI prototype, visual iteration, multi-file screen work | Antigravity | Strong for visual/product implementation |
| Long-running monitoring, summaries, memory extraction | Hermes | Background/status/memory worker, not primary coding agent |
| Workspaces, sessions, diffs, previews | Vibe Kanban | Execution workbench, not product brain |
| Unknown or ambiguous work | Claude Code first | Analyze before implementation |

If preferred agent status is `cooling_down`, `token_limited`, `context_overloaded`, `blocked`, `manual_only`, or `experimental`, recommend a viable fallback and generate a handoff or Context Pack. Do not invent automatic token integrations; status is manually tracked unless explicitly implemented.

## Multi-Agent Execution Strategy

Agent Control Room does **not** run all agents simultaneously by default.

Instead, use these execution modes based on task risk, file conflicts, and token status:

| Mode | When to Use | Example |
|---|---|---|
| Single Agent | High-risk, tightly-coupled files | Runner logic, DB migration, auth changes, package updates |
| Sequential | Implementation then verification | Claude Code implements → Codex tests → Claude Code fixes |
| Parallel Safe | Completely separate files, no conflicts | Claude Code (API) + Antigravity (UI on separate routes) in parallel |
| Token Relay | Current agent hits token limit | Claude Code runs out of context → handoff to Codex for tests |

**Key principle**: Multiple agents are used for task specialization and token distribution, not blind parallelization. File conflicts must be avoided.

See `docs/AGENT_SCHEDULING_POLICY.md` for detailed decision tree and file conflict matrix.
See `docs/AGENT_RUN_POLICY.md` for execution surfaces (CLI, Workbench, Manual).
See `docs/CONTEXT_TOKEN_RESUME_PROTOCOL.md` for token limit handoff and Context Pack generation.

## Core Flow
1. User selects or registers a project.
2. System reads core docs.
3. User enters an idea or product direction.
4. System translates the idea like a senior developer/product partner.
5. System generates a product roadmap and visual `/plan` roadmap control panel.
6. System decomposes roadmap stages into small tasks with acceptance criteria.
7. System recommends an agent or execution workbench.
8. System compiles a copy-ready senior-dev prompt.
9. User approves execution or sends the task to a workbench such as Vibe Kanban.
10. System imports or receives the execution result.
11. System analyzes completion, partial completion, failure, blockers, and changed files.
12. System updates roadmap status, saves a session report, stores useful insight, and recommends the next task or Context Pack.

## Open-Source Integration Direction
Use Vibe Kanban as the execution workbench, not the product brain.

- Agent Control Room owns: product intent, technical translation, task decomposition, agent routing, prompt generation, acceptance criteria, approval gates, and handoff context.
- Vibe Kanban owns or inspires: issue cards, workspace lifecycle, git worktrees, Claude/Codex sessions, diff/review UI, and preview flows.
- Prefer API/MCP bridge work over cloning or redesigning Vibe Kanban UI.
- Reduce duplicate internal board features over time. `/plan` should become a control panel for strategy, readiness, and next prompts; Vibe Kanban should handle detailed board/execution surfaces where possible.

## Core Documents to Read First
For any implementation task, read in this order:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `docs/README.md`
4. `docs/CONTROL_TOWER_DIRECTION.md`
5. `docs/PRD.md`
6. `docs/ARCHITECTURE.md`
7. `docs/TASKS.md`
8. `docs/AGENT_STATE.md`
9. `docs/HANDOFF.md`
10. `docs/DECISIONS.md`

## Coding Rules
- Keep MVP small and explicit.
- Do not expand automatic tool execution beyond explicitly supported, human-approved runner flows.
- Do not add multi-user collaboration unless requested.
- Do not invent token usage integrations.
- Prefer structured markdown and deterministic templates.
- Keep prompt output copy-ready.
- Every generated task must include acceptance criteria.
- Every handoff must include changed files, remaining work, and next prompt.
- `/plan` should be a Visual Development Roadmap Control Panel for a non-developer, not a full Vibe Kanban clone.
- Store durable development insights as Obsidian-compatible Markdown when that workflow is implemented.

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
  AGENTS.md
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
- Do not add uncontrolled Codex automatic execution.
- Do not connect to Antigravity automatically.
- Do not implement GitHub PR creation.
- Do not implement Slack alerts.
- Do not implement unsafe autonomous DB migrations or deployment automation.
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
