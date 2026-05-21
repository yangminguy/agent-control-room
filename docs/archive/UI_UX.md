# UI/UX 개편 계획 - Agent Control Room

**작성일:** 2026-05-21  
**상태:** 방향성 변경으로 일부 대체됨  
**목표 완료:** Phase 3까지 약 4-7일

---

## 2026-05-21 방향성 업데이트

이 문서는 기존 칸반 강화 중심 UI 개편안입니다. 최신 제품 방향에서는 `/plan`을 단순 칸반 보드가 아니라 **Visual Development Roadmap Control Panel**로 봅니다.

따라서 아래의 카드 컴팩트화, 한국어화, 사이드바, 상태 표시 개선은 참고할 수 있지만, 우선순위는 다음으로 바뀝니다:

- 전체 제품 개발 로드맵을 먼저 보여준다.
- 완료된 단계는 체크 표시한다.
- 활성 단계는 담당 에이전트, 현재 작업, 다음 액션을 보여준다.
- 막힌 단계는 차단 사유와 사용자 결정 질문을 보여준다.
- Vibe Kanban의 전체 보드/session/diff UI를 복제하지 않는다.

Canonical direction: `docs/CONTROL_TOWER_DIRECTION.md`

## 개편 배경

현재 Agent Control Room은 기능적으로 완성되었으나 다음과 같은 문제가 있습니다:

1. **UI가 너무 기본적** - 텍스트 중심, 시각적 임팩트 부족
2. **언어 혼합** - 한국어와 영어가 섞여있어 일관성 없음
3. **칸반 보드의 매력 부족** - 단순 카드 나열, 시각적으로 생생하지 않음
4. **네비게이션 불편** - 상단 수평 네비게이션만 있어서 깊이 있는 조작이 어려움
5. **칸반 카드 과도하게 길어짐** - 확장 시 매우 길어져서 스크롤 피로 심함

---

## 개편 목표

- ✅ **한국어 완전 지원** - 모든 UI 텍스트를 한국어로 통일
- ✅ **칸반 보드의 매력 극대화** - 시각적으로 생생한 상태 표시, 카드 컴팩트화
- ✅ **사이드바 네비게이션 추가** - 깊이 있는 구조, 모바일 친화적
- ✅ **애니메이션과 상호작용** - 부드러운 전환, 시각적 피드백
- ✅ **정보 밀도 최적화** - 불필요한 정보는 감추고 필요한 것만 강조

---

## 개편 방향 (3가지 핵심)

### 1️⃣ 한국어 완전 지원 + 칸반 강화

#### Before (현재)
```
┌─────────────────────────────┐
│ T001 Planned               │  ← 영어 + 기본 배지
│ description...             │
│ branch: git-...            │  ← 너무 많은 정보
│ ... (스크롤 필요)           │
└─────────────────────────────┘
```

#### After (개편)
```
┌──────────────────┐
│ 🟡 계획됨        │  ← 상태가 크고 명확 (한국어)
│ T001 UI 개편     │
│ 🤖 claude-..     │
│ 진행: 70% ▓░     │  ← 새로운 진행률 표시
└──────────────────┘
  기본 높이: 160px (확장 시 부드럽게 증가)
```

**개선 사항:**
- 상태 원형 아이콘 확대 (🟡, ✅, 🚫 등)
- 카드 높이 축소 (160px 기본 → 필요시 확장)
- 모든 텍스트 한국어로 통일
- 진행률 막대 추가 (sub-task 진행도 한눈에)
- 색상 + 아이콘으로 상태를 한눈에 인지

---

### 2️⃣ 사이드바 네비게이션 추가

#### Before (현재)
```
┌─────────────────────────────────┐
│ Control Room | Status | Hand... │  ← 상단 수평 네비만 (공간 낭비)
├─────────────────────────────────┤
│            메인 콘텐츠          │
│                                 │
└─────────────────────────────────┘
```

#### After (개편)
```
┌──────────────────────────────────┐
│ ☰ Agent Control Room  🔔 ⚙️     │  ← 헤더 (심플)
├─────────────┬────────────────────┤
│ 📊 대시보드  │                   │
│ 📋 계획     │   메인 콘텐츠     │
│ 👥 프로젝트 │   (더 넓음)       │
│ 🤖 에이전트 │                   │
│ 🔗 핸드오프 │                   │
│ 📝 리포트   │                   │
│             │                   │
└─────────────┴────────────────────┘
  240px       1fr (반응형)
```

**장점:**
- 네비게이션이 항상 보임 (스크롤 없이)
- 현재 페이지 강조 표시
- 메인 콘텐츠 공간 증가
- 모바일: 토글 가능한 사이드바
- 깊이감 있는 UX

---

### 3️⃣ 칸반 진행률 시각화 추가

#### 새로운 플로우 다이어그램

```
계획됨(3) ──→ 준비됨(2) ──→ 실행중(1) ──→ 완료(5)
  ▓▓▓         ▓▓          ▓        ▓▓▓▓▓

전체 진행률: [████████░░░░░░░░░░░░░░░░░░] 62%

상태: 계획됨 3개 | 준비됨 2개 | 실행중 1개 | 완료 5개 | 부분 2개 | 블로킹 1개
```

**개선 사항:**
- 플로우 다이어그램으로 전체 흐름 시각화
- 진행률 바로 전체 진행도 한눈에
- 상태별 카운트로 밸런스 확인

---

## 상세 개편 계획 (Phase별)

### Phase 1: 기초 (1-2일) ⭐ 우선순위 1

**목표:** 한국어 완전 지원 + 칸반 카드 시각화 강화

#### 작업 항목

| 항목 | 설명 | 파일 | 난이도 |
|------|------|------|--------|
| 한국어 번역 | 모든 페이지 텍스트 한국어화 | 8개 | ⭐ |
| 칸반 카드 재설계 | 높이 축소 + 상태 아이콘 강화 | KanbanCard.tsx | ⭐⭐ |
| 진행률 시각화 | ProgressFlow 컴포넌트 추가 | KanbanBoard.tsx | ⭐⭐ |
| 번역 문자열 중앙화 | i18n 구조 (선택) | lib/i18n.ts | ⭐⭐ |

#### 변경 파일
```
app/
  ├── page.tsx (대시보드)
  ├── plan/page.tsx (실행 계획)
  ├── projects/page.tsx (프로젝트)
  ├── agent-status/page.tsx (에이전트 상태)
  ├── handoffs/page.tsx (핸드오프)
  └── reports/page.tsx (리포트)

components/
  └── plan/
      ├── KanbanCard.tsx (큰 변경: 높이 160px, 상태 아이콘)
      └── KanbanBoard.tsx (진행률 추가)

lib/
  └── (선택) i18n.ts (한국어 문자열)
```

#### 번역 기준표

| 영어 | 한국어 |
|------|--------|
| Dashboard | 대시보드 |
| Implementation Plan | 실행 계획 |
| Project | 프로젝트 |
| Agent Status | 에이전트 상태 |
| Handoffs | 핸드오프 |
| Reports | 리포트 |
| Planned | 계획됨 |
| Ready | 준비됨 |
| Running | 실행중 |
| Done | 완료 |
| Partial | 부분완료 |
| Blocked | 블로킹됨 |
| Needs Review | 검토필요 |

#### 상태별 색상 + 아이콘 (새로운 시스템)

```typescript
StatusConfig = {
  planned: {
    icon: '🟤',
    color: '#A1A1AA',
    bg: '#18181B',
    label: '계획됨'
  },
  ready: {
    icon: '🟡',
    color: '#EC4899',
    bg: '#EC4899',
    label: '준비됨'
  },
  running: {
    icon: '🔵',
    color: '#0EA5E9',
    bg: '#0EA5E9',
    label: '실행중'
  },
  done: {
    icon: '✅',
    color: '#16A34A',
    bg: '#16A34A',
    label: '완료'
  },
  partial: {
    icon: '⚠️',
    color: '#F59E0B',
    bg: '#F59E0B',
    label: '부분완료'
  },
  blocked: {
    icon: '🚫',
    color: '#DC2626',
    bg: '#DC2626',
    label: '블로킹됨'
  },
  needs_review: {
    icon: '👁️',
    color: '#A855F7',
    bg: '#A855F7',
    label: '검토필요'
  }
}
```

---

### Phase 2: 구조 (2-3일) ⭐⭐ 우선순위 2

**목표:** 사이드바 네비게이션 추가, 메인 레이아웃 재구성

#### 작업 항목

| 항목 | 설명 | 파일 | 난이도 |
|------|------|------|--------|
| Sidebar 컴포넌트 | 네비게이션 사이드바 생성 | Sidebar.tsx | ⭐⭐⭐ |
| TopHeader 컴포넌트 | 헤더 바 재설계 | TopHeader.tsx | ⭐⭐ |
| 레이아웃 재구성 | 그리드 레이아웃 (sidebar + main) | app/layout.tsx | ⭐⭐⭐ |
| 모바일 토글 | 사이드바 토글 버튼 (모바일) | MobileSidebarToggle.tsx | ⭐⭐ |
| 활성 상태 표시 | 현재 페이지 강조 | Sidebar.tsx | ⭐ |

#### 변경 파일
```
app/
  └── layout.tsx (그리드 레이아웃 변경)

components/
  └── layout/ (신규 폴더)
      ├── Sidebar.tsx (네비게이션)
      ├── TopHeader.tsx (헤더)
      └── MobileSidebarToggle.tsx (모바일 토글)
```

#### 레이아웃 구조
```typescript
<html>
  <body>
    <TopHeader />
    <div className="grid grid-cols-[240px_1fr] gap-0">
      <Sidebar />
      <main>
        {children}
      </main>
    </div>
  </body>
</html>
```

---

### Phase 3: 상세 (1-2일) ⭐⭐⭐ 우선순위 3

**목표:** 애니메이션 + 반응형 최적화

#### 작업 항목

| 항목 | 설명 | 파일 | 난이도 |
|------|------|------|--------|
| 카드 애니메이션 | 호버 시 그림자 확대, 상태 전환 애니 | KanbanCard.tsx | ⭐⭐ |
| 반응형 최적화 | 태블릿/모바일 뷰 개선 | 여러 파일 | ⭐⭐⭐ |
| 대시보드 정렬 | 정보 밀도 조정 | app/page.tsx | ⭐ |
| 성능 최적화 | 번들 크기, 렌더링 성능 | 여러 파일 | ⭐⭐ |

#### 애니메이션 스펙
```css
/* 카드 확장 */
@keyframes expandCard {
  from { max-height: 160px; opacity: 1; }
  to { max-height: 600px; opacity: 1; }
}

/* 호버 효과 */
.kanban-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0,0,0,0.3);
  transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
}

/* 상태 배지 전환 */
.status-badge {
  transition: all 200ms ease-out;
}
```

---

## KanbanCard.tsx 상세 변경

### Before (현재 구조)
```typescript
// 문제점:
- 높이: ~400px 이상 (확장 시 매우 길어짐)
- 상태 표시: 작은 배지
- 정보: 제목, 설명, 브랜치, Sub-agent, 실행 로그, 프롬프트, Diff... (너무 많음)
- 스크롤 피로: 높음
```

### After (개선된 구조)
```typescript
// 개선점:
- 기본 높이: 160px (컴팩트)
- 상태 표시: 크고 명확한 원형 아이콘 (40px)
- 정보 계층:
  1. 상태 (🟡 계획됨) - 크고 눈에 띔
  2. 제목 (T001 UI 개편) - 일반 크기
  3. 에이전트 (🤖 claude-code) - 작은 배지
  4. 진행률 (70% ▓░) - 시각적 피드백
  5. 브랜치 (선택사항) - 작은 텍스트
  
- 확장 시: 부드러운 애니메이션으로 추가 정보 표시
- 스크롤 피로: 극적으로 감소
```

### 코드 변경 예시
```typescript
// 기본 렌더링 (높이 160px)
<div className="rounded-xl border bg-surface p-3 space-y-2">
  {/* 상태: 크고 명확 */}
  <div className="flex items-center gap-3">
    <div className="text-4xl">{statusIcon}</div>
    <div className="flex-1">
      <p className="font-bold text-sm">{statusLabel}</p>
    </div>
  </div>

  {/* 제목 */}
  <h3 className="font-semibold text-text-primary truncate">
    T{task.id} {task.title}
  </h3>

  {/* 에이전트 */}
  <div className="flex items-center gap-1 text-xs">
    🤖 {task.recommendedAgent}
  </div>

  {/* 진행률 */}
  <ProgressBar percentage={70} />

  {/* 확장 버튼 */}
  <button onClick={() => setExpanded(!expanded)}>
    {expanded ? '접기' : '펼치기'} ▼
  </button>
</div>

// 확장 시 추가 정보 (smooth animation)
{expanded && (
  <div className="space-y-2 animate-slideDown">
    {/* 실행, 프롬프트, Diff 등 */}
  </div>
)}
```

---

## 예상 결과

### Before → After 비교

| 항목 | Before | After |
|------|--------|-------|
| **언어** | 한영 혼합 | 완전 한국어 |
| **칸반 카드 높이** | 400px+ | 160px (기본) |
| **상태 표시** | 작은 배지 | 큰 아이콘 (4배) |
| **네비게이션** | 상단 수평만 | 사이드바 + 상단 |
| **시각적 임팩트** | ⭐⭐ | ⭐⭐⭐⭐⭐ |
| **스크롤 피로** | 높음 | 낮음 |
| **반응형** | 기본 | 태블릿/모바일 최적화 |

---

## 검증 기준

### Phase 1 완료 후
- [ ] 모든 텍스트가 한국어인지 확인
- [ ] 칸반 카드가 160px 기본 높이로 축소되었는지
- [ ] 상태 아이콘이 크고 명확한지 확인
- [ ] 진행률 시각화가 보이는지 확인
- [ ] 페이지 로드 시간이 증가하지 않았는지 확인

### Phase 2 완료 후
- [ ] 사이드바가 모든 페이지에 표시되는지
- [ ] 현재 페이지가 사이드바에서 강조되는지
- [ ] 레이아웃이 반응형으로 작동하는지
- [ ] 모바일 토글이 작동하는지
- [ ] 기존 페이지 기능이 깨지지 않았는지

### Phase 3 완료 후
- [ ] 애니메이션이 부드러운지 확인
- [ ] 성능 저하가 없는지 (lighthouse 점수)
- [ ] 모든 해상도에서 레이아웃이 깨지지 않는지

---

## 기술 스택 (변경 없음)

- **Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **UI Library:** shadcn/ui
- **Icons:** lucide-react (추가 이모지 활용)

---

## 일정 및 리소스

| Phase | 일정 | 파일 변경 수 | 예상 코드량 |
|-------|------|------------|-----------|
| Phase 1 | 1-2일 | 8개 | 500-800줄 |
| Phase 2 | 2-3일 | 3개 | 400-600줄 |
| Phase 3 | 1-2일 | 3개 | 200-400줄 |
| **Total** | **4-7일** | **14개** | **1100-1800줄** |

---

## 우선순위 정리

### 🔴 필수 (Phase 1)
1. 한국어 완전 지원
2. 칸반 카드 높이 축소 (160px)
3. 상태 아이콘 확대
4. 진행률 시각화

### 🟡 권장 (Phase 2)
1. 사이드바 네비게이션
2. 레이아웃 재구성
3. 반응형 최적화

### 🟢 선택 (Phase 3)
1. 애니메이션
2. 성능 최적화
3. 추가 UI 다듬기

---

## 참고 자료

- 현재 디자인 시스템: `docs/DESIGN_SYSTEM.md`
- 아키텍처: `docs/ARCHITECTURE.md`
- 현재 구현: `app/plan/page.tsx`, `components/plan/KanbanCard.tsx`

---

**다음 단계:** Phase 1 승인 후 즉시 진행 시작
