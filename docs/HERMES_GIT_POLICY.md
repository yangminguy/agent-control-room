# HERMES_GIT_POLICY.md — Git Operations Policy

## Overview

Hermes에게 Git 작업을 허용하되, 작업 유형에 따라 명확한 경계를 설정한다.

원칙:
- **상태 확인 Git 명령** → 직접 실행 가능
- **기록 생성 Git 명령** → 상황에 따라 가능 (보고 필요)
- **히스토리 변경 Git 명령** → Telegram 승인 필수
- **원격 반영 Git 명령** → Telegram 승인 필수

---

## Git Commands by Risk

### Low Risk (직접 실행)

#### 상태 조회
```bash
git status
git diff --stat
git diff <file>
git log --oneline -n 10
git branch
git branch -a
git tag
```

특징:
- 읽기 전용
- 상태 정보만 조회
- 파일 또는 히스토리 변경 없음

#### 로컬 임시 저장
```bash
git stash
git stash list
git stash pop
```

조건:
- 작업 중인 파일을 임시 보관
- 로컬에만 영향
- 되돌리기 가능

---

### Medium Risk (보고 후 진행)

#### 로컬 커밋
```bash
git add <specific-files>
git commit -m "message"
```

조건:
- Phase 내에서 명확한 목표
- 커밋 메시지가 구체적
- 파일 충돌 없음

Telegram 보고:
```md
[Hermes Medium-Risk Git Operation]

작업: git commit
메시지: Phase 15: Add Hermes policies
변경 파일:
- docs/HERMES_BACKGROUND_WORKER.md
- docs/HERMES_TERMINAL_POLICY.md
- docs/HERMES_GIT_POLICY.md

상태: 완료
다음: Codex QA 준비
```

#### 로컬 브랜치 생성
```bash
git checkout -b feature/hermes-integration
git branch feature/new-feature
```

조건:
- 새로운 브랜치 생성
- 기존 브랜치 영향 없음
- 로컬에만 영향

#### 안전한 브랜치 변경
```bash
git checkout feature/hermes-worker
git checkout main
```

조건:
- Working directory 깨끗함
- 대상 브랜치 존재
- Uncommitted changes 없음

---

### High Risk (Telegram 승인 필수)

#### 원격 저장소에 반영
```bash
git push origin <branch>
git push origin --delete <branch>
git push --force
```

위험:
- 원격 저장소 변경
- 다른 사용자에게 영향
- 되돌리기 어려움

Telegram 요청:
```md
[Hermes High-Risk Git Approval]

작업: git push origin hermes-worker
현재 상태: clean
커밋 개수: 3개

커밋 목록:
1. Phase 15: Add Hermes background worker policy
2. Phase 15: Add Hermes terminal policy
3. Phase 15: Add Hermes git policy

검증:
- typecheck: pass
- lint: pass
- build: pass
- tests: pass

승인: approve / reject / explain / control-room
```

#### 병합
```bash
git merge <branch>
git merge --no-ff <branch>
git merge --squash <branch>
```

위험:
- 히스토리 변경
- 충돌 가능성
- 두 브랜치의 코드 병합

Telegram 요청:
```md
[Hermes High-Risk Git Approval]

작업: git merge feature/hermes-integration
소스 브랜치: feature/hermes-integration
대상 브랜치: main

충돌 여부: 없음
병합 전략: no-ff
```

#### 리베이스
```bash
git rebase <branch>
git rebase --interactive
```

위험:
- 커밋 히스토리 완전 변경
- 다른 사용자의 작업과 충돌
- 복잡한 상황

승인 필수 (매우 높은 위험도).

#### 히스토리 변경
```bash
git reset --hard <commit>
git reset --soft <commit>
git clean -fd
```

위험:
- 커밋 완전 삭제 또는 변경
- 작업 손실 가능
- 되돌리기 극도로 어려움

승인 필수 (가장 높은 위험도).

---

## Branch Safety Rules

### 보호된 브랜치

**main, master, production** 에서는 추가 안전 장치:

1. **Merge only**
   - Hermes가 main에 직접 push 불가
   - Pull request 또는 merge 필수

2. **Force push 금지**
   - git push --force 절대 불가

3. **리베이스 금지**
   - 메인 브랜치 리베이스 금지

4. **재설정 금지**
   - git reset 금지

### 안전한 브랜치

**feature/*, develop** 는 더 유연한 정책:

1. **로컬 작업 가능**
   - git add, commit 자유로움
   - git rebase 가능 (Telegram 보고)

2. **강제 푸시 제한**
   - 본인 브랜치만 가능
   - Telegram 승인 후

3. **리셋 제한**
   - 로컬 리셋만 가능
   - 푸시된 코드 리셋은 승인 필요

---

## Conflict Prevention

### 에이전트 간 Git 충돌 방지

**Claude Code와 Hermes**:
- Claude Code: 기능 코드 작성
- Hermes: 문서, 설정, 커밋 메시지
- 충돌 예방: 다른 파일 영역

**예시**:
```
Claude Code 작업 파일:
- app/*/page.tsx
- components/**/*.tsx
- lib/**/*.ts

Hermes 안전 파일:
- docs/**/*.md
- package.json (수정 불가)
- .env* (수정 불가)
```

---

## Commit Message Standards

Hermes가 생성하는 커밋 메시지:

### 형식
```
[Phase] <Title>

<Body (선택사항)>

Co-Authored-By: Hermes <hermes@agent-control-room>
```

### 예시
```
[Phase 15] Add Hermes policies documentation

- Add HERMES_BACKGROUND_WORKER.md
- Add HERMES_TERMINAL_POLICY.md
- Add HERMES_GIT_POLICY.md
- Update AGENTS.md with Hermes role

Co-Authored-By: Hermes <hermes@agent-control-room>
```

### 규칙
- 50자 이내의 짧은 제목
- Phase 번호 포함
- 변경 파일 목록 포함 (자동화 시)
- 명사형 사용

---

## Hermes Cannot Do

### 절대 금지

```bash
git checkout .                # Working directory 리셋
git clean -fd --force        # 파일 삭제
git reset --hard --force HEAD~5  # 5개 커밋 삭제
git push --force             # 강제 푸시
git push origin :branch      # 원격 브랜치 삭제 (강제)
git rebase --interactive     # 대화형 리베이스
```

### 조건부 금지

```bash
git checkout main            # 보호된 브랜치로 변경 (정상)
git push origin main         # 메인에 푸시 (승인 필수)
git merge --no-ff main       # 메인에 병합 (승인 필수)
git reset --soft HEAD~1      # 마지막 커밋 되돌림 (로컬만, 승인 필요)
```

---

## Git Operation Workflow

```
Hermes가 git 작업 수행하려면:

1. 작업 분류
   ├─ Low risk → 직접 실행
   ├─ Medium risk → 실행 + Telegram 보고
   └─ High risk → Telegram 승인 요청

2. 승인 필요 시
   ├─ Telegram으로 상세 요청
   ├─ 사용자 응답 대기
   └─ 응답에 따라 실행 또는 중단

3. 실행 후
   ├─ 성공 → 결과 요약
   ├─ 실패 → 분석 + Agent Control Room 보고
   └─ 충돌 → 중단 + 상세 보고

4. 기록
   └─ Obsidian에 모든 git 작업 기록
```

---

## Obsidian Logging

모든 Git 작업은 Obsidian에 기록된다:

```md
# 2026-05-22 Git Operations

## Commits

### git commit (10:30)
메시지: Phase 15: Add Hermes policies
파일: 3개 추가
상태: success

## Pushes

### git push origin hermes-worker (11:00)
커밋: 3개
승인: approve (Telegram)
상태: success

## Failures

### git merge feature/bugfix (14:30)
오류: Conflict in components/roadmap/RoadmapTimeline.tsx
상태: failed
조치: Agent Control Room 반환
```

---

## See Also

- [[docs/HERMES_TERMINAL_POLICY.md]]
- [[docs/HERMES_BACKGROUND_WORKER.md]]
- [[docs/HERMES_DEPLOYMENT_POLICY.md]]
