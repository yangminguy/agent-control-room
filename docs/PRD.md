# PRD.md — Agent Control Room

## 1. Product Summary

Agent Control Room is an **AI Development Control Tower for non-developer PMs**.

It turns an idea or product direction into:
- product requirement translation
- visual development roadmap
- small implementation tasks with acceptance criteria
- recommended AI coding agent or workbench
- senior-developer-quality execution prompt
- human approval gate
- **local terminal / IDE execution** (not external paid API calls by default)
- execution/handoff context
- result/diff analysis
- roadmap status update with completion checks
- Obsidian-compatible development memory
- next-step recommendation or Context Pack

The product reduces context loss and decision burden across already-authenticated local tools: Claude Code (CLI), Codex (local app), Antigravity (IDE), optional Hermes background work, and Vibe Kanban workbench execution.

**Important**: Agent Control Room does NOT call external paid AI APIs by default. It orchestrates local tools the user already owns and authenticates.

Full historical PRD is archived at:
- `docs/archive/PRD_FULL_2026-05-20_part_01.md` through `_part_07.md`

## 2. Target User

Primary user:
- PM or non-developer building software with AI coding tools.

User needs:
- turn a rough idea into a practical roadmap
- know what should be done next
- know which AI tool should do it
- know what context the tool should read first
- know what files can be edited
- know what completion means
- see completed work clearly checked off
- understand blockers and required decisions
- preserve handoff context between AI tools

## 3. Product Principle

Agent Control Room should be the control tower above AI coding tools.

It should not hide implementation behind full autonomy too early. The user stays in the loop, approves prompts/execution, reviews results, and decides whether to continue.

Agent Control Room should be the decision and context layer, not a weaker clone of an open-source kanban/execution product. Use Vibe Kanban as the execution workbench for cards, workspaces, agent sessions, diffs, and previews while Agent Control Room owns intent translation, routing, prompts, acceptance criteria, approvals, and handoffs.

## 4. Core Loop

```text
Idea or product direction
→ senior developer translation
→ roadmap generation
→ Visual Development Roadmap Control Panel
→ task decomposition
→ agent routing
→ Senior Dev Prompt Compiler
→ human approval
→ agent execution or Vibe Kanban workbench handoff
→ session report, execution log, or imported result
→ diff/outcome analysis
→ roadmap status update
→ Obsidian-compatible insight memory
→ next task, handoff, or Context Pack
```

## 5. MVP Scope

Included:
- project registration/list/detail
- project document context
- idea or product direction input
- technical translation
- roadmap generation
- task decomposition
- agent routing recommendation
- Senior Dev Prompt Compiler
- handoff generation
- session report input/storage
- advisor mode
- plan/kanban task model
- Visual Development Roadmap Control Panel at `/plan`
- Claude Code execution runner foundation
- git diff and outcome analysis
- manual agent status and handoff fallback
- human-approved loop continuation
- Vibe Kanban issue bridge for sending prepared tasks into an execution workbench
- planned Context Pack workflow for token/context reset
- planned Obsidian-compatible insight memory export

Excluded for now:
- automatic merge
- GitHub PR automation
- Slack alerts
- multi-user collaboration
- token usage automatic detection
- fully autonomous execution without user approval
- deep Vibe Kanban fork/custom UI
- replacing Agent Control Room's orchestration model with Vibe Kanban internals

## 6. Agent Routing Defaults

| Work Type | Preferred Agent | Reason |
|---|---|---|
| Architecture, planning, document review | Claude Code | Strong context-heavy reasoning |
| Bounded implementation, tests, type errors | Codex | Strong scoped execution |
| UI prototype and visual iteration | Antigravity | Strong product/UI iteration |
| Long-running monitoring, recurring summaries, memory notes | Hermes | Optional background worker, not primary coding brain |
| Workspace/session/diff/preview execution surface | Vibe Kanban | Execution workbench, not product brain |
| Unknown or ambiguous work | Claude Code | Analyze first |

Supported availability statuses: `available`, `cooling_down`, `token_limited`, `blocked`, `context_overloaded`, `manual_only`, `experimental`.

If the preferred agent is unavailable, recommend a viable fallback and generate a handoff or Context Pack. Do not use literal `/clear` automation as the product mechanism; generate a structured reset summary and next-session prompt.

## 7. `/plan` UX Direction

`/plan` is a **Visual Development Roadmap Control Panel** for a non-developer PM.

It should show:
- full product development roadmap
- roadmap stages
- `completed`, `active`, `waiting`, `blocked`, and `user_input_required` states
- check marks for completed stages
- responsible agent per stage
- current task and next action
- blocked reason and user decision points
- acceptance criteria

Kanban-style cards may remain as supporting UI, but `/plan` should not be framed only as a kanban board or a Vibe Kanban replacement.

## 8. Current Implementation Status

Implemented:
- Direction to Prompt at `/`
- `/api/orchestrate`
- OpenAI structured output with deterministic fallback
- project registration/list/detail UI
- local JSON storage
- session reports at `/reports`
- handoff generator and preview UI
- advisor mode at `/advisor`
- project/task markdown parsers
- Vibe Kanban issue draft and HTTP bridge
- T016 Plan & Kanban data model
- T017 HTML plan view at `/plan`
- T018 Agent Execution Runner foundation
- T019 Git Diff & Outcome Analyzer
- T020 Multi-Agent Router Enhancement
- T021 Token / Rate Limit Handoff
- T022 human-approved Autonomous Execution Loop
- T024 Vibe Kanban HTTP issue integration
- T026 Supabase storage migration readiness

Current focus:
- Roadmap-First Control Tower UX: reframe `/plan` around the product journey, completion checks, current task, next action, blocked decisions, and senior-dev prompt generation.
- Then deepen Vibe Kanban workbench integration: workspace/session launch, open workspace links, result import, and diff/review handoff.

Known remaining work:
- roadmap-first `/plan` UI refinement
- explicit Senior Dev Prompt Compiler structure in generated prompts
- Context Reset Protocol and Context Pack generator
- Obsidian-compatible insight memory export
- Hermes background worker positioning only; no high-risk autonomous coding
- deeper Vibe Kanban issue/workspace bridge beyond issue creation
- result readback from Vibe Kanban into Agent Control Room
- production hardening before deployment

## 9. Acceptance Standard

The MVP is acceptable when the user can:

1. Register a project.
2. Enter an idea or product direction.
3. Receive technical translation.
4. See a visual development roadmap.
5. See decomposed tasks with acceptance criteria.
6. See recommended agent and reason.
7. Copy a senior-dev-quality tool-specific prompt.
8. Approve execution or send the prepared task to Vibe Kanban.
9. Paste/import a result or run a supported execution.
10. Save a session report.
11. Generate a handoff or Context Pack to another agent/session.
12. Track progress in the roadmap-first `/plan` view.
13. Save durable development insights in Obsidian-compatible Markdown when that workflow is implemented.

## 10. Active Docs

Read these first for implementation:
- `AGENTS.md`
- `docs/CONTROL_TOWER_DIRECTION.md`
- `docs/PRD.md`
- `docs/ARCHITECTURE.md`
- `docs/TASKS.md`
- `docs/AGENT_STATE.md`
- `docs/HANDOFF.md`
- `docs/DECISIONS.md`

Supporting docs:
- `docs/ROADMAP.md`
- `docs/TASK_MODEL.md`
- `docs/VIBE_KANBAN_INTEGRATION.md`
- `docs/PROMPT_TEMPLATES.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/E2E_TEST_GUIDE.md`

## 11. Non-Goals

Do not build yet:
- automatic Codex execution beyond explicitly supported runner work
- automatic Antigravity execution
- GitHub PR creation
- Slack integration
- auto-merge
- uncontrolled deployment automation
- unsafe autonomous DB migration
- permission/auth system
- multi-user/team workflow
- a deep Vibe Kanban fork before the API/MCP workbench bridge is validated
