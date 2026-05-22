# HERMES_DEPLOYMENT_POLICY.md — Deployment and Infrastructure Policy

## Overview

Hermes에게 배포 관련 작업을 허용한다. 단, production 배포는 항상 승인이 필요하다.

---

## Deployment Stages

### 1. Status Check (자동 실행)

Hermes가 배포 상태를 직접 확인할 수 있다.

```bash
vercel projects
vercel env list
vercel deployments
vercel logs
```

용도:
- 현재 배포 상태 조회
- 최근 배포 이력 확인
- 환경 변수 목록 확인

---

### 2. Preview Deployment (보고 후 가능)

Hermes가 preview 배포를 생성할 수 있다.

```bash
vercel deploy --prebuilt
```

조건:
- Prebuilt 빌드만 배포 (새 빌드 불가)
- Preview URL 자동 생성
- Production 미포함
- 되돌리기 쉬움

Telegram 보고:
```md
[Hermes Preview Deployment]

상태: 완료
Preview URL: https://agent-control-room-7x8y9z.vercel.app

변경 파일: 12개
테스트 결과: all passing
빌드 로그: 성공

QA 확인 필요 시 위 URL에서 테스트하세요.
```

---

### 3. Production Deployment (Telegram 승인 필수)

Production 배포는 항상 사용자 승인이 필요하다.

```bash
vercel deploy --prod
```

Telegram 승인 요청:
```md
[Hermes Production Deployment Request]

위험도: very-high
이유: 실제 사용자에게 반영되는 배포입니다.

배포 전 검증:
- typecheck: pass ✅
- lint: pass ✅
- test: pass ✅
- build: pass ✅

변경 사항:
- Phase 15: Hermes integration
- 3개 문서 추가
- AGENTS.md 업데이트

영향 범위:
- /plan (roadmap control panel)
- /agents (agent routing)
- /handoffs (handoff generation)

현재 상태:
- 현재 배포: 2026-05-21 12:30
- 변경 후: 2026-05-22 14:45
- 다운타임: 예상 없음

승인 옵션:
1. approve — 바로 배포
2. preview first — 미리 보기 후 재요청
3. reject — 배포 취소
4. control-room — Agent Control Room 문의
5. rollback — 이전 버전으로 롤백
```

---

## Rollback Policy

### Rollback 필요 상황

롤백은 다음 상황에서만 필요하다:

1. **Critical bug** (배포 후 발견)
   - 서비스 완전 중단
   - 데이터 손실 위험
   - 심각한 보안 문제

2. **Deployment failure**
   - 빌드 실패
   - 환경 변수 오류
   - 데이터베이스 마이그레이션 실패

3. **Unexpected behavior**
   - 예상과 다른 동작
   - 성능 급격한 저하

### Rollback 프로세스

```bash
vercel rollback
```

Telegram 승인 필수:
```md
[Hermes Rollback Request]

위험도: high
이유: 배포된 버전에서 critical bug 발견

현재 배포: 2026-05-22 14:45
롤백 대상: 2026-05-21 12:30

영향:
- Phase 15 변경사항 되돌림
- 이전 에이전트 라우팅 복구
- Hermes 정책 문서 미배포

추천: 즉시 롤백 후 버그 분석

승인: approve / reject / explain
```

---

## Environment Variables

### Environment Variables 확인 (자동)

```bash
vercel env list
vercel env list --environment=production
```

### Environment Variables 변경 (Telegram 승인 필수)

```bash
vercel env set KEY=value
vercel env set --environment=production KEY=value
vercel env rm KEY
```

위험:
- 서비스 설정 변경
- 보안 영향
- 서비스 동작 변경

Telegram 승인 요청:
```md
[Hermes Environment Variable Change]

위험도: high

변경:
KEY: DATABASE_URL
이전: (hidden)
신규: (hidden)
환경: production

이유: <reason>

영향:
- 데이터베이스 연결
- 모든 API 요청

승인: approve / reject / explain
```

---

## Database Migrations

### Migration 상태 확인 (자동)

```bash
prisma migrate status
prisma migrate list
```

### Migration 실행 (Telegram 승인 필수)

```bash
prisma migrate deploy
prisma db seed
```

위험:
- 데이터 구조 변경
- 데이터 손실 가능
- 되돌리기 극도로 어려움

Telegram 승인 요청:
```md
[Hermes Database Migration Request]

위험도: very-high

마이그레이션:
- 20260522_add_hermes_packet_table
- 20260522_add_telegram_logs

영향:
- hermes_packets 테이블 추가
- telegram_approval_logs 테이블 추가

영향 데이터: 없음 (새 테이블)
다운타임: 예상 1분

백업 상태: 자동 완료

승인: approve / reject / explain / control-room
```

---

## Health Checks

### Post-Deployment 검증

배포 후 자동으로 다음을 확인한다:

```
1. Service Health
   └─ /api/health → 200 OK

2. Critical Routes
   ├─ / → 200 OK
   ├─ /plan → 200 OK
   ├─ /agents → 200 OK
   └─ /handoffs → 200 OK

3. Database Connection
   └─ Connection pool → active

4. External Services
   ├─ OpenAI API → responsive
   ├─ Supabase → responsive
   └─ Vercel API → responsive

5. Logs
   └─ No errors in first 5 minutes
```

검증 실패 시:
```md
[Hermes Deployment Health Check Failed]

실패: /plan 라우트 에러 (500)

오류: RoadmapTimeline props mismatch
파일: components/roadmap/RoadmapTimeline.tsx

조치:
1. Rollback 권장
2. 또는 Codex에게 빠른 fix 요청

Agent Control Room에 Orchestration Packet 반환
```

---

## Approval Workflow

```
Hermes 배포 명령
    ↓
위험도 분류
    ├─ Low (상태 확인): 직접 실행
    ├─ Medium (preview): 보고 + 진행
    └─ High (production): Telegram 승인 요청
        ├─ approve → 배포 실행
        ├─ preview first → preview URL 생성 + 재요청
        ├─ reject → 배포 취소
        └─ control-room → Agent Control Room 반환
    ↓
배포 실행
    ↓
Health Check
    ├─ 통과 → Telegram 완료 보고
    └─ 실패 → Rollback 또는 Codex 호출
```

---

## Monitoring

### 배포 후 모니터링

```
실시간 로그 모니터링 (첫 5분):
- Error rate
- API latency
- Database connection
- External API responses

주요 메트릭:
- P95 latency
- Error rate < 0.01%
- CPU/Memory usage normal
```

### Obsidian 기록

```md
# 2026-05-22 Deployment Log

## Production Deployments

### Phase 15 Hermes Integration (14:45)
- 승인: approve (Telegram)
- 빌드: success
- 배포: success
- Health check: pass
- 모니터링: 5분 pass

## Preview Deployments

### Phase 15 Preview (14:00)
- URL: https://...
- 상태: success
- QA 대기 중

## Rollbacks

없음
```

---

## See Also

- [[docs/HERMES_TERMINAL_POLICY.md]]
- [[docs/HERMES_AUTOMATION_POLICY.md]]
- [[docs/HERMES_BACKGROUND_WORKER.md]]
