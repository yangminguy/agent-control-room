# UX Research — Agent Control Room

## 사용자 기본 정보

**Primary User**: PM (양원민)
- **Goal**: AI 코딩 도구들 (Claude Code, Codex, Antigravity)을 효율적으로 orchestrate
- **Pain**: 수동으로 에이전트를 선택하고, 컨텍스트를 옮기고, 결과를 정리하는 것이 번거로움
- **Frequency**: 거의 매일 (프로젝트별 작업)

---

## 사용자 여정 (User Journey)

### **1단계: 프로젝트 준비**
```
Input: 프로젝트 디렉토리, 목표 문서
Output: 프로젝트 등록 완료
Pain Points:
  - 프로젝트 문서를 수동으로 요약해야 함
  - 여러 파일에서 정보 수집 필요
Current UX: 
  ✓ Project registration form 있음
  ⚠️ 문서 자동 파싱 없음
```

### **2단계: 작업 방향 입력**
```
Input: "다크 모드 추가하기"
Output: 기술 번역, 작업 분해, 에이전트 추천
Pain Points:
  - 라우팅 이유를 이해하기 어려움
  - 추천된 에이전트가 적절한지 판단 불가
  - 프롬프트가 뭘 하는 프롬프트인지 불명확
Current UX:
  ✓ Direction input form
  ✓ Agent routing result
  ⚠️ Reasoning이 technical하고 비개발자 이해 어려움
  ⚠️ 복사하기는 있지만 편집 불가
```

### **3단계: 에이전트 실행**
```
Input: 생성된 프롬프트 + 에이전트 선택
Output: 코드 변경, 커밋
Pain Points:
  - 시스템 밖에서 에이전트 실행해야 함
  - 로그가 시스템에 기록되지 않음
  - 실패하면 manual rollback
Current UX:
  ✓ Copy-ready prompt
  ✓ Execution logs (있지만 보기 어려움)
  ⚠️ Manual executor
  ⚠️ 에러 메시지 해석 어려움
```

### **4단계: 결과 분석**
```
Input: 커밋된 코드, git diff
Output: 작업 완료 또는 "수정 필요" 판정
Pain Points:
  - 어떤 파일들이 변경되었는지 한눈에 안 보임
  - 다음 작업이 명확하지 않음
  - 세션 리포트 작성이 번거로움
Current UX:
  ✓ Session report form
  ⚠️ 프로젝트/태스크 자동 선택 안 됨
  ⚠️ 변경 파일 수동 기입
```

---

## 주요 페인 포인트

### **🔴 P0 — Critical**

#### **1. Plan View가 너무 복잡함**
- **현상**: Kanban 카드가 너무 많은 정보를 담고 있음
- **영향**: 사용자가 카드를 클릭해서 펼쳐봐야 정보를 이해함
- **해결책**: 
  - 카드를 더 compact하게 (Title + Status + Agent만)
  - 호버시 preview 표시
  - 클릭시 사이드 패널에 상세 정보
- **우선순위**: 지금 바로 (UI 개선)

#### **2. 에이전트 추천 이유가 이해 안 됨**
- **현상**: "Technical한 이유"가 개발자아님 사용자에게 어려움
- **예**: "요구사항이 아직 넓거나 모호하므로 Claude Code가..." → 이게 뭘 의미하는가?
- **해결책**:
  - 비개발자 친화적 언어로 변역
  - 예: "This task needs deep thinking & planning" 대신 "복잡한 설계가 필요해서요"
  - 에이전트 설명: "각 도구의 강점" 텍스트로 추가
- **우선순위**: Phase 6에서 부분 해결, Phase 7에서 완성

#### **3. 모바일에서 사용 불가능**
- **현상**: 모든 페이지가 desktop-first, 모바일 반응형 없음
- **영향**: 외출 중 빠른 확인 불가능
- **해결책**: 모바일 우선 반응형 디자인
- **우선순위**: Phase 7 (UI Design)

---

### **🟠 P1 — High**

#### **4. 작업 상태 추적이 부족함**
- **현상**: Kanban 카드가 "Done" 또는 "Blocked"로만 나뉨
- **문제**: 중간 상태 (Partial, Review needed) 시각화 어려움
- **해결책**: Status badge를 더 명확하고 색깔있게
- **우선순위**: Phase 7 (UI Design)

#### **5. 세션 간 컨텍스트 손실**
- **현상**: 한 작업을 여러 세션에 걸쳐 진행할 때 이전 결과를 기억하기 어려움
- **해결책**: 작업별 history view (모든 세션 리포트 표시)
- **우선순위**: Phase 9 (Knowledge Management)

#### **6. 에러 발생 시 해결 방법이 명확하지 않음**
- **현상**: 타이프 에러, 에이전트 실패 → "뭘 해야 하나?" 상태
- **해결책**: AI 기반 error suggestion ("이 에러는 [원인]이고 [해결책]입니다")
- **우선순위**: Phase 10 (Error Detection & Recovery)

---

### **🟡 P2 — Medium**

#### **7. 다중 프로젝트 관리가 불편함**
- **현상**: 프로젝트 전환 매번 프로젝트 페이지 거쳐야 함
- **해결책**: 대시보드에 "최근 프로젝트" 핀 기능, 빠른 전환
- **우선순위**: Phase 7 (Dashboard redesign)

#### **8. 프롬프트 편집이 불가능함**
- **현상**: 생성된 프롬프트가 마음에 안 들면 copy → manual edit → external tool
- **해결책**: UI에서 프롬프트 수정 가능하게
- **우선순위**: Phase 8

---

## 개선 옵션

### **즉시 적용 (Phase 7)**

| Pain Point | Solution | Component | Impact |
|-----------|----------|-----------|--------|
| Plan view too complex | Compact card + side panel | KanbanCard | High |
| Mobile unusable | Responsive design | All pages | High |
| Status unclear | Better badges + colors | Status badges | Medium |
| Agent reason unclear | Friendly language + tooltips | Routing result | High |
| Recent projects hard to access | Quick access menu | Dashboard | Low |

### **다음 단계 (Phase 8~11)**

| Pain Point | Solution | Phase | Timeline |
|-----------|----------|-------|----------|
| Context loss between sessions | History view + synthesis | Phase 9 | 2주 |
| Error handling unclear | AI-powered suggestions | Phase 10 | 2주 |
| Prompt not editable | Inline editing | Phase 8 | 2주 |
| Multi-project management | Smart navigation | Phase 7~8 | 1주 |

---

## 와이어프레임

### Plan Page (개선 후)

```
┌─────────────────────────────────────────────────┐
│ Agent Control Room                         🌙    │
├─────────────────────────────────────────────────┤
│ < Phase 6 / Plan & Kanban                        │
├─────────────────────────────────────────────────┤
│                                                   │
│  📋 Task List         [+ New Task] [Filter]      │
│                                                   │
│  ┌──────────┬──────────┬──────────┬──────────┐   │
│  │ Planned  │  Ready   │ Running  │  Done    │   │
│  ├──────────┼──────────┼──────────┼──────────┤   │
│  │           │          │          │          │   │
│  │ T023      │ T024     │ T025     │ T001    │   │
│  │ Profiles  │ Router   │ Comp.    │ Init.   │   │
│  │ 🤖 ai-eng │ 🧠 llm   │ 💻 ts    │ ✓ Done  │   │
│  │           │          │          │          │   │
│  │ T004 .... │ T005 ... │ T026 ... │ T002 .. │   │
│  │           │          │          │          │   │
│  └──────────┴──────────┴──────────┴──────────┘   │
│                                                   │
│ ── Side Panel (Compact) ──                       │
│ T024: Dynamic Router                            │
│                                                   │
│ Status: Ready ●●●◯ (confidence)                 │
│ Agent: llm-architect                            │
│ Est. time: 2h | Tokens: 20k                     │
│                                                   │
│ [Show Full Details] [Run Now] [Edit]            │
│                                                   │
└─────────────────────────────────────────────────┘
```

### Dashboard (개선 후)

```
┌──────────────────────────────────────────┐
│ Control Room                         🌙   │
├──────────────────────────────────────────┤
│ Welcome back, 양원민!                     │
│                                          │
│ 📌 Pinned Projects                       │
│ ┌──────────────┐ ┌──────────────┐        │
│ │ Agent Control│ │ Recipe App   │        │
│ │ Room         │ │              │        │
│ │ ✓ Phase 6    │ │ ⚙ In Progress│        │
│ │ 3 tasks TODO │ │ 7 tasks TODO │        │
│ └──────────────┘ └──────────────┘        │
│                                          │
│ 🔄 Recent Activity                      │
│ • T025 Completed (2h ago)                │
│ • T024 Ready for execution (4h ago)      │
│ • Session: Auth redesign (yesterday)     │
│                                          │
│ 📊 Stats This Week                       │
│ • 12 tasks completed                     │
│ • 2 projects active                      │
│ • Avg. task time: 45min                  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 성공 기준

### UX 개선 검증
- [ ] Kanban 카드 compact 모드에서 모든 정보 한눈에 보임
- [ ] Mobile viewport에서 모든 주요 기능 접근 가능
- [ ] 에이전트 추천 이유가 비개발자도 이해 가능
- [ ] 15초 이내에 최근 프로젝트 전환 가능

### 성능 검증
- [ ] Page load: <2s (LCP)
- [ ] Interactivity: <100ms (FID)
- [ ] Visual stability: <0.1 (CLS)

### 접근성 검증
- [ ] WCAG AA 통과 (axe DevTools 점수 90+)
- [ ] 키보드 네비게이션 모든 기능 가능
- [ ] 스크린 리더: 모든 요소 accessible
