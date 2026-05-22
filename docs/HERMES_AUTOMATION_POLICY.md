# HERMES_AUTOMATION_POLICY.md — Automation and Scheduling Policy

## Overview

Hermes는 반복적인 운영 작업을 자동화할 수 있다. 다만 자동화 범위는 명확히 제한된다.

---

## Allowed Automations

### 1. Periodic Log Summaries

**목적**: 주기적으로 작업 로그를 수집하고 요약한다.

**빈도**: 매 1시간 또는 사용자 요청

**작업**:
```bash
pnpm build        # 빌드 결과 수집
pnpm test         # 테스트 결과 수집
pnpm lint         # 린트 결과 수집
pnpm typecheck    # 타입 검사 결과 수집
```

**출력**:
```md
[Hermes Automation Report]
시간: 2026-05-22 15:00

빌드: ✅ pass (2.3s)
테스트: ✅ pass (8개 모두 pass)
린트: ✅ pass (0 issues)
타입: ✅ pass (0 errors)

상태: 양호
```

### 2. Phase Completion Checks

**목적**: 현재 Phase의 완료 여부를 자동으로 확인한다.

**빈도**: 매 10분 (Phase 진행 중일 때)

**확인 사항**:
```
1. 에이전트 작업 완료?
2. 모든 테스트 통과?
3. 빌드 성공?
4. Acceptance criteria 충족?
```

**진행**:
```md
[Hermes Phase Check]

Phase: Phase 15 - Hermes Integration
상태: 진행 중
최근 커밋: Phase 15: Add Hermes policies (30분 전)

체크:
├─ 에이전트 활동: 활성 (Claude Code)
├─ 빌드: pass
├─ 테스트: pass
└─ Acceptance criteria: 3/5 충족

다음 체크: 10분 후
Agent Control Room 완료 보고: 아직 아님
```

### 3. Failure Pattern Detection

**목적**: 반복되는 실패 패턴을 감지하고 보고한다.

**빈도**: 매일 또는 실패 발생 시

**감지 항목**:
```
- 빌드 실패 (3회 이상)
- 특정 테스트 반복 실패
- 타입 체크 실패
- 배포 실패
```

**보고**:
```md
[Hermes Failure Pattern Alert]

패턴: RoadmapTimeline props type error (3회)
원인 추정: components/roadmap/RoadmapTimeline.tsx

최근 발생:
1. 2026-05-22 14:30 - Claude Code
2. 2026-05-22 14:00 - Claude Code
3. 2026-05-21 16:45 - Claude Code

추천:
- Codex에게 isolated type fix 요청
- 또는 Claude Code에게 전체 props 검토 요청

Agent Control Room: 경고 보고 필요
```

### 4. Obsidian Daily Notes

**목적**: 하루의 작업을 Obsidian에 요약 기록한다.

**빈도**: 매일 16:00 자동 생성

**내용**:
```md
# 2026-05-22 Daily Summary

## Status
- Current Phase: Phase 15 - Hermes Integration
- Progress: 70% complete
- Blocker: None

## Completed Tasks
- ✅ HERMES_BACKGROUND_WORKER.md
- ✅ HERMES_TERMINAL_POLICY.md
- ✅ HERMES_GIT_POLICY.md
- ✅ HERMES_DEPLOYMENT_POLICY.md

## In Progress
- 🔄 HERMES_AUTOMATION_POLICY.md
- 🔄 Telegram integration tests

## Failed
- ❌ HERMES_OBSIDIAN_MEMORY_LOOP.md (syntax error, retry scheduled)

## Agent Activity
- Claude Code: 4 commits
- Codex: 2 QA runs (both pass)
- Antigravity: idle

## Build Status
- Typecheck: ✅ pass
- Lint: ✅ pass
- Tests: ✅ 8/8 pass
- Build: ✅ pass

## Next Actions
- Telegram approval for HERMES_OBSIDIAN_MEMORY_LOOP.md retry
- Codex QA for all new documents
- Agent Control Room review
```

### 5. Git Status Monitoring

**목적**: Git 상태를 주기적으로 확인하고 문제를 감지한다.

**빈도**: 매 30분

**확인**:
```
1. Uncommitted changes?
2. Untracked files?
3. Detached HEAD?
4. Conflicts?
5. Branch protection 위반?
```

**경고**:
```md
[Hermes Git Status Alert]

경고: Uncommitted changes detected (5개 파일)

파일:
- docs/HERMES_TELEGRAM_APPROVAL.md (modified)
- components/roadmap/RoadmapTimeline.tsx (modified)
- lib/roadmap-ui-adapter.ts (new)

추천:
- Phase 완료 시 커밋 필요
- 또는 git stash로 임시 저장

Agent Control Room: 확인 필요
```

---

## Forbidden Automations

### ❌ 절대 자동화 금지

```
- 자동 코드 수정 (에이전트가 진행 중)
- 자동 의존성 설치/업데이트
- 자동 DB migration 실행
- 자동 production 배포
- 자동 git push / git merge
- 자동 승인 우회
- 자동 보안 설정 변경
- 자동 환경 변수 변경
```

이들은 모두 사용자 또는 Agent Control Room의 명시적 승인이 필요하다.

---

## Automation Scheduler

### 기본 스케줄

| 작업 | 빈도 | 시간 | 비고 |
|---|---|---|---|
| 로그 요약 | 매 1시간 | 자동 | Phase 진행 중일 때만 |
| Phase 체크 | 매 10분 | 자동 | Phase 진행 중일 때만 |
| 실패 패턴 감지 | 매일 | 16:00 | 자동 |
| Daily note | 매일 | 16:00 | 자동 |
| Git 상태 모니터링 | 매 30분 | 자동 | 항상 |

### 사용자 커스터마이제이션

Agent Control Room이 필요시 자동화 일정을 변경할 수 있다:

```md
[Automation Schedule Update]

변경: 로그 요약 빈도
이전: 매 1시간
신규: 매 30분

사유: Phase 진행 속도 가속화

기효 날짜: 2026-05-22 15:00~
만료 날짜: Phase 15 완료 시
```

---

## Error Handling in Automation

### 자동화 작업 실패

```
1. 작업 실패
   └─ 오류 분석
   
2. 임시 저장
   └─ Obsidian에 오류 기록
   
3. 재시도 일정 결정
   └─ 우선도에 따라 결정
   
4. 보고
   ├─ 낮은 위험: 다음 Daily note에 포함
   ├─ 중간 위험: Telegram 보고
   └─ 높은 위험: Telegram + Agent Control Room
```

예시:
```md
[Hermes Automation Failure]

작업: pnpm test
시간: 2026-05-22 15:30
오류: Timeout after 30s

재시도: 15분 후 자동 재시도
재시도 횟수: 1/3

Obsidian 기록: AgentControlRoom/FailurePatterns/...
```

---

## Metrics and Monitoring

Hermes는 자동화 작업의 성공률을 추적한다:

```json
{
  "automation_metrics": {
    "period": "2026-05-22",
    "log_summaries": {
      "total": 24,
      "success": 24,
      "failed": 0
    },
    "phase_checks": {
      "total": 216,
      "success": 215,
      "failed": 1
    },
    "failure_detection": {
      "patterns_found": 3,
      "alerts_sent": 3
    },
    "daily_notes": {
      "generated": 1,
      "success": 1
    }
  }
}
```

---

## Obsidian Storage for Automation

### 자동화 로그

```
AgentControlRoom/
  Automation/
    Logs/
      2026-05-22.md
      2026-05-21.md
    FailurePatterns/
      build-failures.md
      typecheck-failures.md
    Schedules/
      log-summary-schedule.md
      phase-check-schedule.md
```

---

## See Also

- [[docs/HERMES_OBSIDIAN_MEMORY_LOOP.md]]
- [[docs/HERMES_TELEGRAM_APPROVAL.md]]
- [[docs/HERMES_BACKGROUND_WORKER.md]]
