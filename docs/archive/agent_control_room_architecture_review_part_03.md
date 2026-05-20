- Plan Registry

---

## Phase 3: Semi-Automated Execution

T016/T017이 들어가는 영역이다.

- CLI Runner
- Agent Adapter
- Branch/Worktree Safety
- Log Capture
- Git Diff Summary
- Outcome Analysis

---

## Phase 4: Multi-Agent Routing

여러 AI 코딩 환경을 목적에 따라 나눠 쓰는 단계이다.

- Claude Code / Codex / Antigravity 라우팅
- 에이전트별 강점 판단
- Rate Limit 상태 관리
- 다른 에이전트로 Handoff
- 실패 시 Advisor Mode 자동 호출

---

## Phase 5: Autonomous Loop

나중 단계의 고도화 영역이다.

- 목표 달성 여부 자동 판단
- 다음 작업 자동 생성
- 반복 실행
- 사용자 승인 기반 merge
- 품질 기준 미달 시 자동 재작업

---

## 14. 추천 우선순위

기존 우선순위는 다음과 같았다.

```text
T016 CLI Runner
→ T017 Git Diff
→ Phase 4 Token Handoff
```

하지만 사용자 목표 기준으로는 다음 순서가 더 적합하다.

```text
T016 Plan/Kanban Data Model 정리
→ T017 HTML Implementation Plan View
→ T018 Agent Execution Runner
→ T019 Git Diff & Outcome Analyzer
→ T020 Multi-Agent Router
→ T021 Token/Rate Limit Handoff
```

### 이유

CLI 실행 버튼을 먼저 만들면 다음 문제가 생길 수 있다.

- 무엇을 실행하는지 명확하지 않다.
- 어떤 계획의 몇 번째 작업인지 추적하기 어렵다.
- 실행 결과가 어떤 기능 완성과 연결되는지 약해진다.
- Kanban과 HTML 계획판이 단순 부가 기능으로 밀릴 수 있다.

사용자가 원하는 것은 단순 실행 버튼이 아니라 다음 구조이다.

> 기능 완성까지 AI들이 움직이는 과정을 보여주고, 관리하고, 이어주는 시스템.

따라서 계획판과 Kanban이 먼저 잡히고, 그다음 실행 자동화가 붙는 순서가 적합하다.

---

## 15. 핵심 문장 수정 제안

기존 표현:

> 앞으로의 작업은 실행의 반자동화로 나아간다.

수정 권장 표현:

> 앞으로의 작업은 단순 CLI 실행 자동화가 아니라, 사용자의 목표를 기능 계획으로 변환하고, 적절한 AI 개발 환경에 배정하며, 실행 결과를 Git Diff와 세션 리포트로 판정해 다음 작업까지 이어주는 반자동 AI 개발 오케스트레이션으로 나아간다.

---

## 16. 최종 결론

Agent Control Room의 현재 방향은 사용자의 의도와 큰 틀에서 일치한다.

다만 제품의 중심을 CLI Runner로 두면 안 된다.

CLI Runner는 핵심 구성요소 중 하나일 뿐이며, 제품의 본질은 다음 반복 루프에 있다.

```text
계획
→ 에이전트 배정
→ 실행
→ 결과 분석
→ Diff 판정
→ 계획 갱신
→ 다음 실행
```

따라서 Agent Control Room은 다음과 같이 정의해야 한다.

> Agent Control Room은 PM/비개발자가 구현하고 싶은 목표를 입력하면, 이를 기능 단위 계획으로 분해하고, Claude Code / Codex / Antigravity 같은 AI 개발 환경에 적절히 배정하며, 실행 결과를 분석해 기능 완성까지 이어주는 AI 개발 오케스트레이션 운영실이다.

오픈소스 Kanban은 이 과정에서 각 기능, 작업, 에이전트 상태를 보여주는 **운영 대시보드**로 활용하는 것이 가장 적합하다.

---

## 17. 다음 작업 제안

이 문서를 기준으로 다음 개발 문서를 별도로 생성하는 것이 좋다.

1. `ARCHITECTURE.md`
   - 전체 시스템 구조
   - 주요 레이어
   - 데이터 흐름

2. `ROADMAP.md`
   - Phase 1~5 재정렬
   - T016 이후 우선순위

3. `TASK_MODEL.md`
   - Plan / Task / Agent / Sub-Agent / Session / Diff 데이터 모델

4. `T016_PLAN_KANBAN_MODEL.md`
   - Kanban 상태 모델
   - 카드 구조
   - HTML Plan View와의 연결 방식

5. `T018_AGENT_EXECUTION_RUNNER_SPIKE.md`
   - Claude Code, Codex, Antigravity CLI 실행 가능성 조사
   - Runner API 실험 범위
   - 안전장치 설계

