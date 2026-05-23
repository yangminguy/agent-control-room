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
Phase 3 (Documentation & Integration Verification) — In Progress

## active_task

Phase 3: Update documentation to reflect Phase 2 multi-agent orchestration completion and prepare for final E2E verification:
- Roadmap remains the main UI.
- Kanban remains detailed task inspection.
- Approval gates block high/critical risk work.
- Local runner returns logs, diffs, and checks.
- Hermes packet builder, decision classifier, and insight recorder fully implemented.
- Result normalizer extracts status from ExecutionLog; packets are auto-generated on execution completion.
- Multi-agent orchestration complete: Claude Code, Codex (QA-only, auto-run disabled), Antigravity (manual-only, auto-run disabled).
- Automated E2E smoke test runner validates main flow.
- Phase 3 will finalize documentation and verify all surfaces work together.

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

Phase 3: Final documentation update and E2E verification:

1. ✅ Update TASKS.md to reflect Phase 2 multi-agent orchestration completion
2. ✅ Update AGENT_STATE.md to clarify auto-run restrictions as intentional safety
3. ⏳ Update HANDOFF.md with Phase 2 context
4. ⏳ Update ARCHITECTURE.md to mark Hermes packet wiring as complete
5. ⏳ Run E2E smoke tests to verify main flow end-to-end:
   - planning input creates/updates roadmap tasks
   - task shows agent, risk, and scheduling recommendation
   - approval gate blocks risky execution
   - local runner streams logs for supported execution
   - diff/check results are captured
   - Hermes packet is generated and displayed
   - roadmap and kanban status update
   - recommendations propagate to next task

## key_constraints

- Do not let Hermes become a coding agent.
- Do not make Kanban the primary surface.
- Do not make Vibe Kanban the product brain.
- Do not bypass approval gates for high/critical risk.
- Do not activate Telegram, Supabase, GitHub PR, production deploy, Discord, Codex CLI, or Antigravity automation unless the specific integration has been verified and approved.

## last_updated

2026-05-23 — Phase 2 completion: Multi-agent orchestration (Claude Code, Codex QA-only, Antigravity manual-only), Hermes insights, auto-run restrictions, E2E smoke tests. Documentation updated to reflect Phase 2 implementation and Phase 3 in progress.
