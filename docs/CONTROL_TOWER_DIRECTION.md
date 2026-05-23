# CONTROL_TOWER_DIRECTION.md — Agent Control Room

## Canonical Direction

Agent Control Room is a **roadmap-driven local AI development automation control tower for non-developer PMs**.

It is not a copy-paste prompt generator. Prompt and handoff generation are support modules inside a larger automation loop.

The user owns:
- product direction
- planning intent
- high-risk approval
- final product judgment

The system owns:
- roadmap generation
- task decomposition
- agent assignment
- risk classification
- local CLI execution through approved runner flows
- execution monitoring
- log, diff, typecheck, test, lint, and build analysis
- roadmap and kanban status updates
- Hermes-based supervision
- re-orchestration when execution drifts from the original direction

## Product Loop

```text
Idea or product direction
→ senior developer translation
→ visual roadmap
→ phase/task decomposition with acceptance criteria
→ agent routing
→ risk and scheduling decision
→ approval gate when needed
→ local CLI runner or workbench handoff
→ execution logs and git diff capture
→ Hermes supervision and verification
→ completion/failure/drift packet
→ roadmap and kanban status update
→ next task, QA, retry, or re-orchestration
```

The user should be interrupted only when product direction, credentials, approval, deployment, or risk acceptance is genuinely needed.

## UI Roles

| Surface | Role |
|---|---|
| `/plan` | Main roadmap control panel. Shows phases, progress, current task, risk, approvals, blockers, and next action. |
| Kanban / task cards | Detailed task inspection only. Shows status, assigned agent, risk, acceptance criteria, logs, and result summary. |
| Runner logs | Local execution log surface. Shows user-friendly stdout/stderr and command results. |
| Approval queue | Risk approval surface. Explains why approval is needed and what will happen if approved. |
| Hermes panel | Background supervision, validation, drift detection, and packet reporting surface. |
| `/dashboard` | Multi-project status summary. |

Roadmap is the main product surface. Kanban is not the main product and should not compete with Vibe Kanban's workbench UI.

## Agent Roles

| Agent | Role |
|---|---|
| Claude Code | Architecture, complex implementation, local CLI execution where approved. |
| Codex | Bounded fixes, tests, QA, type errors. CLI automation remains backlog until verified stable. |
| Antigravity | UI/UX and visual iteration. IDE automation remains backlog until verified stable. |
| Hermes | Background Execution Supervisor: logs, checks, packets, drift detection, reports. Never a coding agent. |
| Vibe Kanban | Detailed execution workbench for cards, workspaces, sessions, diffs, and previews. Not the product brain. |

## Automation Policy

Low-risk automation may run through approved local runner flows. High/critical risk work must pause for user approval.

Allowed Hermes automatic checks:

```bash
git status
git diff --stat
git log --oneline -n 10
npm run typecheck
npm run lint
npm run test
npm run build
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Hermes must not:
- edit code
- change dependencies
- modify secrets or `.env`
- run database migrations
- push, merge, rebase, reset, or clean git state
- deploy to production
- approve its own actions

## Vibe Kanban Boundary

Agent Control Room owns product intent, roadmap, task decomposition, routing, risk, approvals, prompt/context preparation, result interpretation, and re-orchestration.

Vibe Kanban owns or inspires detailed board/workspace/session/diff/preview surfaces.

Use Vibe Kanban for detailed task execution where helpful, but do not make it the source of roadmap truth or product direction.

## Backlog Boundaries

The following are valid future directions but not the current core loop:
- Telegram full approval bot integration
- Obsidian filesystem sync
- Supabase durable storage
- Codex CLI automation if not verified
- Antigravity IDE automation if not verified
- GitHub PR automation
- Production deployment automation
- Multi-user collaboration
- Discord Webhook

## Non-Negotiables

- Roadmap remains the main surface.
- Kanban remains a detailed task view.
- Hermes is a supervisor, not a coder.
- High/critical risk work cannot bypass approval.
- Local automation must return evidence: logs, diff, checks, and packetized result.
