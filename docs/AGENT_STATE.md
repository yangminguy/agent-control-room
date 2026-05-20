# AGENT_STATE.md — Agent Control Room

## current_goal
Build Agent Control Room as a Human-in-the-loop AI Development Orchestrator — a system where a PM inputs a product goal, the system translates it into a functional plan, delegates tasks to appropriate AI coding agents (Claude Code, Codex, Antigravity), tracks execution, analyzes git diffs, and orchestrates the next step until the feature is complete.

## active_phase
Phase 4 — Multi-Agent Routing

## active_task
Phases 1-4 (partial) now implemented. T016-T021 are complete. T021 (Token / Rate Limit Handoff) lets the user manually update agent statuses, persists status changes, recommends the next available agent, and generates copy-ready handoffs when a status change requires transfer. Next focus is T022 (Autonomous Execution Loop).

## current_agent
Codex

## recommended_next_agent
Claude Code

## reason
T022 requires loop design across execution results, next prompts, and user approval. Claude Code is better suited for architecture-heavy workflow design before implementation.

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
T022 — Autonomous Execution Loop: After each cycle, generate the next prompt and ask the user whether to continue.

## next_prompt_target
Claude Code

## next_prompt
```txt
Implement T022 (Autonomous Execution Loop) for Agent Control Room.

Read first:
- docs/ARCHITECTURE.md
- docs/AGENT_STATE.md
- docs/TASKS.md

Current state:
- T021 is complete.
- `/agent-status` supports manual agent status updates.
- Status changes persist in `data/agent-statuses.json`.
- Transfer states generate saved handoff prompts and show next-agent recommendations.

Task:
- Design the smallest human-in-the-loop autonomous cycle.
- After a completed/partial/blocked execution result, generate a next prompt.
- Ask the user whether to continue before any next execution.
- Keep MVP guardrails: no auto-merge, no hidden execution, no Slack/GitHub automation.

Acceptance criteria:
- User can review the recommended next prompt after a cycle.
- User can explicitly choose continue or stop.
- Continue action preserves plan/task context.
- No agent execution starts without user approval.
- `npm run typecheck` and `npm run lint` pass.
```

## last_updated
2026-05-20 (T021 completed)
