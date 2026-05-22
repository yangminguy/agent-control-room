# ROADMAP.md — Agent Control Room

## Product Vision
> Agent Control Room은 비개발자 PM이 아이디어나 제품 방향만 입력하면, 이를 개발 가능한 로드맵으로 바꾸고, 작업을 쪼개고, 적절한 AI 에이전트와 실행 워크벤치에 배정하며, 완료 체크와 핸드오프, 개발 인사이트 저장까지 이어주는 **AI Development Control Tower**이다.

## Strategic Direction

Agent Control Room is the brain. Vibe Kanban is the execution workbench.

- Agent Control Room should decide what to do, why it matters, which agent should do it, what prompt/context to use, and how to judge completion.
- `/plan` should be a Visual Development Roadmap Control Panel for non-developer users, not only a kanban board.
- Senior Dev Prompt Compiler should turn weak user direction into precise implementation prompts.
- Context Reset Protocol, token handoff, and Obsidian-compatible memory are part of the control tower direction.
- Hermes is optional as a background/status/memory worker, not a primary coding brain.
- **Agent scheduling is strategic**: Multiple agents are used for task specialization + token distribution, not default parallelization.
  - See `docs/AGENT_SCHEDULING_POLICY.md` for execution modes (Single / Sequential / Parallel Safe / Token Relay).
  - See `docs/AGENT_RUN_POLICY.md` for how agents are executed (CLI / Workbench / Manual).
  - See `docs/CONTEXT_TOKEN_RESUME_PROTOCOL.md` for token limit handoff flow.
- Vibe Kanban should provide or inspire the richer board/workspace/session/diff/preview surfaces.
- Future work should deepen the bridge to Vibe Kanban before expanding duplicate internal kanban/session UI.

---

## Local Execution Architecture Phases (Phase L1-L6)

Agent Control Room is a **local AI development control tower**. It does NOT call external paid AI APIs by default.

Instead, it bridges to already-authenticated local tools:
- Claude Code CLI (terminal)
- Codex (local app)
- Antigravity IDE
- Hermes (optional background worker)
- Vibe Kanban (execution workbench)

See `docs/LOCAL_RUNNER_ARCHITECTURE.md` for full architecture.

### Phase L1: Local Execution Architecture Alignment ✅ DONE (2026-05-21)
- Clarify mental model: local execution, not external paid APIs
- Define Local Runner Bridge concept
- Define Agent Adapter Types (Claude Code, Codex, Antigravity, Hermes)
- Update `/api/runner` meaning as internal local runner endpoint
- Update workbench safety copy
- Document safety boundaries

**Outcome**: Agent Control Room architecture is clearly positioned as local terminal/IDE automation.

### Phase L2: Codex Local Adapter Investigation (NEXT)
- Verify if Codex has a stable CLI executable
- If yes: implement Codex spawn adapter like Claude Code
- If no: document manual handoff mode with copy-ready prompt

### Phase L3: Antigravity IDE Adapter Investigation
- Research Antigravity IDE plugin/automation API
- Design safe IDE automation boundaries
- Prototype IDE workspace open links (if safe)
- Prototype IDE result export capture (if safe)

### Phase L4: Obsidian Memory Export
- Implement Obsidian-compatible note generation
- Preserve decisions, patterns, handoffs, prompt patterns
- Export as local markdown files

### Phase L5: Context Pack Workflow
- Auto-generate reset/handoff packets for token/context limits
- Preserve session state for new agent/session
- Migrate in-memory token store to persistent backend (Redis/Postgres)

### Phase L6: Safe Automation Expansion
- Vibe Kanban result import (one-way → bidirectional)
- Hermes background worker positioning and integration
- Production monitoring and hardening

---

## Phase 1: Manual Orchestration ✅ DONE

**Goal**: 수동 복사 중심의 오케스트레이션 구현.

| Task | Status |
|---|---|
| T001 Project initialization | DONE |
| T002 Domain types | DONE |
| T003 Seed storage layer | DONE |
| T004 Dashboard | DONE |
| T005 Project list & registration | DONE |
| T006 Project detail page | DONE |
| T007 Technical Translator | DONE |
| T008 Task Decomposer | DONE |
| T009 Agent Router | DONE |
| T010 Prompt Generator | DONE |
| T011 Handoff Generator | DONE |
| T012 Session Report Form | DONE |
| T013 AGENT_STATE.md parser | DONE |
| T014 TASKS.md parser | DONE |
| T015 Advisor Mode | DONE |

**What we have**: A user can enter a product direction, receive a technical translation, get decomposed tasks, see an agent recommendation, and copy a ready-to-use prompt. If they're blocked, Advisor Mode provides analysis and a next prompt. Session reports and handoffs are stored locally.

---

## Phase 2: Structured Planning ✅ DONE

**Goal**: CLI 실행 이전에 "무엇을 실행하는가"를 명확하게 구조화. 계획판과 Kanban이 먼저 잡혀야 실행의 의미가 생긴다.

| Task | Status | Recommended Agent |
|---|---|---|
| T016 Plan & Kanban Data Model | DONE | Claude Code |
| T017 HTML Implementation Plan View | DONE | Antigravity |

**What we have**:
- A `FeaturePlan` model that breaks a user goal into traceable `PlanTask` items.
- A Kanban card model for visualizing agent state.
- A live HTML Plan View that shows what's been built and what's left.

---

## Phase 3: Semi-Automated Execution ✅ DONE

**Goal**: 사용자가 확인 후 버튼을 누르면 에이전트가 실행되고, 결과를 자동 분석해 계획을 갱신한다.

| Task | Status | Recommended Agent |
|---|---|---|
| T018 Agent Execution Runner | DONE | Claude Code |
| T019 Git Diff & Outcome Analyzer | DONE | Claude Code |

**Execution flow**:
```text
User approves prompt
→ System creates new git branch (e.g. acr/t016-plan-model-20260520)
→ Agent is invoked via CLI (claude -p "..." or codex run ...)
→ Logs stream to the UI in real time
→ On completion, git diff is captured
→ LLM analyzes diff against the plan
→ Tasks marked done/partial/blocked
→ Session report auto-generated
→ Next prompt suggested
```

---

## Phase 4: Multi-Agent Routing ✅ DONE

**Goal**: 여러 AI 에이전트를 목적에 따라 자동으로 선택하고, 한 에이전트가 막히면 다른 에이전트로 자동 전환한다.

| Task | Status | Recommended Agent |
|---|---|---|
| T020 Multi-Agent Router Enhancement | DONE | Claude Code |
| T021 Token / Rate Limit Handoff | DONE | Codex |

**Routing logic**:
```text
if task = architecture/reasoning → Claude Code
if task = implementation/tests → Codex
if task = UI/visual → Antigravity
if preferred agent = cooling_down → auto fallback + generate handoff
```

---

## Phase 5: Human-Approved Loop ✅ DONE

**Goal**: 실행 결과를 분석한 뒤 사용자가 Continue/Stop을 선택해 다음 작업으로 이어간다.

| Task | Status |
|---|---|
| T022 Autonomous Execution Loop | DONE |

**Loop**:
```text
Goal input
→ Plan generated
→ Task executed
→ Diff analyzed
→ Plan updated
→ "Continue?" prompt to user
→ User approves → next cycle
→ Repeat until feature complete
```

---

## Current Priority Queue

```text
1. Production Hardening — Deployment, Supabase sync verification, environment variables setup
2. Real-world Integration — Real Discord/Telegram webhook approvals hookup
3. Operational Pilot — Deploying to staging/prod and running test cycles
```

---

## Phase 9: Roadmap-First Control Tower UX ✅ DONE

**Goal**: Reframe the product from prompt/handoff-first to roadmap-first AI Development Control Tower while keeping all existing implemented features.

| Task | Status | Recommended Agent | Notes |
|---|---|---|---|
| T027 `/plan` Visual Development Roadmap Control Panel | ✅ DONE | Claude Code (data) + Antigravity (UI) | Roadmap data model, UI integration, agent status panel connected |
| T028 Senior Dev Prompt Compiler structure | ✅ DONE | Claude Code | Standardize prompt sections: goal, context, scope, files, acceptance criteria, handoff |
| T029 Agent Availability Manager status model cleanup | ✅ DONE | Codex | Agent status data layer created; availability model documented |
| T030 Context Reset Protocol and Context Pack generator | ✅ DONE | Claude Code | Foundation laid; context and handoff pack generator implemented |
| T031 Obsidian Knowledge Memory export | ✅ DONE | Codex | Concept in roadmap-data-model.md; implemented in UI/memory route |
| T032 Hermes background worker positioning docs/data model | ✅ DONE | Codex | Spike: verifying Hermes installation and integration options; background positioning confirmed |

---

## Phase 10: Vibe Kanban Workbench Bridge ✅ DONE

**Goal**: Stop treating Vibe Kanban as a simple issue export target. Use it as the execution workbench while keeping Agent Control Room as the orchestration brain.

| Task | Status | Recommended Agent | Notes |
|---|---|---|---|
| T033 Vibe Kanban workspace/card open link | ✅ DONE | Codex | Workspace URL added to issue creation, allowing quick links |
| T034 Vibe Kanban workspace/session launch research + adapter | ✅ DONE | Claude Code | Real adapter for Vibe Kanban and mock fallback created |
| T035 Vibe Kanban result import into session report / diff summary | ✅ DONE | Codex | Vibe Kanban issues results imports normalized via `/api/vibe-kanban/import` |

---

## Phase 11: Production Hardening & Real Integration ✅ DONE

**Goal**: Prepare the application for deployment with robust security and real HTTP capabilities.

- **Vibe Kanban HTTP Integration**: Connect with Vibe Kanban APIs using credentials, adding workspace and project dropdowns.
- **Hermes CLI Feasibility Spike**: Investigate CLI integration and map out safety constraints.
- **Deployment Hardening**: Update env variable checklists, smoke test lists, and guides for Node.js, Vercel, and Docker.

---

## Phase 12-16: Core Autonomous Orchestration Loop ✅ DONE

**Goal**: Automate task scheduling, result classification, and feedback loops with approval gates.

- **Task Scheduling System**: Multi-mode scheduling (`single`, `sequential`, `parallel`, `token_relay`) evaluating file conflicts and task risk levels.
- **Result Classification**: Heuristic classifier mapping agent output to `Pass`, `MinorFix`, `QA`, `Blocked`, and `SafetyViolation`.
- **Failed Task Retry Queue**: Tracking retry limits (max 3) to prevent infinite loops.
- **Hermes Observer Monitor**: Execution metrics summaries and 7 Obsidian-compatible markdown note builders.
- **Discord Mock Gate**: High-risk tasks pause for a 5-minute approval timeout, prompting a mock Discord channel.

---

## Phase 17-18: Orchestration Adapters & Control Panel UI ✅ DONE

**Goal**: Create agent-specific CLI adapters and the base Control Panel UI.

- **CLI Adapters**: Created adapters for `claude-code`, `codex`, and `antigravity` to handle mock/CLI operations.
- **`/orchestration` Control Panel**: A tabbed view containing Queue, Results, Approvals, Progress, and Feedback metrics.
- **React Context State**: Centralized state management in `orchestration-context.tsx` with mock seeds.

---

## Phase 19-22: Orchestration UX Completion & Logs ✅ DONE

**Goal**: Finalize orchestration components, logger endpoints, and Hermes cycle analysis views.

- **Conversation Job Panel**: UI panel to convert natural language descriptions to queues of dispatch jobs.
- **Logs API & Viewer**: Real NDJSON-based logging service (`/api/orchestration/logs`) and event table filter component.
- **Hermes Insight View**: Section displaying metrics, performance stats, routing suggestions, and one-click Obsidian export packages.

---

## Phase 28-32: Real CLI Integration & Production Safety ✅ DONE

**Goal**: Implement real CLI subprocess spawning and safety validation gates.

- **Codex CLI & Antigravity Copy**: Subprocess spawn runner for Codex and copy-paste drawer panels for Antigravity.
- **Destructive Pattern Detector**: Regex checks preventing dangerous commands (e.g. `rm -rf`, `npm deprecate`) and do-not-touch file edits.
- **Context Budget Manager**: Heuristic token budget controller tracking remaining context length and prompting token-relay handoffs.

---

## Phase 33: Production Hardening & Error Recovery ✅ DONE

**Goal**: Implement error classification and resilient retry scheduling.

- **Exponential Backoff**: Delay formula (capped at 30s) automatically retrying network and rate-limit faults.
- **Error Recovery Manager**: Stores recovery logs per job and coordinates retry scheduling.

---

## Phase 34: Hermes LLM Validation & Auto-Decision Layer ✅ DONE

**Goal**: Integrate LLM validation scoring and confidence-based auto-decisions.

- **LLM Validator**: Analyzes agent results to assign a completion confidence ratio (0-100%).
- **Auto-Decision Engine**: Auto-approves jobs with confidence $\ge 75\%$, auto-rejects failed tasks, and flags borderline tasks for manual user review.
- **Validation Store**: Persistent records of validation requests, results, and auto-decisions.

---

## Phase 35-36: Multi-Project Integration & Dashboard ✅ DONE

**Goal**: Enable multi-project context management and a unified activity monitoring dashboard.

- **Multi-Project Orchestrator**: Manages parallel workspace sessions (up to 2 active concurrently) with isolated execution queues.
- **Agent Slot Allocator**: Allocates and releases agent resources to projects safely to avoid file edit overlaps.
- **Dashboard API & UI**: Live dashboard at `/dashboard` displaying system-wide KPI metrics, agent statuses, recent activity feeds, and project filters.
