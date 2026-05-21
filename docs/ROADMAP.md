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
1. Roadmap-First Control Tower UX — make /plan a visual roadmap control panel
2. Senior Dev Prompt Compiler — standardize prompt sections and file/edit boundaries
3. Agent Availability + Context Reset — token/context handoff and Context Pack workflow
4. Obsidian Knowledge Memory — Markdown exports for insights, decisions, handoffs, prompt patterns
5. Vibe Kanban Workbench Bridge — workspace/session launch, open links, result import
6. Production hardening — deployment checks, env validation, bridge failure states
```

## Phase 9: Roadmap-First Control Tower UX 🚀 IN_PROGRESS

**Goal**: Reframe the product from prompt/handoff-first to roadmap-first AI Development Control Tower while keeping all existing implemented features.

| Task | Status | Recommended Agent | Notes |
|---|---|---|---|
| T027 `/plan` Visual Development Roadmap Control Panel | ✅ DONE | Claude Code (data) + Antigravity (UI) | Roadmap data model, UI integration, agent status panel connected |
| T028 Senior Dev Prompt Compiler structure | 🔜 NEXT | Claude Code | Standardize prompt sections: goal, context, scope, files, acceptance criteria, handoff |
| T029 Agent Availability Manager status model cleanup | READY | Codex | Agent status data layer created; availability model documented |
| T030 Context Reset Protocol and Context Pack generator | READY | Claude Code | Foundation laid; awaiting implementation after T028 |
| T031 Obsidian Knowledge Memory export | READY | Codex | Concept in roadmap-data-model.md; ready for UI implementation |
| T032 Hermes background worker positioning docs/data model | IN_PROGRESS | Codex | Spike: verifying Hermes installation and integration options |

**T027 Completion Summary**:

**Data Foundation** (Complete):
- Roadmap type system: `RoadmapStatus` (completed/active/waiting/blocked/user_input_required/failed/handoff_needed)
- Roadmap stages with: goal, status, agent, current task, next action, blockers, user decisions, acceptance criteria
- Storage layer: JSON-based with Supabase pattern
- Helper functions: progress calculation, active stage detection, blocker detection, next action routing

**UI Integration** (Complete):
- `/plan` page refactored as Control Tower (roadmap-first, not kanban-first)
- Layout: Header → Roadmap Overview → Agent Status → Task Detail (Kanban)
- Roadmap Timeline component with status badges and agent displays
- Agent Status Panel integrated with live agent status
- Existing Kanban board preserved as secondary detail view

**Completed Deliverables**:
1. ✅ Roadmap data model (lib/types.ts, lib/roadmap.ts)
2. ✅ Sample 10-phase roadmap (data/roadmap.json)
3. ✅ Storage and API layers (lib/storage/roadmap-store.ts, app/api/roadmap/route.ts)
4. ✅ UI components (components/roadmap/*)
5. ✅ Data ↔ UI adapter (lib/roadmap-ui-adapter.ts)
6. ✅ Agent Status integration (lib/agents/agent-status.ts)
7. ✅ Documentation (docs/ROADMAP_DATA_MODEL.md)
8. ✅ Self-review and status corrections

**Agent Status Updated**:
- 🧠 Claude Code: available (T028 ready)
- ⚙️ Codex: working (Hermes spike in progress)
- 🎨 Antigravity: working (Visual QA on /plan)
- 🔄 Hermes: background_worker (pending installation completion)
- 📋 Vibe Kanban: idle (bridge implementation Phase 10)
- ✅ Manual/User: approval_required (Phase 9 completion review)

**Success criteria met**:
- ✅ `/plan` shows roadmap stages with all statuses (completed, active, waiting, blocked, user_input_required, failed, handoff_needed)
- ✅ Completed stages show check marks
- ✅ Active stages show responsible agent, current task, next action
- ✅ Blocked stages show blocker reason and required action
- ✅ User-input-required stages show exact user question
- ✅ Acceptance criteria visible
- ✅ Non-PM-friendly Control Tower layout (not Kanban-first)
- ✅ Human approval remains central
- ✅ Existing Kanban functionality preserved
- ✅ typecheck, lint, build all pass

## Phase 10: Vibe Kanban Workbench Bridge

**Goal**: Stop treating Vibe Kanban as a simple issue export target. Use it as the execution workbench while keeping Agent Control Room as the orchestration brain.

| Task | Status | Recommended Agent |
|---|---|---|
| T033 Vibe Kanban workspace/card open link | TODO | Codex |
| T034 Vibe Kanban workspace/session launch research + adapter | TODO | Claude Code |
| T035 Vibe Kanban result import into session report / diff summary | TODO | Codex |

**Success criteria**:
- A prepared Agent Control Room task can be sent to Vibe Kanban and opened from Agent Control Room.
- The Vibe Kanban issue/workspace preserves prompt, context, acceptance criteria, and recommended executor.
- A Vibe Kanban outcome can be imported back into Agent Control Room.
- Agent Control Room uses the imported outcome to update task state and generate the next prompt.
