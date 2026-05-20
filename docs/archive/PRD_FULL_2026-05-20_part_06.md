```

---

### 22.5 Handoff

```ts
type Handoff = {
  id: string;
  projectId: string;
  taskId: string;
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  completedWork: string[];
  remainingWork: string[];
  changedFiles: string[];
  forbiddenFiles: string[];
  nextPrompt: string;
  createdAt: string;
};
```

---

### 22.6 SessionReport

```ts
type SessionReport = {
  id: string;
  projectId: string;
  taskId: string;
  agent: AgentType;
  changedFiles: string[];
  summary: string;
  testsRun: string[];
  remainingIssues: string[];
  recommendedNextTask: string;
  createdAt: string;
};
```

---

### 22.7 OpenSourceBase

```ts
type OpenSourceBase = {
  id: string;
  name: "vibe-kanban" | "openhands" | "claude-squad" | "metaswarm" | "custom";
  status: "evaluating" | "selected" | "rejected" | "reference_only";
  strengths: string[];
  limitations: string[];
  integrationNotes: string[];
};
```

---

## 23. 핵심 로직

### 23.1 Orchestration Flow

```txt
1. 사용자가 프로젝트와 기획 방향 입력
2. 프로젝트 문서 로드
3. 오픈소스 베이스 상태 확인
4. 현재 상태 요약
5. 사용자 요청을 제품 의도로 해석
6. 기술 요구사항으로 변환
7. 작업 단위로 분해
8. 오픈소스 작업 카드 생성 또는 연결
9. AI 도구 추천
10. 실행 프롬프트 생성
11. 사용자가 실행 또는 Runner가 실행
12. 결과 입력/수집
13. 세션 리포트 생성
14. 다음 작업 또는 핸드오프 생성
```

---

### 23.2 Open-source Decision Flow

```txt
1. Vibe Kanban 설치 및 테스트
2. 현재 필요한 기능과 비교
3. 중복 기능 표시
4. 부족한 기능 표시
5. 기존 구현물 중 유지할 기능 결정
6. 커스텀 레이어 설계
7. 최종 베이스 도구 선정
```

---

### 23.3 Agent Routing Logic

```txt
if 작업이 구조 설계/복잡한 판단:
  Claude Code 추천

else if 작업이 명확한 구현/버그 수정/테스트:
  Codex 추천

else if 작업이 UI/프로토타입/멀티파일 화면 구현:
  Antigravity 추천

else:
  Claude Code로 먼저 분석 후 후속 도구 추천
```

---

### 23.4 Token Rotation Logic

초기 MVP에서는 자동 토큰 감지를 하지 않는다.

대신 사용자가 수동으로 상태를 설정할 수 있다.

```txt
Claude Code: cooling_down
Codex: available
Antigravity: available
```

시스템은 이 상태를 반영해 작업을 배정한다.

예:

```txt
설계 작업이지만 Claude Code가 cooling_down 상태라면:
1. Antigravity에 임시 구조 분석 요청
2. Codex에 구현 작업만 선배정
3. Claude Code 회복 후 최종 리뷰 예약
```

---

## 24. 우선순위

### P0

```txt
오픈소스 베이스 분석
Vibe Kanban 검토
기존 구현물 매핑
기획 입력
기술 번역
작업 분해
AI 도구 추천
프롬프트 생성
핸드오프 생성
세션 리포트 저장
```

### P1

```txt
프로젝트 문서 파싱
Agent 상태 관리
수동 cooling_down 설정
프로젝트 상태 대시보드
TASKS.md 파싱
HANDOFF.md 파싱
AGENT_STATE.md 파싱
오픈소스 작업 카드 연동
기술 조언자 모드
```

### P2

```txt
Claude Code CLI 자동 실행
Codex CLI 자동 실행
작업별 branch/worktree 생성
Git diff 요약
실패 감지
```

### P3

```txt
Antigravity 자동 연동
토큰/사용량 자동 감지
자동 라우팅
Slack/메신저 알림
자동 PR 생성
팀 협업 기능
다중 사용자
```

---

## 25. 성공 지표

### 정성 지표

```txt
기존 오픈소스 위에 얹는 방향이 가능한가?
기존 구현물을 버리지 않고 재사용할 수 있는가?
사용자가 기술 세부사항을 몰라도 작업을 시작할 수 있는가?
툴을 전환해도 맥락이 유지되는가?
프롬프트를 복사해 바로 사용할 수 있는가?
작업 결과가 다음 작업으로 자연스럽게 이어지는가?
```

### 정량 지표

```txt
기획 입력 → 실행 프롬프트 생성까지 걸리는 시간
툴 전환 시 재설명해야 하는 양
재사용 가능한 기존 구현물 비율
오픈소스 기능과 중복 제거 비율
작업당 생성되는 핸드오프 수
세션 리포트 저장률
프롬프트 재사용률
작업 완료율
```

---

## 26. 리스크와 대응

### 리스크 1. 오픈소스 베이스와 기존 구현물이 중복될 수 있음

대응:

```txt
IMPLEMENTATION_MAPPING.md를 먼저 작성
중복 기능은 제거 또는 후순위화
Agent Control Room은 상위 레이어에 집중
```

### 리스크 2. Vibe Kanban이 원하는 방식과 맞지 않을 수 있음

대응:

```txt
MVP 0에서 빠르게 설치/검토
