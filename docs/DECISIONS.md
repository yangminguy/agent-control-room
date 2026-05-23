# DECISIONS.md — Agent Control Room

## Decision 001 — Product is roadmap-driven local automation, not prompt-first

Status: Accepted, replaces earlier prompt-first framing

### Decision

Agent Control Room is a roadmap-driven local AI development automation control tower for non-developer PMs.

Prompt generation, handoff generation, and copy-ready packets remain support modules, but the main product loop is roadmap creation, approved local execution, Hermes supervision, evidence analysis, status update, and re-orchestration.

### Consequence

Docs and UI should not frame the product as a copy-paste prompt generator or manual handoff tool.

## Decision 002 — User owns direction and risk approval

Status: Accepted

### Decision

The user owns product direction, planning intent, high-risk approval, and final product judgment.

### Consequence

High/critical risk work must pause for explicit approval. The system may recommend, explain, and prepare, but it must not silently execute dangerous work.

## Decision 003 — System owns roadmap and execution orchestration

Status: Accepted

### Decision

The system owns roadmap generation, task decomposition, agent assignment, risk classification, scheduling recommendation, supported local CLI execution, log/diff/check analysis, status updates, Hermes supervision, and re-orchestration.

### Consequence

The current core loop should be automated where safe and verified.

## Decision 004 — Roadmap is main, Kanban is detail

Status: Accepted

### Decision

`/plan` is the main roadmap control panel. Kanban-style UI is a detailed task inspection surface.

### Consequence

Do not rebuild a full Vibe Kanban clone inside Agent Control Room. Use Kanban to inspect tasks, not to define the product's center of gravity.

## Decision 005 — Vibe Kanban is the workbench, not the brain

Status: Accepted

### Decision

Agent Control Room owns product intent, roadmap, task decomposition, routing, risk, approvals, context, result interpretation, and re-orchestration.

Vibe Kanban owns or inspires detailed cards, workspaces, agent sessions, diffs, and previews.

### Consequence

Vibe Kanban should not become the roadmap source of truth or product brain.

## Decision 006 — Hermes is a Background Execution Supervisor

Status: Accepted

### Decision

Hermes supervises execution, runs safe checks, collects logs, summarizes failures, detects drift, generates packets, and reports back to Agent Control Room.

Hermes is not a coding agent.

### Consequence

Hermes must not edit code, change dependencies, migrate databases, deploy, push, merge, rebase, reset, clean git state, or approve its own actions.

## Decision 007 — Safe Hermes commands are allowlisted

Status: Accepted

### Decision

Hermes may automatically run only:

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

### Consequence

All other commands require policy review, and risky commands require explicit approval or remain manual.

## Decision 008 — Codex and Antigravity automation require verification

Status: Accepted

### Decision

Codex CLI automation and Antigravity IDE automation remain backlog until stable execution paths and safety behavior are verified.

### Consequence

Codex and Antigravity can still be recommended agents, but automatic execution must not be assumed.

## Decision 009 — Local JSON is the default; Supabase is later

Status: Accepted

### Decision

The local automation loop should work with local JSON storage by default.

### Consequence

Supabase durable storage is a later phase unless approval persistence or multi-process execution requires it.

## Decision 010 — Backlog integrations are not core-loop blockers

Status: Accepted

### Decision

The following are backlog/later phase:
- Telegram full approval bot integration
- Obsidian filesystem sync
- Supabase durable storage
- GitHub PR automation
- Production deployment automation
- Multi-user collaboration
- Discord Webhook

### Consequence

Do not present these as current MVP requirements or active dependencies of the main loop.

## Decision 011 — Execution evidence is mandatory

Status: Accepted

### Decision

Every automated or workbench execution should return evidence:
- execution logs
- changed files
- git diff summary
- typecheck/lint/test/build status where available
- completion judgment
- remaining risks
- next task recommendation

### Consequence

Agent Control Room updates roadmap state based on evidence, not trust in an agent's narrative alone.
