# Roadmap Data Model — T027 구현 가이드

## 개요

Agent Control Room의 `/plan` 페이지를 **Visual Development Roadmap Control Panel**로 변경하기 위해 준비된 로드맵 데이터 모델입니다.

현재 상태:
- ✅ TypeScript 타입 정의: `RoadmapStatus`, `RoadmapBlocker`, `RoadmapUserDecision`, `RoadmapStage`, `Roadmap`
- ✅ 헬퍼 함수: `lib/roadmap.ts`
- ✅ 스토리지 계층: `lib/storage/roadmap-store.ts`
- ✅ 샘플 데이터: `data/roadmap.json`
- ✅ API 엔드포인트: `GET /api/roadmap?projectId=<projectId>`

## 로드맵 상태

로드맵의 각 단계(`RoadmapStage`)는 다음 상태 중 하나를 가집니다:

| 상태 | 설명 | UI 표시 |
|---|---|---|
| `completed` | 단계 완료 | ✅ 체크마크 |
| `active` | 현재 진행 중 | 🔵 활성화 배지 |
| `waiting` | 이전 단계 완료 대기 | ⏳ 대기 배지 |
| `blocked` | 진행 불가 (차단됨) | 🚫 차단 이유 표시 |
| `user_input_required` | 사용자 결정 필요 | ❓ 질문 표시 |
| `failed` | 단계 실패 | ❌ 실패 배지 |
| `handoff_needed` | 다른 에이전트로 전환 필요 | 🔄 핸드오프 제안 |

## 로드맵 단계 구조 (`RoadmapStage`)

```typescript
{
  id: string;                      // 고유 ID (e.g., "phase-2-structured-planning")
  number: number;                  // 단계 번호 (1, 2, 3...)
  title: string;                   // 제목 (e.g., "Phase 2: Structured Planning")
  description?: string;            // 설명
  goal: string;                    // 단계의 목표
  status: RoadmapStatus;           // 상태

  // ── 현재 상태 ──
  responsibleAgent?: AgentType;    // 담당 에이전트 (claude-code, codex, antigravity)
  currentTaskId?: string;          // 현재 진행 중인 task ID
  completionPercentage: number;    // 0-100

  // ── 구성 요소 ──
  tasks: PlanTask[];               // 이 단계의 모든 태스크 (T016 PlanTask 타입)
  acceptanceCriteria: string[];    // 단계 완료 기준

  // ── 차단/결정 ──
  blockers?: RoadmapBlocker[];     // 차단 사유 목록
  userDecisions?: RoadmapUserDecision[]; // 사용자 결정 지점

  // ── 다음 단계 ──
  nextAction?: string;             // 구체적인 다음 액션
  nextAgentRecommendation?: AgentType; // 다음 에이전트

  // ── 메타 ──
  estimatedDays?: number;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

## 사용 방법

### 1. 로드맵 데이터 읽기

```typescript
import { getRoadmap } from "@/lib/storage/roadmap-store";

const roadmap = await getRoadmap("agent-control-room");
```

### 2. 로드맵 진행률 계산

```typescript
import { getRoadmapProgress, getActiveRoadmapStage, getBlockedStages } from "@/lib/roadmap";

const progress = getRoadmapProgress(roadmap);      // 0-100
const active = getActiveRoadmapStage(roadmap);    // 현재 단계
const blocked = getBlockedStages(roadmap);        // 차단된 단계들
```

### 3. 다음 액션 결정

```typescript
import { getNextAction } from "@/lib/roadmap";

const { stage, action } = getNextAction(roadmap);
// stage: 현재 또는 다음 단계
// action: 수행할 액션 (문자열)
```

### 4. API를 통해 데이터 가져오기 (클라이언트)

```typescript
const response = await fetch("/api/roadmap?projectId=agent-control-room");
const { roadmap } = await response.json();
```

## `/plan` 페이지 구현 가이드

**현재 상태**: `/plan` 페이지는 기존 Kanban 보드 형태로 작동합니다. 

**T027 구현 시**:
1. Roadmap 데이터를 읽되, 기존 FeaturePlan과 호환성 유지
2. 로드맵 뷰 (단계별 요약) 추가
3. 각 단계별로:
   - 상태 배지 표시
   - 담당 에이전트 표시
   - 현재 작업 링크
   - 다음 액션 표시
   - 차단 사유 표시 (차단됨 상태일 때)
   - 사용자 질문 표시 (user_input_required 상태일 때)
   - 승인 기준 표시

### 예상 UI 레이아웃

```
┌─────────────────────────────────────────────────────┐
│ Phase 1: Manual Orchestration        ✅ 완료 (100%) │
│ 담당: Claude Code                                   │
│ 승인 기준: 모두 충족                                 │
│ [이전 단계 ─→]                                      │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Phase 2: Structured Planning         🔵 진행중 (100%)│
│ 담당: Antigravity                                   │
│ 현재: T017 HTML Implementation Plan View            │
│ 다음: Phase 3로 진행                                │
│ [상세 Kanban 보드 ▼]                                │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ Phase 9: Roadmap-First Control Tower ⏳ 대기 (0%)   │
│ 다음 단계. Phase 2 완료 대기.                        │
│ [대기 중...]                                        │
└─────────────────────────────────────────────────────┘
```

## 샘플 데이터 위치

- 전체 로드맵: `data/roadmap.json`
- API 접근: `GET /api/roadmap?projectId=agent-control-room`

## 차단된 단계 예시

```typescript
// Phase 9가 차단되는 경우
{
  status: "blocked",
  blockers: [
    {
      id: "blocker-1",
      title: "Token limit exceeded",
      description: "Claude Code token limit 도달",
      blockedAgent: "claude-code",
      blockedSince: "2026-05-21T10:00:00Z",
      requiredAction: "Context Pack 생성 후 새 세션 시작"
    }
  ]
}
```

## 사용자 입력이 필요한 단계 예시

```typescript
// Phase 9에서 사용자 결정 필요
{
  status: "user_input_required",
  userDecisions: [
    {
      id: "decision-1",
      question: "Roadmap UI를 기존 Kanban과 함께 표시할 것인가?",
      options: ["로드맵 뷰 + Kanban", "로드맵 뷰만", "Kanban만"],
      selectedOption: undefined  // 아직 선택 안 됨
    }
  ]
}
```

## 타입 정의 위치

```
lib/types.ts
  - RoadmapStatus
  - RoadmapBlocker
  - RoadmapUserDecision
  - RoadmapStage
  - Roadmap
```

## 스토리지 함수

```
lib/storage/roadmap-store.ts
  - getRoadmap(projectId): Promise<Roadmap | null>
  - getAllRoadmaps(): Promise<Roadmap[]>
  - saveRoadmap(roadmap: Roadmap): Promise<void>
  - generateRoadmapFromFeaturePlans(): Promise<Roadmap>
  - updateRoadmapStageStatus(): Promise<Roadmap | null>
```

## 헬퍼 함수

```
lib/roadmap.ts
  - getRoadmapProgress(roadmap): number
  - getActiveRoadmapStage(roadmap): RoadmapStage | undefined
  - getBlockedStages(roadmap): RoadmapStage[]
  - getUserInputRequiredStages(roadmap): RoadmapStage[]
  - getNextAction(roadmap): { stage?, action }
  - convertFeaturePlanToStage(plan, number): RoadmapStage
  - convertFeaturePlansToRoadmap(): Roadmap
  - summarizeRoadmapStage(stage): string
```

## 다음 단계

**T027 구현 시 확인 사항**:
1. 로드맵 뷰 UI가 모든 상태를 시각적으로 구분하는가?
2. 완료된 단계는 체크마크를 보여주는가?
3. 활성화된 단계는 담당 에이전트, 현재 작업, 다음 액션을 표시하는가?
4. 차단된 단계는 차단 사유와 필요한 사용자 결정을 표시하는가?
5. 각 단계의 승인 기준이 명확하게 보여지는가?
6. 기존 Kanban 기능은 여전히 작동하는가?
