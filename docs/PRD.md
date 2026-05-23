# PRD.md — Agent Control Room

## 1. Product Summary

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

It turns product direction into:
- senior-developer translation
- visual roadmap
- executable phases and tasks
- acceptance criteria
- agent assignment
- risk and scheduling decisions
- local CLI execution through approval-gated runner flows
- Hermes background supervision
- log, diff, test, lint, typecheck, and build analysis
- roadmap and kanban status updates
- retry, QA, next-task, or re-orchestration decisions

Agent Control Room is not a copy-paste prompt generator. The Senior Dev Prompt Compiler and handoff generators remain useful submodules, but the product promise is the full automation loop.

## 2. Target User

Primary user:
- A PM or non-developer building software with local AI coding tools.

The user should not need to manage low-level execution details. They should provide direction, approve high-risk work, and judge final product results.

## 3. Core Flow

```text
User planning intent
→ Control Tower roadmap
→ phase/task decomposition
→ agent routing
→ risk classification
→ recommended scheduling mode
→ approval if needed
→ local CLI runner or Vibe Kanban workbench
→ Hermes supervision
→ result/diff/check analysis
→ roadmap and kanban update
→ next task, retry, QA, pause, or re-orchestration
```

## 4. Product Principles

- Reduce context loss and decision burden.
- Keep roadmap as the main truth surface.
- Treat Kanban as detailed task inspection, not the main product.
- Automate low-risk local work where the runner is verified.
- Require approval for high/critical risk work.
- Return evidence for every execution: logs, changed files, checks, and result classification.
- Make Hermes supervise and report; do not let Hermes code.
- Use Vibe Kanban as a detailed execution workbench, not as the product brain.

## 5. MVP Scope

Included:
- project registration and document reading
- direction input and senior-dev translation
- roadmap generation
- task decomposition with acceptance criteria
- agent routing and capability explanation
- risk classification
- scheduling mode recommendation
- web approval gates
- local runner execution for verified adapters
- log streaming and result capture
- git diff analysis
- test/lint/typecheck/build result capture where available
- Hermes supervision packets
- roadmap and kanban status updates
- session reports and context packs
- Vibe Kanban bridge for detailed workbench use

Excluded from current core:
- uncontrolled autonomous execution
- Codex CLI automation until verified stable
- Antigravity IDE automation until verified stable
- GitHub PR automation
- production deployment automation
- database migration automation
- Slack integration
- multi-user collaboration
- Supabase as required storage
- Obsidian filesystem sync as required memory
- Discord as an active approval channel

## 6. UI Requirements

| UI | Requirement |
|---|---|
| `/plan` | Main roadmap control panel with phase progress, active task, risk, approvals, blockers, Hermes state, and next action. |
| Kanban | Detailed task view with assigned agent, risk, acceptance criteria, logs, result summary, QA status, and workbench links. |
| `/workbench` | Execution readiness, approval checklist, local runner launch, scheduling explanation, and logs. |
| `/orchestration` | Queue, approval, validation, auto-decision suggestions, progress, feedback, and re-orchestration state. |
| `/dashboard` | Multi-project status, active agents, blocked tasks, approval needs, and Hermes health. |
| Hermes panel | Phase completion, failure, drift, approval request, and re-orchestration packets. |

## 7. Agent Routing Defaults

| Work Type | Preferred Agent | Reason |
|---|---|---|
| Architecture, planning, complex integration | Claude Code | Strong context-heavy reasoning and local implementation. |
| Bounded implementation, tests, type errors, QA | Codex | Strong focused verification and repair. |
| UI prototype and visual iteration | Antigravity | Strong product/UI iteration. |
| Monitoring, checks, summaries, packets, drift detection | Hermes | Background supervisor, not a coding agent. |
| Detailed board/workspace/session/diff/preview | Vibe Kanban | Execution workbench, not product brain. |

## 8. Acceptance Standard

The MVP is acceptable when the user can:

1. Register or select a project.
2. Enter a product direction.
3. Receive a senior-dev translation.
4. See a roadmap-first plan.
5. See tasks with acceptance criteria.
6. See the recommended agent and why.
7. See the recommended execution mode and risk.
8. Approve or reject risky execution.
9. Run supported local CLI execution or send to a workbench.
10. Watch logs and receive result/diff/check summaries.
11. Receive Hermes completion, failure, drift, or approval packets.
12. See roadmap and kanban status updated.
13. Continue to the next task, retry, QA, pause, or re-orchestrate.

## 9. Current Focus

Current focus is not adding more peripheral integrations. It is stabilizing the main loop:

```text
planning → roadmap → local CLI execution → Hermes supervision → result analysis → roadmap update → re-orchestration
```

See `docs/TASKS.md` for active phases and backlog.
