# AGENT_STATE.md — Agent Control Room

## current_goal

Realign and stabilize Agent Control Room as a roadmap-driven local AI development automation control tower for non-developer PMs.

The active product loop is:

```text
planning intent
→ roadmap
→ task decomposition
→ risk-based local CLI execution
→ Hermes supervision
→ result/diff/check analysis
→ roadmap and kanban status update
→ next task, QA, retry, pause, or re-orchestration
```

## active_phase

Phase E/F — Hermes Supervision Loop completion and Validation & Documentation

## active_task

Update documentation to reflect Phase E implementation and verify packet wiring in Phase F:
- Roadmap remains the main UI.
- Kanban remains detailed task inspection.
- Approval gates block high/critical risk work.
- Local runner returns logs, diffs, and checks.
- Hermes packet builder and decision classifier are implemented but not yet wired to automatic execution completion.
- Result normalizer extracts status from ExecutionLog; packets are built on-demand, not automatically.
- Phase F will wire packet generation to runner completion and verify status updates work end-to-end.

## current_agent

Claude Code or Codex, depending on task scope.

## recommended_next_agent

Codex for bounded verification and doc consistency checks. Claude Code for architecture or runner-policy changes.

## agent_statuses

| Agent | Status | Reason |
|---|---|---|
| claude-code | available | Best for architecture, local runner, integration, and complex reasoning. |
| codex | available | Best for bounded implementation, tests, typecheck, and QA. |
| antigravity | manual_only | Best for UI/UX work; IDE automation is not verified. |
| hermes | experimental | Background supervisor only; no code edits. |
| vibe-kanban | available | Detailed workbench/reference; not product brain. |

## blockers

- Codex CLI automation must remain backlog until the executable and safety behavior are verified.
- Antigravity IDE automation must remain backlog until an explicit safe integration path exists.
- Telegram approval bot is not authoritative until approval state is durable and synchronized.
- Supabase durable storage is not required for the local loop unless approval persistence needs it.
- Discord Webhook is not part of the active approval direction.
- Production deployment automation is out of current scope.

## assumptions

- MVP uses Next.js App Router, TypeScript, Tailwind, and local JSON storage by default.
- `/api/runner` is the internal local runner endpoint, not an external paid model API.
- Supported local execution requires approval and context binding.
- High/critical risk work remains approval-gated.
- Roadmap status is the main product truth.
- Vibe Kanban can be used as a detailed execution workbench, but Agent Control Room owns orchestration.
- Hermes can run safe checks and generate packets, but cannot edit code.

## next_task

Run an end-to-end verification of the main flow:

1. planning input creates/updates roadmap tasks
2. task shows agent, risk, and scheduling recommendation
3. approval gate blocks risky execution
4. local runner streams logs for supported execution
5. diff/check results are captured
6. Hermes packet is generated or displayed
7. roadmap and kanban status update

## key_constraints

- Do not let Hermes become a coding agent.
- Do not make Kanban the primary surface.
- Do not make Vibe Kanban the product brain.
- Do not bypass approval gates for high/critical risk.
- Do not activate Telegram, Supabase, GitHub PR, production deploy, Discord, Codex CLI, or Antigravity automation unless the specific integration has been verified and approved.

## last_updated

2026-05-23 — Phase E completion: Result normalizer, packet builder, decision classifier, status updater implemented. Documentation updated to reflect actual state.
