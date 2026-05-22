# HERMES_TELEGRAM_APPROVAL.md — Telegram Approval and Communication Protocol

## Overview

Hermes는 Telegram을 통해 사용자와 통신한다.

**Discord는 사용하지 않는다. Telegram만 사용한다.**

---

## Communication Patterns

### 1. Status Reports

**목적**: 주기적으로 작업 상태를 보고한다.

**빈도**: Phase 진행 중 매 1시간 또는 중요 변경 시

**형식**:
```md
[Hermes Status Report]

⏰ 현재 시간: 2026-05-22 15:30
📍 현재 Phase: Phase 15 - Hermes Integration
🔄 상태: Claude Code 작업 진행 중

📊 진행률:
- 문서 생성: 8/12 완료 (67%)
- 타입 정의: 완료
- 테스트: 대기 중

✅ 성공:
- HERMES_BACKGROUND_WORKER.md
- HERMES_TERMINAL_POLICY.md
- HERMES_GIT_POLICY.md

⚠️ 주의사항:
- 없음

🎯 다음 작업:
- HERMES_TELEGRAM_APPROVAL.md (진행 중)
- Codex QA 준비

💡 추천:
아직 Agent Control Room 완료 보고 불필요. 진행 계속.
```

---

### 2. Approval Requests

**목적**: 높은 위험도 작업에 대한 사용자 승인을 요청한다.

**형식**:
```md
[Hermes Approval Request]

⚠️ 위험도: HIGH
📋 작업: git push origin hermes-worker
🕐 시간: 2026-05-22 15:45

📝 상세:
현재 브랜치에 3개 커밋이 있습니다:
1. Phase 15: Add Hermes background worker policy
2. Phase 15: Add Hermes terminal policy
3. Phase 15: Add Hermes git policy

✅ 검증 상태:
- typecheck: ✅ pass
- lint: ✅ pass
- build: ✅ pass
- tests: ✅ 8/8 pass

📊 영향:
- 3개 새 문서 추가
- AGENTS.md 1개 파일 수정
- 총 1247 lines added

💡 추천:
문서와 테스트가 완벽하므로 즉시 승인 가능합니다.

응답:
1️⃣ approve — 승인, 즉시 푸시
2️⃣ reject — 거절, 푸시 안 함
3️⃣ explain — 더 자세한 설명
4️⃣ control-room — Agent Control Room에 문의

⏰ 60초 내에 응답해주세요.
```

---

### 3. Phase Completion Reports

**목적**: Phase가 완료되었음을 보고한다.

**형식**:
```md
[Hermes Phase Complete] ✅

🎉 완료: Phase 15 - Hermes Integration
👤 담당: Claude Code
📅 시작: 2026-05-20 10:00
📅 완료: 2026-05-22 16:00
⏱️ 소요: 2일 6시간

📋 작업 내용:
✅ HERMES_BACKGROUND_WORKER.md
✅ HERMES_TERMINAL_POLICY.md
✅ HERMES_GIT_POLICY.md
✅ HERMES_DEPLOYMENT_POLICY.md
✅ HERMES_AUTOMATION_POLICY.md
✅ HERMES_TELEGRAM_APPROVAL.md
✅ HERMES_OBSIDIAN_MEMORY_LOOP.md
✅ HERMES_SKILLS.md
✅ HERMES_MODEL_PROVIDER.md
✅ ORCHESTRATION_PACKET.md
✅ PHASE_COMPLETION_PACKET.md
✅ AGENTS.md 업데이트

✅ 검증 완료:
- typecheck: pass
- lint: pass
- tests: 8/8 pass
- build: success

📊 통계:
- 추가 파일: 11개
- 삭제 파일: 0개
- 수정 파일: 1개
- 총 추가 라인: 8,500+

💾 결과 저장:
Orchestration Packet → Agent Control Room에 반환
Obsidian Note → AgentControlRoom/Phases/phase-15.md

🎯 다음 Phase 추천:
Phase 16 - Hermes Skills Implementation

Agent Control Room 검토를 위해 대기 중입니다.
```

---

### 4. Failure Reports

**목적**: Phase 진행 중 오류가 발생했을 때 보고한다.

**형식**:
```md
[Hermes Failure Report] ❌

⚠️ 실패한 작업: pnpm build
🕐 시간: 2026-05-22 16:15
📍 Phase: Phase 15 - Hermes Integration
🔴 심각도: medium

🐛 오류:
Type error in components/roadmap/RoadmapTimeline.tsx
Property 'roadmapStages' is missing in type 'RoadmapTimelineProps'

📄 영향 파일:
- components/roadmap/RoadmapTimeline.tsx (line 45)
- lib/roadmap-ui-adapter.ts (line 127)

🔍 원인 분석:
lib/roadmap-ui-adapter.ts에서 roadmapStages를 전달하지 않고 있습니다.
RoadmapTimeline의 props 정의와 불일치합니다.

✅ 재현 가능: 예 (매번 동일한 오류)

💡 추천하는 해결책:
1. Codex에게 type fix 요청 (빠름)
   → isolated type check 후 수정
   
2. 또는 Claude Code에게 전체 context 검토 요청
   → 전체 flow 재검토

🚀 재시도 일정:
자동 재시도: 5분 후
수동 재시도: Codex에게 QA 요청 후

Agent Control Room 개입 필요: 예 (if auto-retry 실패)
Orchestration Packet 반환: 대기 중
```

---

### 5. Deployment Reports

**목적**: 배포 관련 상태를 보고한다.

**형식**:
```md
[Hermes Deployment Report]

🚀 배포 상태: Preview Deployed
🕐 시간: 2026-05-22 16:30
🔗 Preview URL: https://agent-control-room-abc123.vercel.app

📊 배포 정보:
- 커밋: Phase 15: Add Hermes policies
- 빌드 시간: 2분 15초
- 변경 파일: 12개
- 총 라인: +8,500

✅ Health Check:
- / ✅ 200 OK
- /plan ✅ 200 OK
- /agents ✅ 200 OK
- /handoffs ✅ 200 OK
- API health ✅ responsive

⏱️ 성능:
- 평균 응답 시간: 120ms (정상)
- 에러율: 0% (정상)

💡 다음 단계:
1. Preview URL에서 QA 확인
2. Agent Control Room에서 결과 검토
3. Production 배포 승인 요청

Production 배포 준비: 대기 중
```

---

## Approval Response Options

### 응답 유형

| 응답 | 의미 | Hermes 동작 |
|---|---|---|
| `approve` | 즉시 승인 | 작업 즉시 실행 |
| `reject` | 거절 | 작업 취소, Agent Control Room 보고 |
| `preview first` | 미리보기 필요 | Preview 생성 후 재승인 요청 |
| `explain` | 더 설명해달라 | 자세한 분석 추가 보고 |
| `control-room` | 제어실 문의 | Agent Control Room으로 문제 반환 |

### 응답 예시

**approve**:
```
approve
```

**reject**:
```
reject
```

**explain**:
```
explain: 좀 더 자세한 테스트 결과를 보여줄 수 있나?
```

**control-room**:
```
control-room: 이건 내가 판단할 수 없는 것 같은데 제어실에서 봐줄 수 있을까?
```

---

## Message Structure

### 기본 구조

1. **헤더** (메시지 유형)
   ```md
   [Hermes Status Report]
   [Hermes Approval Request]
   [Hermes Phase Complete]
   [Hermes Failure Report]
   [Hermes Deployment Report]
   ```

2. **상태 아이콘**
   - ⏰ 시간
   - 📍 위치 (Phase, 파일)
   - ✅ 성공
   - ❌ 실패
   - ⚠️ 경고
   - 🚀 배포
   - 📊 통계

3. **본문**
   - 핵심 정보
   - 상세 분석
   - 추천사항

4. **행동 유도**
   - 응답 옵션
   - 시간 제한 (승인 요청 시)

---

## Telegram Bot Configuration

### Bot Details

- **Bot Name**: Hermes Agent Control Room
- **Bot Username**: @hermesacr_bot (예시)
- **Language**: Korean (한국어)
- **Timezone**: Asia/Seoul

### Message Customization

사용자가 선호하는 경우:

```md
[설정 변경 요청]

선호:
1. 상태 보고: 매 30분 → 매 1시간으로 변경
2. 알림 방식: 자동 푸시 → 요청할 때만
3. 상세도: 자세함 → 간단히

기효 날짜: 2026-05-22 17:00~
```

---

## Response Time Expectations

### 승인 요청

| 작업 | 응답 시간 | 초과 시 동작 |
|---|---|---|
| 배포 승인 | 5분 | 60초 후 timeout, Agent Control Room 반환 |
| Git push | 10분 | 600초 후 timeout, 중단 |
| DB migration | 10분 | 600초 후 timeout, 중단 |

### Timeout 처리

```md
[Hermes Approval Timeout]

작업: git push origin hermes-worker
요청 시간: 2026-05-22 16:45
Timeout: 10분 초과

조치:
- 작업 취소
- Agent Control Room에 보고
- Orchestration Packet 생성

Agent Control Room 판단 대기 중
```

---

## Obsidian Integration

모든 Telegram 메시지는 Obsidian에 기록된다:

```
AgentControlRoom/
  TelegramApprovals/
    2026-05-22-git-push.md
    2026-05-22-production-deploy.md
  Daily/
    2026-05-22.md (status reports 포함)
```

---

## See Also

- [[docs/HERMES_BACKGROUND_WORKER.md]]
- [[docs/HERMES_TERMINAL_POLICY.md]]
- [[docs/HERMES_OBSIDIAN_MEMORY_LOOP.md]]
