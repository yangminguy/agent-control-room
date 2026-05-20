# AGENT_STATE.md — Agent Control Room

## current_goal
Build Agent Control Room as a Human-in-the-loop AI Development Orchestrator — a system where a PM inputs a product goal, the system translates it into a functional plan, delegates tasks to appropriate AI coding agents (Claude Code, Codex, Antigravity), tracks execution, analyzes git diffs, and orchestrates the next step until the feature is complete.

## active_phase
Phase 4 — Multi-Agent Routing

## active_task
Phases 1-4 (partial) now implemented. T016-T020 are complete. T020 (Multi-Agent Router Enhancement) handles "limited", "cooling_down", and "blocked" agent states with automatic fallback selection and handoff prompt generation. UI displays routing rationale and handoff requirements. Next focus is T021 (Token / Rate Limit Handoff).

## current_agent
Claude Code

## recommended_next_agent
Codex

## reason
T021 requires UI for manual agent status updates and handoff generation on status change. Codex is strong for bounded UI implementation and form handling.

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
T021 — Token / Rate Limit Handoff: Allow user to manually set agent status, generate handoff on status change, show next available agent recommendation.

## next_prompt_target
Codex

## next_prompt
```txt
Implement T021 (Token / Rate Limit Handoff) for Agent Control Room.

Read first:
- docs/ARCHITECTURE.md
- docs/AGENT_STATE.md
- docs/TASKS.md

Current state:
- Phase 4 (Multi-Agent Routing) is now working.
- T020 completed: Agent routing handles limited/cooling_down/blocked states, auto-selects fallback agents, generates handoff prompts.
- UI displays routing rationale, fallback recommendations, and handoff prompts.

Task:
- Build UI to allow user to manually set agent status (available/limited/cooling_down/blocked/manual_only).
- Integrate agent-status-store.ts for runtime status updates.
- Generate handoff prompt when user changes agent status.
- Show next available agent recommendation after status change.
- Wire handoff preview into the UI.

Acceptance criteria:
- User can update agent status via UI at `/agent-status` or similar.
- Status changes persist in data/agent-statuses.json.
- Handoff prompt generated on manual status change.
- UI shows recommended fallback agent and reason.
- `npm run typecheck` and `npm run lint` pass.
```

## last_updated
2026-05-20 (T020 completed)
