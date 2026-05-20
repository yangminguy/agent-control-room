```txt
제품 UI 베이스라기보다 프레임워크/워크플로우 참고 자료에 가까움
```

---

## 9. 오픈소스 선정 기준

| 기준 | 설명 |
|---|---|
| 웹 UI 여부 | 에이전트와 작업 상태를 시각화할 수 있는가 |
| 코딩 에이전트 연동성 | Claude Code, Codex, Antigravity 또는 유사 도구와 연결 가능한가 |
| 작업 보드 구조 | 프로젝트별 작업을 카드/큐 형태로 관리할 수 있는가 |
| Git / worktree 지원 | 병렬 작업과 안전한 브랜치 분리가 가능한가 |
| 커스터마이징 난이도 | 사용자만의 오케스트레이션 레이어를 붙이기 쉬운가 |
| 문서 기반 맥락 연동 | `CLAUDE.md`, `TASKS.md`, `HANDOFF.md` 같은 문서를 읽고 반영할 수 있는가 |
| 로컬 실행 가능성 | 사용자의 로컬 프로젝트와 안전하게 연결 가능한가 |
| 확장성 | Slack, GitHub, Runner, 토큰 상태 관리로 확장 가능한가 |

---

## 10. 주요 사용자

### 1차 사용자

AI 코딩 도구를 활용해 제품을 만들고 싶지만, 개발 세부사항을 직접 통제하기 어려운 PM/기획자/비개발자형 사용자.

### 사용자 특성

```txt
제품 방향은 명확히 말할 수 있음
기술 구현 세부사항은 잘 모름
Claude Code, Codex, Antigravity 같은 도구를 활용함
프로젝트별 문서와 작업 기록을 중요하게 생각함
AI를 개발팀처럼 운영하고 싶어함
토큰/사용량 제한으로 개발 흐름이 끊기는 문제를 경험함
```

---

## 11. 핵심 사용자 역할

### 사용자가 담당하는 것

```txt
제품 방향 설정
기능의 필요성 설명
우선순위 판단
결과물 피드백
최종 승인
```

예시:

```txt
“프로젝트별 에이전트 상태가 한눈에 보였으면 좋겠어.”
“나는 기획 방향만 말하고, 기술 작업은 시스템이 나눠줬으면 좋겠어.”
“Claude Code 토큰이 다 되면 Codex나 Antigravity로 넘겨서 개발이 멈추지 않았으면 좋겠어.”
```

### Agent Control Room이 담당하는 것

```txt
요구사항 해석
기술 작업 정의
작업 분해
우선순위 정리
도구 선택
프롬프트 작성
핸드오프 작성
결과 검토
다음 작업 추천
기술 조언
```

### 오픈소스 베이스가 담당하는 것

```txt
작업 보드
작업 카드
에이전트 실행 흐름
worktree 또는 브랜치 기반 분리
변경 사항 확인
리뷰 흐름
```

### 실행 AI 도구가 담당하는 것

| 도구 | 역할 |
|---|---|
| Claude Code | 구조 설계, 문서 기반 판단, 복잡한 리팩토링 |
| Codex | 명확한 구현, 버그 수정, 테스트, 타입 에러 해결 |
| Antigravity | UI 프로토타입, 멀티파일 구현, 시각적 작업 |

---

## 12. 핵심 가치 제안

### 사용자 관점

사용자는 더 이상 AI 코딩 도구마다 같은 설명을 반복하지 않아도 된다.

사용자는 개발 세부사항을 모두 몰라도, 제품 방향을 말하면 시스템이 실행 가능한 작업으로 바꿔준다.

사용자는 토큰이 다 되었다고 개발을 멈추지 않아도 된다.

사용자는 프로젝트가 어디까지 진행됐는지 한눈에 볼 수 있다.

### 제품 관점

Agent Control Room은 AI 코딩 도구 위에 올라가는 **운영 레이어**다.

Claude Code, Codex, Antigravity가 각각의 개발자이고 Vibe Kanban 같은 오픈소스 도구가 작업 보드라면, Agent Control Room은 기술 PM이자 프로젝트 매니저다.

---

## 13. 핵심 사용자 시나리오

### 시나리오 1. 기획 의도를 기술 작업으로 변환

사용자 입력:

```txt
프로젝트별 에이전트 상태가 한눈에 보였으면 좋겠어.
```

시스템 출력:

```txt
제품 의도:
사용자가 프로젝트별 진행 상태와 현재 활성 에이전트를 쉽게 이해하게 한다.

기술 해석:
프로젝트 문서에서 current_goal, active_task, current_agent, blockers, next_task를 추출해야 한다.

작업 분해:
1. AGENT_STATE.md 표준 스키마 정의
2. 프로젝트 상태 parser 구현
3. ProjectStatusCard UI 구현
4. AgentStatusCard UI 구현
5. 프로젝트 상세 페이지에 연결

추천 실행자:
Codex

이유:
파일 파싱과 UI 연결 중심의 명확한 구현 작업이기 때문.
```

### 시나리오 2. Claude Code 토큰 소진 후 Codex로 전환

현재 상태:

```txt
Claude Code 사용량 한계 접근
구조 설계는 완료
구현 작업이 남아 있음
```

시스템 행동:

```txt
1. Claude Code 작업 결과 요약
2. 수정된 파일 목록 정리
3. 남은 작업 정리
4. Codex에게 전달할 HANDOFF 생성
5. Codex용 실행 프롬프트 생성
```

### 시나리오 3. Vibe Kanban 기반 작업 카드로 연결

현재 상태:

```txt
사용자가 새 기능 방향을 입력
Vibe Kanban을 베이스 도구로 검토 또는 사용 중
Agent Control Room이 기술 작업을 3개로 분해
```

시스템 행동:

```txt
1. 각 작업을 카드 단위로 정리
2. 카드별 추천 AI 도구와 이유 표시
3. 카드에 붙일 실행 프롬프트 생성
4. HANDOFF.md / TASKS.md와 연결할 맥락 생성
5. 오픈소스 베이스에서 중복 처리할 기능과 직접 구현할 기능 구분
```

### 시나리오 4. 사용자가 기술적으로 막힌 부분을 질문

사용자 입력:

```txt
Supabase RLS 때문에 저장이 안 되는 것 같은데 이게 왜 그런 거야?
```

시스템 출력:

```txt
가능성 높은 원인:
1. insert policy 없음
2. auth.uid() 조건 불일치
3. anon role 권한 부족
4. 서버 API와 클라이언트 직접 insert 방식 혼재

선택지:
A. MVP용 임시 policy
B. 로그인 사용자 기반 strict policy
C. server action에서 service role 사용

추천:
현재 MVP라면 B안을 우선 검토하고, 관리자 전용 저장은 C안으로 분리하는 것이 좋음.

다음 작업:
Codex에게 RLS policy와 insert flow를 점검하도록 요청.
```

---

## 14. 제품 구조

### 전체 구조

```txt
[User Direction]
        ↓
[Agent Control Room Orchestrator Layer]
        ↓
[Open-source Base: Vibe Kanban or Similar]
        ↓
[Claude Code / Codex / Antigravity]
        ↓
[Git / Worktree / Local Project Files]
```

### Orchestrator Layer 내부 흐름

```txt
User Direction Input
