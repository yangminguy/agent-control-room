# AGENT_STATE.md — Agent Control Room

## current_goal
Build Agent Control Room as a Human-in-the-loop AI Development Orchestrator — a system where a PM inputs a product goal, the system translates it into a functional plan, delegates tasks to appropriate AI coding agents (Claude Code, Codex, Antigravity), tracks execution, analyzes git diffs, and orchestrates the next step until the feature is complete.

## active_phase
Phase 4 — Multi-Agent Routing

## active_task
Phases 1-4 fully implemented. T016-T022 are complete. T022 (Autonomous Execution Loop) enables human-in-the-loop execution: complete → analyze → approve (Continue/Stop). Next focus is MVP refinements and Vibe Kanban integration.

## current_agent
Claude Code

## recommended_next_agent
Codex or Design Team

## reason
Next phase is refinement and integration. Codex can improve UX (auto-refresh Kanban, better progress display). Design team should review user flow for MVP polish before broader use.

## agent_statuses
| Agent | Status | Reason |
|---|---|---|
| claude-code | available | Best for architecture, diff analysis, and complex reasoning |
| codex | available | Best for bounded implementation and type-safe code |
| antigravity | available | Best for visual/product UI iteration |

## blockers
- `npm install` reported 5 audit vulnerabilities; not blocking MVP usage but should be reviewed before broader use.
- Vibe Kanban upstream README says the project is sunsetting; treat it as local-first base/reference.
- Vibe Kanban local server is currently unreachable; the bridge is using `MockVibeKanbanClient`.

## assumptions
- MVP uses Next.js App Router + TypeScript + Tailwind.
- MVP storage uses local JSON files in `data/`.
- OpenAI Responses API with structured JSON output powers technical translation, task decomposition, prompt generation, and Advisor Mode.
- Missing `OPENAI_API_KEY` or API failure falls back to deterministic local orchestration.
- The execution runner (T018) uses `child_process.spawn` with SSE log streaming.
- `RunnerLogView` is wired into `/plan` task cards for Claude Code and Codex tasks.
- A new git branch is always created before any agent execution.
- Agent token status is manually set by the user in MVP.
- Vibe Kanban (or equivalent open-source) handles kanban visualization only — it is not the execution engine.
- Agent Control Room is the independent orchestration layer on top of any kanban base.

## next_task
MVP Refinement: Improve Loop UX (auto-refresh, better feedback), integrate Vibe Kanban issue creation, add error recovery flows.

## next_prompt_target
Codex or Design

## next_prompt
```txt
MVP Refinement & Integration

Current state:
- T022 (Autonomous Loop) is complete
- Core execution flow: Task → Run → Analyze → Continue/Stop → Next Task
- All major features implemented: routing, execution, analysis, approval loop

Next priorities:
1. UX Refinement: Auto-refresh Kanban board after Continue, better progress indicators
2. Error Recovery: Handle analyzer failures, network errors, gracefully
3. Vibe Kanban Bridge: Real issue creation (currently MockClient)
4. Security/Performance: Audit git operations, optimize analyzer queries

Acceptance criteria:
- User sees immediate feedback after Continue button
- No hanging states or silent failures
- Clean error messages for failures
- Kanban board reflects task state changes without page refresh
```

## last_updated
2026-05-20 (T022 completed — MVP feature-complete)
