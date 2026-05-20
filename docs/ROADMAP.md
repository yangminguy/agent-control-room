# ROADMAP.md — Agent Control Room

## Product Vision
> Agent Control Room은 PM/비개발자가 구현하고 싶은 목표를 입력하면, 이를 기능 단위 계획으로 분해하고, Claude Code / Codex / Antigravity 같은 AI 개발 환경에 적절히 배정하며, 실행 결과를 분석해 기능 완성까지 이어주는 **Human-in-the-loop AI 개발 오케스트레이션 운영실**이다.

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

## Phase 3: Semi-Automated Execution 🚧 CURRENT

**Goal**: 사용자가 확인 후 버튼을 누르면 에이전트가 실행되고, 결과를 자동 분석해 계획을 갱신한다.

| Task | Status | Recommended Agent |
|---|---|---|
| T018 Agent Execution Runner | DONE | Claude Code |
| T019 Git Diff & Outcome Analyzer | TODO | Claude Code |

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

## Phase 4: Multi-Agent Routing

**Goal**: 여러 AI 에이전트를 목적에 따라 자동으로 선택하고, 한 에이전트가 막히면 다른 에이전트로 자동 전환한다.

| Task | Status | Recommended Agent |
|---|---|---|
| T020 Multi-Agent Router Enhancement | TODO | Claude Code |
| T021 Token / Rate Limit Handoff | TODO | Codex |

**Routing logic**:
```text
if task = architecture/reasoning → Claude Code
if task = implementation/tests → Codex
if task = UI/visual → Antigravity
if preferred agent = cooling_down → auto fallback + generate handoff
```

---

## Phase 5: Autonomous Loop

**Goal**: 사용자의 승인 한 번으로 기능 완성까지 AI가 반복 실행한다.

| Task | Status |
|---|---|
| T022 Autonomous Execution Loop | TODO |

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
1. T019 — Git Diff & Outcome Analyzer (Claude Code)
2. Wire RunnerLogView into /plan task cards (Codex or Antigravity)
3. T020 — Multi-Agent Router Enhancement (Claude Code)
4. T021 — Token / Rate Limit Handoff (Codex)
5. Real Vibe Kanban issue/workspace bridge (Codex)
6. T022 — Autonomous Execution Loop (Claude Code)
```
