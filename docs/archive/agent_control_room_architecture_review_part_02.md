
### Research Spike에서 확인해야 할 항목

| 확인 항목 | 이유 |
|---|---|
| Claude Code CLI가 프롬프트를 인자로 받을 수 있는가 | 자동 실행 가능성 판단 |
| Codex CLI가 비대화형 실행을 지원하는가 | Runner 연결 가능성 판단 |
| Antigravity가 외부 CLI 실행/작업 전달을 지원하는가 | 라우팅 가능성 판단 |
| 실행 후 종료 신호를 감지할 수 있는가 | 상태 관리 필요 |
| stdout/stderr 로그를 받을 수 있는가 | 웹 UI 스트리밍 필요 |
| 작업 디렉토리를 지정할 수 있는가 | 프로젝트별 실행 필요 |
| branch/worktree에서 실행 가능한가 | 안전장치 필요 |
| 실패 시 에러 코드를 받을 수 있는가 | 자동 리포트 필요 |

### 추천 순서

```text
T016-A. Research Spike 문서 작성
T016-B. 로컬에서 수동 CLI 실행 검증
T016-C. 최소 Runner API 구현
T016-D. UI에 실험적 실행 버튼 추가
T016-E. 로그 저장 및 상태 표시
```

문서만 작성하고 끝내면 속도가 느리고, 버튼부터 만들면 위험하다.

따라서 가장 좋은 방식은 다음이다.

> 짧은 리서치 스파이크 후 바로 실험 버튼 구현.

---

## 9. Git Branch / Worktree 안전장치

에이전트가 실제 코드를 수정하는 구조에서는 안전장치가 핵심 기능이다.

특히 PM/비개발자 사용자를 대상으로 한다면, 복구 가능성이 반드시 보여야 한다.

### 기본 실행 안전 흐름

```text
1. 현재 작업 상태 확인
2. 변경사항이 있으면 경고 또는 임시 커밋 생성
3. 새 branch 생성
4. 가능하면 git worktree 생성
5. 해당 branch/worktree에서 에이전트 실행
6. 작업 완료 후 diff 요약
7. 사용자가 merge / discard / continue 선택
```

### Branch 네이밍 예시

```text
acr/t016-cli-runner-20260520-1730
acr/fix-login-error-20260520-1735
acr/add-plan-board-20260520-1742
```

### MVP와 확장 방향

| 단계 | 방식 |
|---|---|
| MVP | 실행 시 새 branch 강제 |
| 확장 | Git worktree 기반 병렬 실행 |

Git worktree를 사용하면 여러 에이전트가 동시에 다른 작업을 해도 충돌을 줄일 수 있다.

---

## 10. HTML Implementation Plan View

사용자가 원하는 핵심 기능 중 하나는 구현 계획이 HTML로 보이는 것이다.

이 기능은 T016/T017에 묻히면 안 되고, 별도 핵심 기능으로 정의되어야 한다.

### 추천 기능명

> T018: Implementation Plan View

### 역할

> 사용자의 목표를 기능 단위 계획으로 바꾸고, 각 작업의 상태를 HTML 화면에서 보여주는 기능.

### 상태 모델

| 상태 | 의미 |
|---|---|
| Planned | 계획됨 |
| Ready | 실행 가능 |
| Running | 에이전트 실행 중 |
| Done | 완료 |
| Partial | 일부 완료 |
| Blocked | 막힘 |
| Needs Review | 사용자 확인 필요 |

### 화면 예시

```text
Feature: Agent Control Room Phase 3

[ ] T016 Agent Execution Runner
    [done] CLI capability research
    [running] Runner API prototype
    [planned] Claude Code adapter
    [planned] Codex adapter

[ ] T017 Diff & Outcome Analyzer
    [planned] git diff parser
    [planned] summary generator
    [planned] plan matching

[ ] T018 Plan View
    [done] static HTML plan
    [running] progress status update
    [planned] auto-add new tasks
```

핵심은 이 HTML이 단순 문서가 아니라 **살아있는 구현 계획판**이어야 한다는 점이다.

---

## 11. Kanban의 역할

오픈소스 기반 Kanban은 실행 상태를 보여주는 **Operational UI**로 활용된다.

Kanban은 코드를 실행하는 엔진이 아니라 다음 정보를 시각화하는 보드이다.

```text
사용자 목표
→ 기능 계획 생성
→ 작업 카드 생성
→ 에이전트 배정
→ 실행 상태 표시
→ 완료/실패/보류 표시
→ 결과 리포트 연결
```

### 추천 컬럼

| 컬럼 | 의미 |
|---|---|
| Backlog | 아직 실행하지 않은 기능/작업 |
| Ready | 프롬프트 생성 완료, 실행 가능 |
| Running | 에이전트 실행 중 |
| Review | Diff 요약 확인 필요 |
| Done | 완료 |
| Blocked | 에러/불확실성 발생 |

### 카드에 들어가야 할 정보

```text
카드명: T016 Agent Execution Runner

목표:
- 생성된 프롬프트를 Claude Code/Codex에 전달해 실행한다.

담당 에이전트:
- Claude Code

서브 작업:
- CLI 실행 방식 조사
- spawn runner 구현
- 로그 스트리밍 구현
- 브랜치 자동 생성
- 실패 처리

상태:
- Running

마지막 결과:
- runner API 기본 구조 생성 완료
- 로그 스트림은 아직 미완료

다음 프롬프트:
- 로그 스트리밍과 실행 상태 저장을 구현하라.
```

---

## 12. 서브에이전트 추적 방식

Claude Code, Codex, Antigravity 내부에서 실제로 어떤 서브에이전트가 움직였는지를 외부 시스템이 완벽하게 추적하는 것은 제한적일 수 있다.

따라서 MVP에서는 실제 내부 에이전트 감지보다 **계획 기반 서브에이전트 표시**가 현실적이다.

### 예시

```text
Main Card: T016 Agent Execution Runner

Sub-Agent Tracks:
1. Architecture Reviewer
2. CLI Researcher
3. Backend Implementer
4. Git Safety Reviewer
5. QA Reviewer
```

각 sub-agent는 실제 독립 프로세스가 아니어도 된다.

초기에는 역할 기반 작업 트랙으로 보여주면 충분하다.

### 표시 예시

```text
Backend Implementer: Done
Git Safety Reviewer: Running
QA Reviewer: Waiting
```

실제로는 하나의 Claude Code가 수행했더라도, 결과 리포트를 분석해서 어떤 역할의 작업이 완료되었는지 표시할 수 있다.

---

## 13. 추천 Phase 재정렬

현재 Phase는 다음과 같이 재정렬하는 것이 좋다.

---

## Phase 1: Manual Orchestration

이미 상당 부분 완료된 영역이다.

- Direction to Prompt
- Advisor Mode
- Session/Handoff
- 수동 복사/붙여넣기

---

## Phase 2: Structured Planning

CLI 실행 이전에 강화해야 하는 영역이다.

- Feature Plan 생성
- Task Breakdown
- HTML Implementation Plan View
- Kanban 카드 생성
- 작업 상태 모델
