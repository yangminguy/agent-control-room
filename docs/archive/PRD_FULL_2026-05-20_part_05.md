Codex CLI Runner
작업별 branch/worktree 생성
실행 로그 저장
에러 감지
작업 완료 리포트 생성
```

---

## 21. 핵심 화면

### 21.1 Control Room Dashboard

전체 프로젝트와 AI 도구 상태를 한눈에 본다.

표시 항목:

```txt
등록된 프로젝트 목록
각 프로젝트 현재 상태
진행 중 작업
활성 AI 도구
토큰 cooling_down 상태
막힌 작업
다음 추천 작업
```

---

### 21.2 Project Detail

특정 프로젝트의 현재 상태와 문서를 확인한다.

표시 항목:

```txt
현재 목표
현재 작업
완료된 작업
남은 작업
HANDOFF 상태
TASKS 목록
최근 세션 리포트
오픈소스 작업 카드 연결 상태
다음 추천 작업
```

---

### 21.3 Direction Input

사용자가 기획 방향을 입력한다.

입력 예시:

```txt
“프로젝트별 에이전트 상태를 카드로 보고 싶어.”
```

출력:

```txt
제품 의도
기술 해석
작업 분해
추천 실행 도구
실행 프롬프트
```

---

### 21.4 Technical Translation View

사용자 기획이 어떤 기술 작업으로 변환되었는지 보여준다.

표시 항목:

```txt
원본 사용자 요청
제품 의도
기술 요구사항
필요 작업
예상 리스크
질문 필요 사항
```

---

### 21.5 Agent Routing View

어떤 AI 도구에게 왜 맡기는지 보여준다.

표시 항목:

```txt
작업명
추천 도구
추천 이유
대체 도구
현재 도구 상태
전환 필요 여부
```

---

### 21.6 Prompt Generator View

Claude Code / Codex / Antigravity에 붙여넣을 프롬프트를 보여준다.

기능:

```txt
프롬프트 복사
도구별 프롬프트 포맷 변경
오픈소스 작업 카드에 첨부
수정 가능 파일 표시
수정 금지 파일 표시
완료 기준 확인
```

---

### 21.7 Handoff View

AI 도구 간 작업 인수인계를 관리한다.

표시 항목:

```txt
From Tool
To Tool
전환 이유
현재까지 완료된 내용
남은 작업
주의사항
다음 프롬프트
관련 작업 카드
```

---

### 21.8 Open-source Integration View

오픈소스 베이스와 Agent Control Room 레이어의 연결 상태를 보여준다.

표시 항목:

```txt
선정된 베이스 도구
연동 가능한 기능
중복 기능
커스텀 필요 기능
현재 연동 상태
```

---

### 21.9 Advisor Mode

사용자의 기술 질문에 대해 이해하기 쉬운 설명과 실행 선택지를 제공한다.

입력 예시:

```txt
“이 에러가 왜 나는지 모르겠어.”
“이건 Claude Code가 해야 해, Codex가 해야 해?”
“Supabase 구조를 바꾸는 게 맞아?”
```

출력:

```txt
원인
선택지
추천
리스크
실행 프롬프트
```

---

## 22. 데이터 모델 초안

### 22.1 Project

```ts
type Project = {
  id: string;
  name: string;
  path: string;
  description?: string;
  baseTool?: "vibe-kanban" | "openhands" | "custom" | "none";
  defaultAgent: AgentType;
  docs: ProjectDoc[];
  createdAt: string;
  updatedAt: string;
};
```

---

### 22.2 AgentType

```ts
type AgentType = "claude-code" | "codex" | "antigravity";
```

---

### 22.3 AgentStatus

```ts
type AgentStatus = {
  agent: AgentType;
  status: "available" | "limited" | "cooling_down" | "blocked" | "manual_only";
  reason?: string;
  lastUsedAt?: string;
  nextAvailableAt?: string;
};
```

---

### 22.4 Task

```ts
type Task = {
  id: string;
  projectId: string;
  baseToolTaskId?: string;
  title: string;
  userIntent: string;
  technicalSummary: string;
  status: "draft" | "planned" | "in_progress" | "blocked" | "completed";
  recommendedAgent: AgentType;
  priority: "P0" | "P1" | "P2";
  acceptanceCriteria: string[];
  createdAt: string;
  updatedAt: string;
};
