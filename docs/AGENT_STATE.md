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

Phase 2 (Multi-Agent Orchestration) — Completed  
Phase 3 (Documentation & Integration Verification) — Completed  
Phase 3-P0 (Critical Fixes) — ✅ Completed  
Phase 4 (E2E Testing with Codex) — Ready to start

## active_task

Phase 3-P0: Critical fixes now complete:
- ✅ P0-1: Smoke-E2E test isolation (production data pollution fixed)
- ✅ P0-2: Approval enforcement in dispatch loop (high/critical risk blocking)
- ✅ P0-3: Hermes persistent insight storage (hermes-insights.json)

Next: Begin Phase 4 E2E testing with Codex agent for real CLI execution verification

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

## blockers & intentional restrictions

**Safety Features (Not Blockers):**
- Codex auto-run: INTENTIONALLY DISABLED — Codex is QA-focused agent, all changes require supervision
- Antigravity auto-run: INTENTIONALLY DISABLED — Antigravity is UI designer, not CLI agent
- Claude Code auto-run: INTENTIONALLY LIMITED — Only low-risk single tasks eligible for automatic execution

**External Integration Status:**
- Telegram approval bot: Not currently authoritative (approval persisted but not durable across sessions)
- Obsidian filesystem sync: Backlog (local JSON storage is default)
- Supabase durable storage: Backlog (not required for local automation loop)
- Discord Webhook: Backlog (not part of active approval direction)
- GitHub PR automation: Backlog (manual approval required for PR operations)
- Production deployment automation: Out of current scope (manual approval required)

## assumptions

- MVP uses Next.js App Router, TypeScript, Tailwind, and local JSON storage by default.
- `/api/runner` is the internal local runner endpoint, not an external paid model API.
- Supported local execution requires approval and context binding.
- High/critical risk work remains approval-gated.
- Roadmap status is the main product truth.
- Vibe Kanban can be used as a detailed execution workbench, but Agent Control Room owns orchestration and execution flow.
- Hermes can run safe checks, generate packets, capture insights, and recommend next tasks, but cannot edit code.
- Multi-agent orchestration routes work to appropriate agents with clear safety restrictions:
  - Claude Code: Best for architecture, complex reasoning, low-risk single tasks (auto-run eligible)
  - Codex: Best for QA, tests, bounded fixes (auto-run DISABLED by design)
  - Antigravity: Best for UI/UX work (auto-run DISABLED — not a CLI agent)
  - Hermes: Supervisor and analyst only (no code edits)

## next_task

Phase 4: E2E Testing with Codex Agent

1. Validate actual Claude Code CLI execution end-to-end
2. Verify approval enforcement with real execution scenarios
3. Test Hermes packet generation with actual execution results
4. Confirm roadmap status updates after real execution completion
5. Verify PM UX with non-developer user feedback

## key_constraints

- Do not let Hermes become a coding agent.
- Do not make Kanban the primary surface.
- Do not make Vibe Kanban the product brain.
- Do not bypass approval gates for high/critical risk.
- Do not activate Telegram, Supabase, GitHub PR, production deploy, Discord, Codex CLI, or Antigravity automation unless the specific integration has been verified and approved.

## last_updated

2026-05-23 — Phase 2 completion: Multi-agent orchestration (Claude Code, Codex QA-only, Antigravity manual-only), Hermes insights, auto-run restrictions, E2E smoke tests. Documentation updated to reflect Phase 2 implementation and Phase 3 in progress.
