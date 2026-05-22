# AGENT_STATE.md — Agent Control Room

## current_goal
Build Agent Control Room as an AI Development Control Tower for non-developer PMs — a system where a user inputs an idea or product direction, the system translates it into requirements and a visual roadmap, decomposes tasks, routes work to the right AI agent or workbench, compiles senior-dev prompts, tracks execution, analyzes results/diffs, marks completion, handles token/context handoffs, and saves durable development insights.

## active_phase
Phase 36 — Multi-Project Integration & Dashboard (All Core Features & Multi-Project Queue Complete)

## active_task
Phases 1-36 are implemented and verified. All 251 tests are passing:
- T027 `/plan` Visual Development Roadmap Control Panel ✅
- T027-Hermes Hermes Packet Draft UI (safe, static generation) ✅
- T028 Senior Dev Prompt Compiler Structure ✅
- T029 Agent Availability Manager & Foundation Modules ✅
- T030 Hermes CLI Installation Spike (Research Complete) ✅
- T031 Full MVP Integration / Hermes Memory Loop ✅
- T032 Hermes Background Worker Positioning ✅
- T036 Vibe Kanban result/workbench integration ✅
- T037 Hermes CLI integration roadmap ✅
- T038 deployment checklist update ✅
- Phases 12-16: Core Autonomous Orchestration Loop (4 scheduling modes, result classifications, retries) ✅
- Phases 17-18: CLI adapters and `/orchestration` panel React Context state ✅
- Phases 19-22: ConversationToJobPanel, logs API with NDJSON parsing, and Hermes insights ✅
- Phases 28-32: Real Codex CLI adapter, Destructive Pattern Detector, and token budgets ✅
- Phase 33: Exponential backoff retry policies & Error Recovery Manager ✅
- Phase 34: LLM Validation scoring and Auto-Decision gates ✅
- Phases 35-36: Multi-Project queue managers, Agent slot concurrency, and the `/dashboard` UI ✅

## current_agent
Claude Code

## recommended_next_agent
None (Staging/Production Ready)

## reason
All planned MVP phases are complete, and all 251 tests are passing. The system is ready for manual verification, deployment, and pilot testing.

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
Verify the deployment package, configure initial production environments, and perform staging pilot tests on active developer features.

## next_prompt_target
None (Production / Staging Ready)

## next_prompt
```txt
All 36 development phases of the Agent Control Room (AI Development Control Tower) have been successfully completed. 
The system has 251 passing tests covering prompt compilation, autonomous execution loops, retry policies, LLM validation, multi-project queue management, agent slot concurrency, and the real-time monitoring dashboard.
The product is ready for staging deployment and initial project trials.
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
2026-05-22 (Phase 36 Complete, 251 passing tests)
