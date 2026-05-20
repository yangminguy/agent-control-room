        ↓
Project Context Reader
        ↓
Technical Translator
        ↓
Task Decomposer
        ↓
Agent Router
        ↓
Prompt Generator
        ↓
Handoff Manager
        ↓
Session Report Manager
```

### 역할 분리

| 계층 | 역할 |
|---|---|
| User | 제품 방향, 기획 의도, 우선순위 결정 |
| Agent Control Room Layer | 기획 번역, 작업 분해, AI 라우팅, 프롬프트 생성, 핸드오프 |
| Open-source Base | 작업 보드, 실행 관리, worktree, diff/review |
| AI Coding Tools | 실제 코드 작성, 수정, 테스트, 리팩토링 |
| Project Docs | 프로젝트의 공통 기억과 작업 기준 |

---

## 15. 기존 PRD 기반 작업의 재해석

기존 PRD 기반으로 이미 진행된 작업은 폐기하지 않는다.

기존 작업은 Agent Control Room의 **Orchestrator Layer**로 재해석한다.

### 유지할 기능

```txt
기획 의도 입력
기술 작업 변환
작업 분해
AI 도구 추천
실행 프롬프트 생성
HANDOFF 생성
SESSION_REPORT 저장
Agent 상태 관리
Token cooling_down 개념
기술 조언자 모드
```

### 조정할 기능

```txt
자체 작업 보드
자체 프로젝트 관리 UI
자체 실행 관리 기능
자체 diff/review 기능
```

이 기능들은 오픈소스 베이스와 중복될 수 있으므로, 직접 만들기 전에 오픈소스 기능과 비교한다.

### 새로 추가할 기능

```txt
오픈소스 베이스 기능 분석
Vibe Kanban 연동 가능성 검토
기존 구현물과 오픈소스 기능 매핑
오픈소스 위에 붙일 커스텀 레이어 설계
```

---

## 16. 주요 기능

### 16.1 오픈소스 베이스 분석

선택한 오픈소스 도구가 어떤 기능을 제공하는지 분석한다.

분석 항목:

```txt
프로젝트 등록 방식
작업 카드 구조
AI 에이전트 실행 방식
지원하는 코딩 도구
worktree / branch 처리 방식
diff/review 흐름
플러그인/확장 가능성
데이터 저장 방식
UI 커스터마이징 가능성
```

산출물:

```txt
OPEN_SOURCE_ANALYSIS.md
```

---

### 16.2 기존 구현물 매핑

기존 PRD 기반으로 만든 기능과 오픈소스 베이스 기능을 비교한다.

분류:

```txt
유지
통합
제거
후순위
새로 구현
```

산출물:

```txt
IMPLEMENTATION_MAPPING.md
```

---

### 16.3 프로젝트 등록

사용자는 자신이 관리하는 프로젝트를 등록한다.

입력 정보:

```txt
프로젝트 이름
프로젝트 경로
사용 중인 문서 목록
기본 실행 도구
현재 상태
```

예시:

```json
{
  "name": "portfolio",
  "path": "/Users/yangwonmin/Desktop/portfolio",
  "docs": [
    "CLAUDE.md",
    "TASKS.md",
    "HANDOFF.md",
    "docs/PRD.md",
    "docs/ARCHITECTURE.md"
  ],
  "defaultAgent": "claude-code"
}
```

---

### 16.4 프로젝트 문서 읽기

시스템은 프로젝트 안의 핵심 문서를 읽고 현재 상태를 파악한다.

우선 읽을 문서:

```txt
CLAUDE.md
AGENT_STATE.md
TASKS.md
HANDOFF.md
docs/PRD.md
docs/ARCHITECTURE.md
```

목적:

```txt
현재 목표 파악
진행 중 작업 파악
완료된 작업 파악
막힌 지점 파악
수정 금지 영역 파악
다음 작업 후보 파악
```

---

### 16.5 기획 의도 입력

사용자는 개발 지시를 기술적으로 자세히 쓰지 않고, 제품 관점으로 입력한다.

예시:

```txt
“AI 에이전트들이 지금 어떤 일을 하고 있는지 카드 형태로 보고 싶어.”
“토큰이 다 되면 다음 AI로 넘길 수 있게 해줘.”
“내가 기획 방향을 입력하면 알아서 기술 작업으로 바꿔줬으면 좋겠어.”
```

---

### 16.6 기술 번역

시스템은 사용자의 기획 언어를 기술 요구사항으로 변환한다.

출력 형식:

```txt
제품 의도
기술 해석
필요 데이터
필요 화면
필요 API
작업 단위
예상 리스크
질문 필요 여부
```

---

### 16.7 작업 분해

기술 요구사항을 실행 가능한 작은 작업 단위로 나눈다.

작업 단위 예시:

```txt
1. Agent 상태 타입 정의
2. AGENT_STATE.md parser 구현
3. AgentStatusCard 컴포넌트 구현
4. ProjectDetail 페이지에 연결
5. fallback 상태 처리
6. typecheck 실행
```

---

### 16.8 AI 도구 선택

작업 유형에 따라 적절한 AI 코딩 도구를 추천한다.

| 작업 유형 | 추천 도구 |
|---|---|
| 제품 구조 설계 | Claude Code |
| PRD/문서 기반 판단 | Claude Code |
