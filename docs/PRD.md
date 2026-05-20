# PRD.md — Agent Control Room

## 1. Product Summary

Agent Control Room is a Human-in-the-loop AI Development Orchestrator for a PM/non-developer user.

It turns product direction into:
- technical translation
- small implementation tasks
- recommended AI coding agent
- copy-ready execution prompt
- execution/handoff context
- session report and next-step recommendation

The product reduces context loss and decision burden across Claude Code, Codex, and Antigravity.

Full historical PRD is archived at:
- `docs/archive/PRD_FULL_2026-05-20_part_01.md` through `_part_07.md`

## 2. Target User

Primary user:
- PM or non-developer building software with AI coding tools.

User needs:
- know what should be done next
- know which AI tool should do it
- know what context the tool should read first
- know what files can be edited
- know what completion means
- preserve handoff context between AI tools

## 3. Product Principle

Agent Control Room should be the operating room above AI coding tools.

It should not hide implementation behind full autonomy too early. The user stays in the loop, approves prompts/execution, reviews results, and decides whether to continue.

## 4. Core Loop

```text
User direction
→ technical translation
→ task decomposition
→ agent routing
→ generated prompt
→ user-approved execution/manual run
→ session report or execution log
→ diff/outcome analysis
→ next task or handoff
```

## 5. MVP Scope

Included:
- project registration/list/detail
- project document context
- direction input
- technical translation
- task decomposition
- agent routing recommendation
- prompt generation
- handoff generation
- session report input/storage
- advisor mode
- plan/kanban task model
- HTML implementation plan view
- Claude Code execution runner foundation

Excluded for now:
- automatic merge
- GitHub PR automation
- Slack alerts
- multi-user collaboration
- token usage automatic detection
- fully autonomous execution loop
- deep Vibe Kanban fork/custom UI

## 6. Agent Routing Defaults

| Work Type | Preferred Agent | Reason |
|---|---|---|
| Architecture, planning, document review | Claude Code | Strong context-heavy reasoning |
| Bounded implementation, tests, type errors | Codex | Strong scoped execution |
| UI prototype and visual iteration | Antigravity | Strong product/UI iteration |
| Unknown or ambiguous work | Claude Code | Analyze first |

If preferred agent status is `cooling_down`, `limited`, or `blocked`, recommend a viable fallback and generate a handoff.

## 7. Current Implementation Status

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
- Vibe Kanban issue draft bridge
- T016 Plan & Kanban data model
- T017 HTML plan view at `/plan`
- T018 Agent Execution Runner foundation

Current focus:
- T019 Git Diff & Outcome Analyzer

Known remaining work:
- project/task selection in session reports
- real Vibe Kanban issue/workspace bridge without mock fallback
- direct `RunnerLogView` wiring inside `/plan` cards
- diff analysis and completion judgment
- multi-agent routing enhancement

## 8. Acceptance Standard

The MVP is acceptable when the user can:

1. Register a project.
2. Enter a product direction.
3. Receive technical translation.
4. See decomposed tasks.
5. See recommended agent and reason.
6. Copy a tool-specific prompt.
7. Paste back a result or run a supported execution.
8. Save a session report.
9. Generate a handoff to another agent.
10. Track work in the plan/kanban view.

## 9. Active Docs

Read these first for implementation:
- `AGENTS.md`
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
- `docs/T016_PLAN_KANBAN_MODEL.md`
- `docs/T018_AGENT_EXECUTION_RUNNER_SPIKE.md`

## 10. Non-Goals

Do not build yet:
- automatic Codex execution beyond explicitly supported runner work
- automatic Antigravity execution
- GitHub PR creation
- Slack integration
- auto-merge
- permission/auth system
- multi-user/team workflow
