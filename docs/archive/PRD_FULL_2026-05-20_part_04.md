| 명확한 기능 구현 | Codex |
| 버그 수정 | Codex |
| 타입 에러 해결 | Codex |
| UI 프로토타입 | Antigravity |
| 멀티파일 화면 구현 | Antigravity |
| 최종 구조 리뷰 | Claude Code |

---

### 16.9 실행 프롬프트 생성

선택된 도구에 붙여넣을 수 있는 실행 프롬프트를 생성한다.

프롬프트 포함 요소:

```txt
프로젝트 요약
현재 작업
참고 문서
수정 가능 파일
수정 금지 파일
완료 기준
테스트 기준
결과 보고 형식
주의사항
```

예시:

```md
# Task for Codex

## Project
Agent Control Room

## Context
This project helps a non-developer PM orchestrate Claude Code, Codex, and Antigravity.

## Current Task
Implement AGENT_STATE.md parser and ProjectStatusCard UI.

## Read First
- CLAUDE.md
- AGENT_STATE.md
- TASKS.md
- docs/PRD.md

## Editable Files
- lib/project-state.ts
- components/project/ProjectStatusCard.tsx
- app/projects/[id]/page.tsx

## Do Not Edit
- docs/PRD.md
- package.json
- database schema

## Acceptance Criteria
- Parse current_goal, active_task, blockers, next_task from AGENT_STATE.md.
- Display them in a clean card UI.
- Handle missing fields safely.
- No unrelated UI changes.

## Required Report
After completion, create a session report with:
- changed files
- summary
- tests run
- remaining issues
- recommended next task
```

---

### 16.10 핸드오프 생성

한 AI 도구에서 다른 AI 도구로 작업을 넘길 때, 시스템이 핸드오프 문서를 생성한다.

핸드오프 포함 요소:

```txt
From
To
전환 이유
완료된 작업
남은 작업
수정된 파일
다음에 읽어야 할 문서
수정 금지 파일
완료 기준
주의사항
```

---

### 16.11 세션 리포트 저장

각 AI 도구가 작업을 완료하면 결과를 세션 리포트로 저장한다.

저장 항목:

```txt
사용한 도구
작업명
변경 파일
완료 내용
테스트 결과
남은 이슈
다음 추천 작업
```

---

### 16.12 기술 조언자 모드

사용자가 기술적으로 막혔을 때, 시스템은 바로 코딩 지시를 내리지 않고 문제를 설명한다.

출력 구조:

```txt
문제 요약
가능한 원인
선택지
추천안
리스크
다음 작업 프롬프트
```

---

## 17. MVP 범위

### MVP 0: 오픈소스 베이스 검증

목표:

기존 오픈소스 도구 중 어떤 것을 기반으로 삼을지 결정한다.

포함 기능:

```txt
Vibe Kanban 설치 및 사용 테스트
OpenHands 간단 검토
Claude Squad / Metaswarm 구조 참고
각 도구 기능 비교
기존 구현물과의 중복 분석
최종 베이스 도구 선정
```

산출물:

```txt
OPEN_SOURCE_ANALYSIS.md
BASE_TOOL_DECISION.md
IMPLEMENTATION_MAPPING.md
```

---

### MVP 1: 오케스트레이션 레이어 유지/통합

### 목표

자동 실행이 아니라, **기획 → 기술 작업 → AI별 실행 프롬프트 → 핸드오프**를 생성하는 오케스트레이션 레이어를 유지하고 오픈소스 기반 위에 얹을 수 있게 정리한다.

### 포함 기능

```txt
프로젝트 등록
프로젝트 문서 읽기
기획 의도 입력
기술 번역 결과 생성
작업 분해
AI 도구 추천
실행 프롬프트 생성
핸드오프 생성
세션 리포트 입력/저장
다음 작업 추천
```

### 제외 기능

```txt
자체 작업 보드 완전 구현
자체 git worktree 관리
자체 diff/review 시스템
완전 자동 실행
Slack 연동
```

---

## 18. MVP 2차 범위

### 목표

선정된 오픈소스 도구와 Agent Control Room 레이어를 연결한다.

### 포함 후보

```txt
프로젝트 목록 연동
작업 카드 생성 연동
프롬프트를 작업 카드에 첨부
HANDOFF 내용을 작업 카드에 첨부
SESSION_REPORT를 작업 결과로 저장
AI 도구 상태 표시
```

---

## 19. MVP 3차 범위

### 목표

AI 도구별 상태를 바탕으로 작업을 자동 또는 반자동으로 전환한다.

### 포함 후보

```txt
AI 도구별 상태 관리
available / limited / cooling_down / blocked / manual_only 상태 표시
도구 상태 수동 변경
전환 시 HANDOFF 자동 생성
도구별 추천 작업 표시
토큰 회복 후 다시 사용 가능 처리
```

---

## 20. MVP 4차 범위

### 목표

가능한 경우 Claude Code / Codex를 직접 실행한다.

### 포함 후보

```txt
Claude Code CLI Runner
