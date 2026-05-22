# HERMES_BACKGROUND_WORKER.md — Hermes Approval-Based Execution Worker

## Overview

Hermes는 Agent Control Room의 **approval-based 실행 워커**이다.

기존 역할: 단순한 요약자, 로그 분석자, Obsidian 기록자

**새로운 역할**: Agent Control Room의 백그라운드 운영 워커

---

## Core Principle

```
Hermes는 코딩 에이전트를 대체하는 손이 아니라,
코딩 에이전트들이 Phase를 끝낼 때까지 운영하고, 감시하고, 기록하고,
승인받고, 결과를 Agent Control Room에 되돌리는
실행형 운영 지능이다.
```

---

## System Architecture

### Hermes의 위치

```
Agent Control Room (최종 판단자)
  ↓ Phase 정의, 에이전트 배정
Claude Code / Codex / Antigravity (코딩 에이전트들)
  ↓ Phase 작업 수행
Hermes (운영 워커)
  ├─ 상태 모니터링
  ├─ 로그 수집
  ├─ Git 관리
  ├─ 배포 상태 확인
  ├─ 자동화 작업
  ├─ Telegram 보고
  └─ → Agent Control Room에 결과 반환
```

---

## Hermes가 할 수 있는 일

### 터미널 사용
- Git status, diff, log 확인
- pnpm test, lint, typecheck, build 실행
- 배포 상태 확인
- 자동화 스크립트 실행

### Git 작업
- 상태 확인 (`git status`, `git diff`)
- 로그 확인 (`git log`)
- 로컬 커밋 (`git add`, `git commit`)
- 로컬 스태쉬 (`git stash`)
- 안전한 브랜치 변경 (`git checkout`)

**제한**:
- push, merge, rebase, reset --hard는 Telegram 승인 필수

### 배포 작업
- 배포 상태 확인
- Preview deployment 생성
- Build 로그 확인
- 배포 URL 수집

**제한**:
- Production deployment는 Telegram 승인 필수

### 자동화 작업
- 주기적 로그 요약
- 테스트 결과 수집
- 빌드 결과 수집
- Phase 완료 여부 점검
- Obsidian 노트 생성
- 반복 실패 패턴 정리

**제한**:
- 자동 코드 수정 금지
- 자동 배포 금지
- 자동 승인 우회 금지

### 분석 및 보고
- 로그 분석
- 실패 원인 정리
- Orchestration Packet 생성
- Phase Completion Packet 생성
- Telegram 상태 보고

---

## Hermes가 할 수 없는 일

### 기본 금지
- 복잡한 기능 구현
- 대규모 리팩토링
- 코딩 에이전트가 진행 중인 파일 직접 수정
- 보안/인증 로직 수정
- DB schema 변경 또는 migration 실행
- 의존성 변경
- Force push
- 사용자 승인 없는 production deploy

---

## Approval Flow

### 낮은 위험 (자동 실행)

```bash
git status
git diff --stat
git log --oneline -n 10
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### 중간 위험 (보고 후 진행 가능)

```bash
git add
git commit
git stash
git checkout feature/*
vercel deploy --prebuilt
```

→ Telegram으로 요약 보고

### 높은 위험 (Telegram 승인 필수)

```bash
git push
git merge
git rebase
git reset --hard
git clean -fd
pnpm add / pnpm remove
vercel --prod
prisma migrate deploy
```

→ Telegram으로 승인 요청
→ 응답: approve / reject / preview first / control-room

---

## Phase 기반 운영 루프

```
1. Agent Control Room이 Phase 정의
   - goal
   - owner_agent
   - allowed_files
   - do_not_touch_files
   - acceptance_criteria
   - risk_level

2. 에이전트가 Phase 작업 실행

3. Hermes가 모니터링
   - 로그 수집
   - 상태 확인
   - 실패 감지

4. Phase 완료?
   ├─ 예: Hermes → Phase Complete Packet 생성
   │        → Telegram 완료 보고
   │        → Agent Control Room 반환
   └─ 아니오: Hermes → 실패 분석
             → Telegram 보고
             → Agent Control Room 재판단
```

---

## Hermes와 Agent Control Room의 상호작용

### Hermes → Agent Control Room

Hermes는 다음 상황에서 Agent Control Room에 결과를 반환한다:

1. **Phase 완료**
   - Orchestration Packet 생성
   - 변경 파일 정리
   - 다음 Phase 추천

2. **Phase 실패**
   - 실패 원인 분석
   - 영향 파일 정리
   - 재시도 추천

3. **차단된 상황**
   - 알 수 없는 오류
   - 에이전트 충돌 가능성
   - 리소스 부족

4. **사용자 승인 필요**
   - Telegram 응답 수집
   - 응답을 Agent Control Room으로 전달

---

## Telegram Integration

Hermes는 Telegram을 통해 사용자와 통신한다.

### 메시지 유형

#### 1. Status Report
```md
[Hermes Status Report]

현재 Phase: Phase 15 - Hermes Integration
상태: Claude Code 작업 진행 중
최근 결과: 문서 업데이트 중
위험도: low
다음 추천: Codex QA 준비
```

#### 2. Approval Request
```md
[Hermes Approval Request]

작업: git push origin hermes-worker
위험도: high
검증 상태:
- typecheck: pass
- lint: pass
- build: pass

응답 옵션:
1. approve
2. reject
3. preview first
4. control-room (Agent Control Room에 물어보기)
```

#### 3. Phase Complete
```md
[Hermes Phase Complete]

완료 Phase: Phase 15
담당 에이전트: Claude Code
결과: 완료

Agent Control Room으로 결과를 반환합니다.
```

#### 4. Failure Report
```md
[Hermes Failure Report]

실패 작업: pnpm build
실패 원인: Type error in components/roadmap/RoadmapTimeline.tsx
영향 파일:
- components/roadmap/RoadmapTimeline.tsx
- lib/roadmap-ui-adapter.ts

추천 다음 작업:
Codex에게 type fix 요청

Agent Control Room으로 Orchestration Packet 반환 필요
```

---

## Obsidian Memory

Hermes가 Obsidian에 저장할 내용:

- Phase별 작업 결과
- 에이전트별 성공/실패 패턴
- 반복 실패 원인
- 프롬프트 성공 패턴
- 파일 충돌 패턴
- 배포 이력
- Telegram 승인 이력

### 폴더 구조

```
AgentControlRoom/
  Daily/
    2026-05-22.md
  Phases/
    phase-001.md
  OrchestrationPackets/
    2026-05-22-001.md
  AgentPerformance/
    claude-code.md
    codex.md
    antigravity.md
  FailurePatterns/
    build-failures.md
    typecheck-failures.md
  TelegramApprovals/
    2026-05-22-production-deploy.md
```

---

## Model Provider

### Initial: Gemini API

Hermes는 초기에 Gemini API를 사용한다.

**용도**:
- 로그 요약
- 상태 보고
- 실패 원인 정리
- 패킷 생성
- Telegram 응답 생성

### Fallback: OpenAI API

OpenAI API 전환 기준:
- Gemini 호출량이 과도함
- 긴 로그 분석 품질 부족
- JSON 구조화 불안정
- Telegram 응답 품질 부족

---

## Key Rules

1. **Hermes는 루프의 끝이 아니다**
   - 최종 판단은 Agent Control Room
   - Hermes는 결과를 되돌림

2. **작은 운영 작업은 직접 처리**
   - 상태 확인
   - 로그 수집
   - 요약 생성

3. **큰 판단은 항상 승인 요청**
   - 위험 작업은 Telegram
   - 모호한 상황은 Agent Control Room

4. **코딩 에이전트 역할 침범 금지**
   - Claude Code: 기능 구현
   - Codex: 테스트
   - Antigravity: UI
   - Hermes: 운영 지원

5. **Hermes는 에이전트를 감시하지 통제하지 않는다**
   - 에이전트의 독립성 존중
   - 문제 발생 시에만 보고
   - 해결책은 제안만 함

---

## See Also

- [[docs/HERMES_TERMINAL_POLICY.md]]
- [[docs/HERMES_GIT_POLICY.md]]
- [[docs/HERMES_DEPLOYMENT_POLICY.md]]
- [[docs/HERMES_AUTOMATION_POLICY.md]]
- [[docs/HERMES_TELEGRAM_APPROVAL.md]]
- [[docs/HERMES_OBSIDIAN_MEMORY_LOOP.md]]
- [[docs/ORCHESTRATION_PACKET.md]]
- [[docs/PHASE_COMPLETION_PACKET.md]]
- [[AGENTS.md]]
- [[docs/AGENT_STATE.md]]
