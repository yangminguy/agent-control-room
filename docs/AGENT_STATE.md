# AGENT_STATE.md — Agent Control Room

## current_goal
Build Agent Control Room as an AI Development Control Tower for non-developer PMs — a system where a user inputs an idea or product direction, the system translates it into requirements and a visual roadmap, decomposes tasks, routes work to the right AI agent or workbench, compiles senior-dev prompts, tracks execution, analyzes results/diffs, marks completion, handles token/context handoffs, and saves durable development insights.

## active_phase
Phase 11 — Production Hardening & Real Integration (T036-T038 Complete, QA hardening in progress)

## active_task
Phases 1-11 are implemented. Phase 11 complete:
- T027 `/plan` Visual Development Roadmap Control Panel ✅
- T027-Hermes Hermes Packet Draft UI (safe, static generation) ✅
- T028 Senior Dev Prompt Compiler Structure ✅
- T029 Agent Availability Manager & Foundation Modules ✅
- T030 Hermes CLI Installation Spike (Research Complete) ✅
- T031 Full MVP Integration / Hermes Memory Loop ✅
- T032 Hermes Background Worker Positioning ✅ (background-only; no code execution)
- T036 Vibe Kanban result/workbench integration ✅
- T037 Hermes CLI integration roadmap ✅ (documentation only)
- T038 deployment checklist update ✅
- Current: fix QA hardening findings and run final verification

## current_agent
Claude Code

## recommended_next_agent
Antigravity, Claude Code, or Codex

## reason
Antigravity is a fit for the roadmap-first `/plan` UI, Claude Code is a fit for prompt/context architecture, and Codex is a fit for bounded data/model updates. Vibe Kanban bridge work should follow after the control-tower UX is clearer.

## agent_statuses
| Agent | Status | Reason |
|---|---|---|
| claude-code | available | Best for architecture, diff analysis, and complex reasoning |
| codex | available | Best for bounded implementation and type-safe code |
| antigravity | available | Best for visual/product UI iteration |
| hermes | experimental | Optional background/status/memory worker, not primary coding brain |

## blockers
- Vibe Kanban upstream README says the project is sunsetting; treat it as local-first base/reference.
- Vibe Kanban may be offline during normal Agent Control Room use; keep `MockVibeKanbanClient` as development fallback.
- Stable Vibe Kanban workspace/session APIs may still vary by local Vibe Kanban version; mock fallback remains required.
- Production deployment remains gated and has not been performed.

## assumptions
- MVP uses Next.js App Router + TypeScript + Tailwind.
- MVP storage uses local JSON files in `data/`.
- OpenAI Responses API with structured JSON output powers technical translation, task decomposition, prompt generation, and Advisor Mode.
- Missing `OPENAI_API_KEY` or API failure falls back to deterministic local orchestration.
- The execution runner (T018) uses `child_process.spawn` with SSE log streaming.
- `RunnerLogView` is wired into `/plan` task cards for Claude Code and Codex tasks.
- A new git branch is always created before any agent execution.
- Agent token status is manually set by the user in MVP.
- Vibe Kanban handles detailed kanban/workspace/session/diff surfaces where possible.
- Agent Control Room is the independent orchestration brain above any execution workbench.
- `/plan` should become a Visual Development Roadmap Control Panel, not a full Vibe Kanban replacement.
- Hermes is optional for background summaries/memory/monitoring only.

## next_task
Finish QA hardening verification: runner file-boundary checks, complete Context Pack fields, result classifier edge cases, preferred agent handling, Phase 11 docs, and final typecheck/lint/build/test.

## next_prompt_target
Codex for bounded QA fixes and verification

## next_prompt
```txt
Roadmap-First Control Tower UX

Current state:
- Agent Control Room is now defined as an AI Development Control Tower for non-developer PMs.
- /plan should be a Visual Development Roadmap Control Panel, not only a kanban board.
- Prompt and handoff generation remain submodules.
- Vibe Kanban remains the execution workbench and should not be cloned.

Next priorities:
1. Reframe /plan around roadmap stages, completion checks, current task, next action, responsible agent, blockers, and acceptance criteria.
2. Standardize generated prompts with Senior Dev Prompt Compiler sections.
3. Add Context Pack workflow for token/context reset.
4. Prepare Obsidian-compatible Markdown export for insights and handoffs.
5. Keep risky execution human-approved.

Acceptance criteria:
- A non-developer can understand total product progress at a glance.
- Completed roadmap stages show check marks.
- Active stages show responsible agent, current task, and next action.
- Blocked stages show the exact user decision needed.
- Generated prompts include goal, context, scope, non-goals, files, acceptance criteria, checks, and handoff instructions.
```

## agent_execution_policy
Agent Control Room does NOT run all agents simultaneously by default.

See [[AGENT_SCHEDULING_POLICY.md]] for execution modes:
- **Single Agent Mode**: High-risk or tightly-coupled tasks (runner, auth, DB, package changes)
- **Sequential Multi-Agent Mode**: Implementation then QA/verification in order
- **Parallel Safe Mode**: Completely separate files (e.g., Claude Code API + Antigravity UI)
- **Token Relay Mode**: Current agent hits token limit; handoff to another agent

See [[CONTEXT_TOKEN_RESUME_PROTOCOL.md]] for token/context exhaustion flow.

See [[AGENT_RUN_POLICY.md]] for how agents are executed (CLI, Workbench, Manual).

## key_constraints
- Hermes is never a primary coding agent; only monitoring, summaries, context packs, and memory
- Two agents cannot edit the same files in parallel
- High-risk work (runner, auth, DB, package) remains single-agent and approval-gated
- No automatic token detection; status is manually set
- No autonomous execution without explicit user approval

## last_updated
2026-05-21 (added agent scheduling + token relay policies)
