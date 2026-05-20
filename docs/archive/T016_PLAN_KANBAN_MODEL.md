# T016_PLAN_KANBAN_MODEL.md — Plan & Kanban Data Model Design

## Task: T016 — Plan & Kanban Data Model
Recommended agent: Claude Code  
Priority: P1 (Phase 2 prerequisite)

---

## Why This Task Comes Before the Runner

Before building the Agent Execution Runner (T018), we need a clear, typed model for:
1. **What is being executed** (a `PlanTask` inside a `FeaturePlan`)
2. **What agent is doing it** (`assignedAgent`)
3. **What state it's in** (`PlanTaskStatus`)
4. **How to visualize it** (a `KanbanCard` on a Kanban board)
5. **How sub-tasks are tracked** (`SubAgentTrack[]`)

Without this model, the runner has no context to update, and the plan view has nothing to render.

---

## State Model

```text
Planned → Ready → Running → Done
                          ↘ Partial → Running (retry)
                          ↘ Blocked → (Advisor Mode triggered)
                                    ↘ Needs Review → Done or Blocked
```

| Status | Trigger |
|---|---|
| `planned` | Task created from Feature Plan Generator |
| `ready` | Prompt generated and approved by user |
| `running` | Agent execution started |
| `done` | Diff analysis confirmed all acceptance criteria met |
| `partial` | Diff analysis shows some but not all criteria met |
| `blocked` | Execution failed or acceptance criteria not met after retry |
| `needs_review` | Diff analysis complete but human judgment required |

---

## Kanban Board Layout

```text
┌─────────┬──────────┬──────────┬──────────┬──────┬─────────┐
│ Backlog │  Ready   │ Running  │  Review  │ Done │ Blocked │
├─────────┼──────────┼──────────┼──────────┼──────┼─────────┤
│ T017    │ T016     │          │          │ T015 │         │
│ T018    │          │          │          │ T014 │         │
│ T019    │          │          │          │ T013 │         │
└─────────┴──────────┴──────────┴──────────┴──────┴─────────┘
```

---

## Kanban Card Structure

```text
┌──────────────────────────────────────────────────────┐
│ T016 Plan & Kanban Data Model              [Ready]   │
├──────────────────────────────────────────────────────┤
│ Goal:                                                │
│ Define the typed data model for FeaturePlan,         │
│ PlanTask, KanbanCard, and SubAgentTrack.             │
├──────────────────────────────────────────────────────┤
│ Agent: Claude Code                                   │
│ Branch: acr/t016-plan-model-20260520                 │
├──────────────────────────────────────────────────────┤
│ Sub-Agent Tracks:                                    │
│ ✅ Architecture Reviewer          Done               │
│ 🔄 Type Implementer               Running            │
│ ⏳ Data Seeder                    Waiting            │
├──────────────────────────────────────────────────────┤
│ Last Result: types drafted, seed data pending        │
├──────────────────────────────────────────────────────┤
│ [View Prompt]  [View Logs]  [View Diff]              │
└──────────────────────────────────────────────────────┘
```

---

## Sub-Agent Track Design

A sub-agent track represents a logical role within a single task execution. In MVP, these are not real parallel processes — they are logical sections of work that can be identified from the session report or diff.

Predefined role types:
```text
- Architecture Reviewer
- Backend Implementer
- Frontend Implementer
- Type Definer
- Test Writer
- Git Safety Reviewer
- QA Reviewer
- Data Seeder
```

---

## Branch Naming Convention

```text
acr/{task-id}-{short-title}-{YYYYMMDD}-{HHMM}

Examples:
acr/t016-plan-model-20260520-1730
acr/t017-plan-view-20260520-1800
acr/fix-advisor-error-20260520-1820
```

---

## HTML Plan View Connection

The HTML Plan View (`app/plan/page.tsx`) will:
1. Read all `FeaturePlan[]` from `data/feature-plans.json`.
2. Render each plan as a collapsible section.
3. Render each `PlanTask` with its status badge, assigned agent, and sub-agent tracks.
4. Provide a "Generate Prompt" button per task (moves from `planned` to `ready`).
5. Provide an "Execute" button per task (moves from `ready` to `running`, only after T018 is built).

---

## Implementation Checklist for T016

```text
[x] Add PlanTaskStatus type to lib/types.ts
[x] Add SubAgentTrack type to lib/types.ts
[x] Add PlanTask type to lib/types.ts
[x] Add FeaturePlan type to lib/types.ts
[x] Add KanbanCard type to lib/types.ts
[x] Add DiffSummary type to lib/types.ts
[x] Add ExecutionLog type to lib/types.ts
[x] Create data/feature-plans.json with one seeded plan (3+ tasks)
[x] Create lib/storage/feature-plan-store.ts (read/write helpers)
[x] npm run typecheck + lint pass
```

---

## Acceptance Criteria

- All new types are exported from `lib/types.ts` with no `any`.
- `data/feature-plans.json` exists with one plan that has at least 3 tasks.
- The data model correctly represents the state machine (Planned → Ready → Running → Done/Partial/Blocked).
- `npm run typecheck` and `npm run lint` pass.
