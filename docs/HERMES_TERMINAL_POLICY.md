# HERMES_TERMINAL_POLICY.md — Terminal Usage Policy

## Overview

Hermes에게 terminal 기능을 활성화하되, 명령의 위험도에 따라 자동 실행, 보고, 승인 필요로 분류한다.

---

## Risk Classification

### Low Risk (자동 실행)

Hermes가 직접 실행 가능하다. 사용자 승인 불필요.

#### 상태 확인 명령
```bash
git status
git diff --stat
git log --oneline -n 10
git branch
```

특징:
- 파일 변경 없음
- 로컬 상태만 조회
- 되돌리기 불필요

#### 검증 명령
```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test -- --watch=false
```

특징:
- 기존 코드만 검증
- 파일 변경 없음
- 여러 번 실행 가능

#### 빌드 명령
```bash
pnpm build
pnpm build-storybook
```

특징:
- 컴파일 결과만 생성
- 배포 미포함
- 실패해도 안전

#### 배포 상태 확인
```bash
vercel --version
vercel projects
vercel env list
```

특징:
- 조회만 수행
- 변경 없음
- 정보 수집용

---

### Medium Risk (보고 후 진행)

Hermes가 실행 가능하지만, 실행 후 Telegram으로 요약 보고한다.

#### 로컬 기록 생성
```bash
git add <specific-files>
git commit -m "message"
git stash
```

조건:
- Phase 내 명확한 목표
- 파일 충돌 없음
- 되돌리기 쉬움

예시:
```
[Hermes Medium-Risk Report]

작업: git commit
메시지: Phase 15: Add Hermes terminal policy docs
변경 파일: 3개
- docs/HERMES_TERMINAL_POLICY.md (new)
- docs/HERMES_GIT_POLICY.md (new)
- AGENTS.md (updated)

상태: 완료
다음 추천: Codex QA 준비
```

#### 안전한 브랜치 변경
```bash
git checkout feature/hermes-worker
git checkout -b feature/new-feature
```

조건:
- 작업 영역이 깨끗함 (uncommitted changes 없음)
- 안전한 브랜치 목표
- 되돌리기 가능

#### Preview 배포
```bash
vercel deploy --prebuilt
```

조건:
- Prebuilt 빌드만 배포
- Preview URL 생성
- Production 미포함

---

### High Risk (Telegram 승인 필수)

Hermes는 Telegram으로 사용자에게 승인 요청 후 실행한다.

#### 원격 저장소 작업
```bash
git push origin <branch>
git push origin --delete <branch>
git push --force
```

위험:
- 원격 저장소 변경
- 다른 사용자에게 영향
- 되돌리기 어려움

#### 히스토리 변경
```bash
git merge <branch>
git rebase <branch>
git reset --hard <commit>
git clean -fd
```

위험:
- 커밋 히스토리 변경
- 작업 손실 가능
- 충돌 가능성

#### 의존성 변경
```bash
pnpm add <package>
pnpm remove <package>
pnpm install
```

위험:
- 패키지 버전 변경
- 보안 영향
- 빌드 실패 가능

#### Production 배포
```bash
vercel deploy --prod
vercel rollback
```

위험:
- 실제 사용자에게 영향
- 데이터 변경 가능
- 서비스 중단 가능

#### DB 작업
```bash
prisma migrate deploy
prisma db seed
```

위험:
- 데이터 변경
- 되돌리기 어려움
- 운영 영향

#### 환경 변수 변경
```bash
vercel env set KEY=value
vercel env set --environment=production KEY=value
```

위험:
- 설정 변경
- 보안 영향
- 서비스 동작 변경

---

## Telegram Approval Flow

### 요청 형식

```md
[Hermes Approval Request]

작업: <명령어>
위험도: high
이유: <위험 설명>

현재 상태:
- typecheck: pass
- lint: pass
- build: pass
- tests: pass

변경 내용:
- 파일 리스트
- 주요 변경

추천:
<상황별 추천>

응답 옵션:
1. approve — 승인, 바로 실행
2. reject — 거절, 실행 안 함
3. preview first — 미리 보기 필요 (배포 시)
4. explain — 더 자세한 설명
5. control-room — Agent Control Room에 문의
```

### 응답 처리

| 응답 | Hermes 동작 | 다음 단계 |
|---|---|---|
| approve | 명령 실행 | 결과 보고 |
| reject | 명령 취소 | Agent Control Room 반환 |
| preview first | preview 배포 생성 | URL 전송 후 재승인 요청 |
| explain | 자세한 설명 생성 | 재승인 요청 |
| control-room | 중단 | Agent Control Room에 보고 |

---

## Command Whitelist by Phase

### 모든 Phase에서 항상 가능
```bash
git status
git diff --stat
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

### Implementation Phase
```bash
git add <files>
git commit -m "message"
git stash
git checkout feature/*
```

### QA Phase
```bash
pnpm test -- --watch=false
git log --oneline -n 10
```

### Deployment Phase
```bash
vercel deploy --prebuilt    # 사전 승인 필요
vercel deploy --prod         # Telegram 승인 필수
vercel env list
```

---

## Failure Handling

### 명령 실패 시 Hermes 동작

```
1. 실패 원인 분석
   - stderr 내용 추출
   - 일반적인 오류 패턴 판단
   
2. 요약 생성
   - 실패 유형 분류
   - 추천 해결책 제시
   
3. 보고
   - Telegram 실패 보고
   - 또는 Agent Control Room에 Orchestration Packet 반환
```

예시:
```md
[Hermes Failure Report]

실패 명령: pnpm build
실패 원인: Type error in components/roadmap/RoadmapTimeline.tsx

오류 내용:
Property 'roadmapStages' is missing in props

영향 파일:
- components/roadmap/RoadmapTimeline.tsx
- lib/roadmap-ui-adapter.ts

추천:
Codex에게 type fix 요청하거나, Claude Code에게 전체 컨텍스트 검토 요청

Agent Control Room으로 Orchestration Packet 반환
```

---

## Safe Guards

### 명령 실행 전 안전 확인

1. **Working directory 확인**
   - 프로젝트 루트인지 확인
   - 잘못된 경로에서 실행 방지

2. **Branch 확인**
   - main branch에서 위험 명령 실행 방지
   - 예: git push origin main 은 특별 승인 필요

3. **Uncommitted changes 확인**
   - git 명령 전에 상태 확인
   - 충돌 가능성 미리 감지

4. **Phase 확인**
   - 현재 Phase에 맞는 명령만 실행
   - 위험한 순서 변경 방지

### 금지된 명령

```bash
# 절대 금지
rm -rf                      # 데이터 손실
git push --force           # 히스토리 덮어쓰기
git reset --hard --force   # 작업 손실
sudo                       # 권한 상승
```

---

## Logging and Auditing

모든 명령 실행을 기록한다:

```json
{
  "timestamp": "2026-05-22T10:30:00Z",
  "command": "git push origin hermes-worker",
  "risk_level": "high",
  "approval_type": "telegram",
  "approval_response": "approve",
  "approval_timestamp": "2026-05-22T10:29:00Z",
  "exit_code": 0,
  "stdout": "...",
  "stderr": "",
  "obsidian_note": "AgentControlRoom/TelegramApprovals/2026-05-22-git-push.md"
}
```

이 로그는 Obsidian에 저장되어 향후 분석에 사용된다.

---

## See Also

- [[docs/HERMES_GIT_POLICY.md]]
- [[docs/HERMES_DEPLOYMENT_POLICY.md]]
- [[docs/HERMES_BACKGROUND_WORKER.md]]
