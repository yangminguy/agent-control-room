# AGENT_EXECUTION_PLAN.md — Multi-Agent Task Distribution

## Overview
18개 작업(T023~T040)을 12개 에이전트 팀에 분담. agent-organizer가 주도하며 의존성 관리.

**Timeline**: 18주 (Q3 2026 ~ Q2 2027)  
**Coordination**: agent-organizer → 각 팀장 → 팀 에이전트들

---

## 🎯 Agent Team Structure

### **Team 1: Intelligence & Routing (Lead: ai-engineer)**
리더: `ai-engineer`  
멤버: `llm-architect`, `prompt-engineer`, `context-manager`

| Task | Owner | Role | Priority | Duration |
|------|-------|------|----------|----------|
| **T023** — Agent Capability Inventory | `ai-engineer` | 정의: 45개 에이전트 프로필 생성 (JSON) | P1 | 1주 |
| **T024** — Dynamic Agent Selection Router | `llm-architect` | 구현: enhanced `routeAgent()` with scoring | P1 | 2주 |
| **T033** — Contextual Prompt Enhancement | `prompt-engineer` | 구현: 과거 예제 포함 프롬프트 생성 | P2 | 1.5주 |
| **T040** — Feedback Loop | `context-manager` | 통합: session report → next task recommendation | P3 | 1주 |

**Deliverables**:
- `data/agent-profiles.json` (45 agents × 8 fields)
- Enhanced `lib/orchestration/router.ts` with confidence scoring
- Prompt templates with historical context injection
- Session-to-next-task linking logic

**Handoff**: → Team 2 (UI/Design)

---

### **Team 2: UI/Design Excellence (Lead: ui-designer)**
리더: `ui-designer`  
멤버: `ux-researcher`, `frontend-developer`, `design-bridge`, `accessibility-tester`

| Task | Owner | Role | Priority | Duration |
|------|-------|------|----------|----------|
| **T026** — Design System Audit | `ui-designer` + `design-bridge` | 설계: 색상, 타이포, 스페이싱, 컴포넌트 | P1 | 1주 |
| **T027** — UX Research | `ux-researcher` + `business-analyst` | 조사: PM 워크플로우, 페인 포인트, 여정도 | P1 | 1.5주 |
| **T028** — Implement High-Fidelity UI | `frontend-developer` | 개발: 모든 화면 리팩토링 (디자인 시스템 적용) | P1 | 3주 |
| **T031** — Accessibility Testing | `accessibility-tester` | QA: WCAG AA 감사, 개선 지침 | P1 | 1주 |

**Deliverables**:
- Design system spec (Figma or markdown)
- Wireframes + user journeys
- High-fidelity React components
- Accessibility report + remediation plan

**Acceptance**:
- All screens responsive (375px, 768px, 1440px)
- Dark mode support
- WCAG AA passed
- Performance: LCP <2.5s

**Handoff**: → Team 3 (Code Quality)

---

### **Team 3: Code Quality & Testing (Lead: code-reviewer)**
리더: `code-reviewer`  
멤버: `qa-expert`, `typescript-pro`, `refactoring-specialist`, `dependency-manager`

| Task | Owner | Role | Priority | Duration |
|------|-------|------|----------|----------|
| **T025** — Agent Composition Executor | `typescript-pro` | 구현: `AgentCompositionTrack` 타입, 로직 | P1 | 2주 |
| **T029** — Automated Code Review | `code-reviewer` | 통합: 실행 후 diff → 리뷰 파이프라인 | P1 | 2주 |
| **T030** — QA Test Generation | `qa-expert` | 통합: 변경 감지 → 테스트 생성 + 실행 | P1 | 2주 |
| **T037** — Error Detection & Recovery | `refactoring-specialist` | 구현: 실패 분석 → 루트 원인 + 복구 제안 | P2 | 1.5주 |

**Deliverables**:
- Multi-agent task UI in KanbanBoard
- Code review integration
- QA test pipeline
- Error analysis + recovery suggestions

**Handoff**: → Team 4 (Knowledge & Analytics)

---

### **Team 4: Knowledge & Analytics (Lead: knowledge-synthesizer)**
리더: `knowledge-synthesizer`  
멤버: `data-analyst`, `research-analyst`, `documentation-engineer`, `technical-writer`

| Task | Owner | Role | Priority | Duration |
|------|-------|------|----------|----------|
| **T032** — Execution Pattern Detection | `knowledge-synthesizer` + `data-analyst` | 분석: 성공/실패 패턴, 에이전트 성공률 매트릭스 | P2 | 2주 |
| **T034** — Auto-Generated Documentation | `documentation-engineer` + `technical-writer` | 구현: diff → 자동 문서 생성 + 커밋 | P2 | 1.5주 |
| **T036** — Observability & Metrics | `data-analyst` + `research-analyst` | 대시보드: 에이전트 성능, 작업 성공률, 비용 추적 | P2 | 2주 |

**Deliverables**:
- `data/execution-patterns.json` (success rates × agent × task_type)
- Auto-generated docs in project folders
- `/metrics` dashboard with 5+ KPIs
- Monthly reports

**Handoff**: → Team 5 (Infrastructure)

---

### **Team 5: Production Infrastructure (Lead: postgres-pro)**
리더: `postgres-pro`  
멤버: `data-engineer`, `backend-developer`, `database-optimizer`, `performance-engineer`

| Task | Owner | Role | Priority | Duration |
|------|-------|------|----------|----------|
| **T035** — Supabase Data Model | `postgres-pro` + `data-engineer` | 설계: 스키마 + 마이그레이션 + JSON↔DB 연동 | P2 | 2주 |
| **T036** — Observability (infra 부분) | `backend-developer` | 구현: 메트릭 수집 엔드포인트 + DB 저장 | P2 | 1.5주 |
| **T037** — Error Recovery (infra 부분) | `database-optimizer` + `debugger` | 최적화: 에러 로그 인덱싱, 빠른 조회 | P2 | 1주 |

**Deliverables**:
- Supabase schema (8+ tables)
- Migration scripts
- Data layer abstraction
- Performance-tuned queries

**Handoff**: → Team 6 (Workflow Orchestration)

---

### **Team 6: Advanced Orchestration (Lead: workflow-orchestrator)**
리더: `workflow-orchestrator`  
멤버: `project-manager`, `task-distributor`, `git-workflow-manager`, `codebase-orchestrator`

| Task | Owner | Role | Priority | Duration |
|------|-------|------|----------|----------|
| **T038** — Parallel Multi-Project Execution | `task-distributor` + `workflow-orchestrator` | 구현: 큐 시스템, 에이전트 리소스 한계 관리 | P3 | 2주 |
| **T039** — Conditional Task Branching | `workflow-orchestrator` | 구현: if/then 규칙 엔진 (테스트 실패 → 디버그 작업 생성) | P3 | 1.5주 |
| **T040** — Feedback Loop (orchestration 부분) | `project-manager` + `codebase-orchestrator` | 통합: 완료된 작업 분석 → 다음 방향 제안 | P3 | 1주 |

**Deliverables**:
- Async task queue with priority
- Conditional branching engine
- Auto-generated next-task recommendations
- Fully autonomous loop (with approval gates)

---

## 📋 Phase-by-Phase Execution

### **Phase 6: Intelligent Routing (Weeks 1–5)**

**Lead Coordinator**: agent-organizer  
**Parallel Teams**: Team 1 (Intelligence) + Team 2 (UI/Design) start simultaneously

**Week 1–2**: Team 1
- T023 (ai-engineer): Agent Capability Inventory complete
- Handoff: agent-profiles.json ready for Team 1–2 integration

**Week 1–2**: Team 2 start
- T026 (ui-designer): Design System spec ready
- T027 (ux-researcher): UX research complete

**Week 3–4**: Team 1 continues
- T024 (llm-architect): Dynamic router implemented
- T025 (typescript-pro via Team 3 partial): Type definitions ready

**Week 3–5**: Team 2 continues
- T028 (frontend-developer): UI implementation phase 1
- T031 (accessibility-tester): A11y audit running

**Week 5 Sync**: Agent-organizer reviews both teams
- Intelligence routing ready for deployment
- UI mockups ready for Phase 7 full implementation

---

### **Phase 7: UI Excellence (Weeks 6–10)**

**Lead Coordinator**: ui-designer  
**Focus**: Team 2 completes all UI work

**Week 6–10**: Team 2
- T028 continues: Full UI implementation
- T031 continues: A11y fixes

**Week 8–9**: Team 1 parallel work
- T033 (prompt-engineer): Contextual enhancement
- T040 start (context-manager): Session linking

**Deliverable Week 10**: 
- All screens high-fidelity + responsive + WCAG AA
- Design system production-ready

---

### **Phase 8: Quality Assurance (Weeks 11–15)**

**Lead Coordinator**: code-reviewer  
**Focus**: Team 3 builds QA pipeline

**Week 11–15**: Team 3
- T029 (code-reviewer): Code review automation
- T030 (qa-expert): Test generation pipeline
- T025 continuation (typescript-pro): Multi-agent UI finalized

**Week 13–14**: Team 4 start (parallel)
- T032 (knowledge-synthesizer): Pattern analysis begins
- T034 (documentation-engineer): Doc generation logic

**Deliverable Week 15**:
- Code review pipeline live
- QA test generation + execution working
- Accessibility automation working

---

### **Phase 9: Knowledge Management (Weeks 16–19)**

**Lead Coordinator**: knowledge-synthesizer  
**Focus**: Team 4 synthesizes execution data

**Week 16–19**: Team 4
- T032 continues: Success rate matrix updated
- T034 continues: Auto-docs in project folders
- T036 (data-analyst): Metrics dashboards

**Week 17–18**: Team 1 continuation
- T033 (prompt-engineer): Live prompt enhancement
- T040 (context-manager): Session → next task automation

**Deliverable Week 19**:
- Execution pattern matrix
- Auto-generated docs live
- Metrics dashboard visible

---

### **Phase 10: Production Infrastructure (Weeks 20–24)**

**Lead Coordinator**: postgres-pro  
**Focus**: Team 5 moves to Supabase

**Week 20–24**: Team 5
- T035 (postgres-pro): Schema + migrations
- Data layer migration: JSON → Supabase
- T036 (backend-developer): Metrics endpoints
- T037 (database-optimizer): Performance tuning

**Deliverable Week 24**:
- All data in Supabase
- Local JSON fallback still works
- Metrics pipeline live

---

### **Phase 11: Advanced Orchestration (Weeks 25–30)**

**Lead Coordinator**: workflow-orchestrator  
**Focus**: Team 6 builds advanced features

**Week 25–30**: Team 6
- T038 (task-distributor): Parallel execution queue
- T039 (workflow-orchestrator): Conditional branching
- T040 (project-manager): Fully autonomous loop

**Deliverable Week 30**:
- Parallel execution working
- Conditional rules engine live
- Fully autonomous (with approval gates)

---

## 🔄 Dependency Graph

```
T023 (Agent Profiles)
  ↓
  ├─→ T024 (Dynamic Router) → T025 (Agent Composition)
  ├─→ T033 (Prompt Enhancement)
  └─→ T040 (Feedback Loop)

T026 (Design System)
  ↓
  ├─→ T027 (UX Research)
  └─→ T028 (High-Fidelity UI) → T031 (A11y Testing)

T025 (Agent Composition) + T028 (UI)
  ↓
  ├─→ T029 (Code Review)
  ├─→ T030 (QA Tests)
  └─→ T037 (Error Recovery)

T029 + T030 + T031 + T037
  ↓
  ├─→ T032 (Pattern Detection)
  ├─→ T034 (Auto-Docs)
  └─→ T036 (Metrics)

T032 + T034 + T036
  ↓
  ├─→ T035 (Supabase)
  ├─→ T037 (Error Recovery)
  └─→ T038 (Parallel Execution)

T038 + T039 + T040
  ↓
  → Phase 11 Complete (Fully Autonomous Loop)
```

---

## 📊 Agent Utilization Summary

| Agent | Tasks | Total Hours | Availability |
|-------|-------|-------------|--------------|
| ai-engineer | T023, T024 | 40 | Team 1 Lead |
| llm-architect | T024 | 40 | Team 1 |
| prompt-engineer | T033 | 30 | Team 1 |
| context-manager | T040 | 20 | Team 1 |
| ui-designer | T026, T028 | 80 | Team 2 Lead |
| ux-researcher | T027, T028 | 40 | Team 2 |
| frontend-developer | T028 | 80 | Team 2 |
| design-bridge | T026 | 20 | Team 2 |
| accessibility-tester | T031 | 30 | Team 2 |
| code-reviewer | T029 | 50 | Team 3 Lead |
| qa-expert | T030 | 60 | Team 3 |
| typescript-pro | T025 | 50 | Team 3 |
| refactoring-specialist | T037 | 30 | Team 3 |
| knowledge-synthesizer | T032 | 50 | Team 4 Lead |
| data-analyst | T032, T036 | 60 | Team 4 |
| research-analyst | T036 | 30 | Team 4 |
| documentation-engineer | T034 | 40 | Team 4 |
| technical-writer | T034 | 30 | Team 4 |
| postgres-pro | T035 | 50 | Team 5 Lead |
| data-engineer | T035 | 40 | Team 5 |
| backend-developer | T036 | 40 | Team 5 |
| database-optimizer | T036, T037 | 30 | Team 5 |
| debugger | T037 | 20 | Team 5 |
| performance-engineer | T036 | 30 | Team 5 |
| workflow-orchestrator | T038, T039 | 60 | Team 6 Lead |
| project-manager | T039, T040 | 50 | Team 6 |
| task-distributor | T038 | 40 | Team 6 |
| git-workflow-manager | T040 | 20 | Team 6 |
| codebase-orchestrator | T040 | 20 | Team 6 |

---

## 🎯 Coordination Protocol

### Weekly Sync
**Every Monday, 10:00 AM**
- 각 Team Lead 15분 status update (Team 1–6)
- Blocking issues discussion
- Cross-team dependencies check
- agent-organizer가 주도

### Handoff Checklist (각 Phase 완료 시)
- [ ] All acceptance criteria met
- [ ] Tests pass (npm run typecheck, lint)
- [ ] Code review approved
- [ ] Documentation complete
- [ ] Next team briefed + ready

### Escalation
- **Blocking issue**: Team Lead → agent-organizer (same day)
- **Design decision**: ui-designer + ai-engineer (jointly)
- **Architecture question**: agent-organizer → review (before implementation)

---

## 🚀 Start Order

### **This Week (Week 1)**
- [ ] agent-organizer: Kick-off sync (all 6 teams)
- [ ] ai-engineer (Team 1): Start T023 (Agent Profiles)
- [ ] ui-designer (Team 2): Start T026 (Design System) + T027 (UX Research)

### **Next Week (Week 2)**
- [ ] T023 delivered → ai-engineer hands off to llm-architect
- [ ] T024 (llm-architect) starts
- [ ] T028 (frontend-developer) starts based on T026 spec

### **Week 3 Checkpoint**
- [ ] Agent profiles ready for router integration
- [ ] Design system 80% complete
- [ ] UI architecture designed

---

## 📝 Notes

- **Parallel work**: Teams 1 & 2 run simultaneously (no blocking)
- **Code freeze**: Each phase end has 1-week code review + testing buffer
- **Rollback plan**: If Team X blocks on Team Y, use mock/stub data to unblock
- **Communication**: Slack channel per team + weekly markdown status in docs/
