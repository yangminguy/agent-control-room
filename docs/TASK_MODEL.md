# TASK_MODEL.md — Agent Control Room Data Models

This document defines the complete data model for Agent Control Room's orchestration system. All TypeScript types are defined here first before being added to `lib/types.ts`.

---

## 1. Core Hierarchy

```text
FeaturePlan
  └─ PlanTask[]
       ├─ assignedAgent: AgentType
       ├─ status: PlanTaskStatus
       └─ SubAgentTrack[]

KanbanCard (= a visual representation of one PlanTask)
  ├─ task details
  ├─ sub-agent tracks
  └─ last session result

SessionReport (= result after agent execution)
  ├─ completed PlanTasks
  ├─ diff summary
  └─ next recommended prompt
```

---

## 2. PlanTaskStatus

```typescript
export type PlanTaskStatus =
  | "planned"         // 계획됨, 아직 실행 안 함
  | "ready"           // 프롬프트 생성 완료, 실행 가능
  | "running"         // 에이전트 실행 중
  | "done"            // 완료
  | "partial"         // 일부 완료 (diff 분석 기반)
  | "blocked"         // 에러/불확실성 발생
  | "needs_review";   // 사용자 확인 필요
```

---

## 3. SubAgentTrack

```typescript
export type SubAgentTrack = {
  id: string;
  role: string;              // e.g. "Architecture Reviewer", "Backend Implementer"
  status: PlanTaskStatus;
  summary?: string;          // what this track accomplished
};
```

---

## 4. PlanTask

```typescript
export type PlanTask = {
  id: string;
  planId: string;
  title: string;
  description: string;
  status: PlanTaskStatus;
  assignedAgent: AgentType;
  priority: "P0" | "P1" | "P2" | "P3";
  acceptanceCriteria: string[];
  subAgentTracks: SubAgentTrack[];
  generatedPrompt?: string;       // copy-ready prompt
  lastSessionReportId?: string;   // link to the execution result
  branchName?: string;            // git branch created for this task
  createdAt: string;
  updatedAt: string;
};
```

---

## 5. FeaturePlan

```typescript
export type FeaturePlan = {
  id: string;
  projectId: string;
  title: string;                  // e.g. "Phase 2: Structured Planning"
  userGoal: string;               // original user input
  status: PlanTaskStatus;         // overall plan status
  tasks: PlanTask[];
  createdAt: string;
  updatedAt: string;
};
```

---

## 6. KanbanCard

```typescript
export type KanbanCard = {
  id: string;                     // = planTask.id
  planId: string;
  title: string;
  goal: string;
  assignedAgent: AgentType;
  status: PlanTaskStatus;
  subAgentTracks: SubAgentTrack[];
  lastResult?: string;            // brief summary of last execution
  nextPrompt?: string;            // generated next prompt
  branchName?: string;
};
```

---

## 7. DiffSummary (T019)

```typescript
export type DiffSummary = {
  changedFiles: string[];
  addedLines: number;
  removedLines: number;
  summary: string;                // LLM-generated plain-language summary
  completedTaskIds: string[];     // which plan tasks are now done
  partialTaskIds: string[];       // which plan tasks are partially done
  blockedTaskIds: string[];       // which plan tasks are now blocked
};
```

---

## 8. ExecutionLog (T018)

```typescript
export type ExecutionLog = {
  id: string;
  planTaskId: string;
  agent: AgentType;
  branchName: string;
  startedAt: string;
  completedAt?: string;
  exitCode?: number;
  logLines: string[];             // captured stdout/stderr
  status: "running" | "done" | "failed";
};
```

---

## 9. Kanban Column Model

| Column Key | Label | Meaning |
|---|---|---|
| `backlog` | Backlog | 아직 실행하지 않은 기능/작업 |
| `ready` | Ready | 프롬프트 생성 완료, 실행 가능 |
| `running` | Running | 에이전트 실행 중 |
| `review` | Needs Review | Diff 요약 확인 필요 |
| `done` | Done | 완료 |
| `blocked` | Blocked | 에러/불확실성 발생 |

---

## 10. Storage Files

| File | Contents |
|---|---|
| `data/feature-plans.json` | `FeaturePlan[]` |
| `data/execution-logs.json` | `ExecutionLog[]` |
| `data/diff-summaries.json` | `DiffSummary[]` |
| `data/projects.json` | `Project[]` (existing) |
| `data/session-reports.json` | `SessionReport[]` (existing) |
| `data/handoffs.json` | `Handoff[]` (existing) |
