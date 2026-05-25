# PRD — Agent Control Room Fast-Track Autonomous Operations
## 자동 런타임 선택형 운영 PRD

**문서 목적:**  
현재 완성된 Agent Control Room Local MVP를 기반으로, 원민님이 직접 에이전트·모델·런타임을 고르지 않아도 시스템이 작업 성격, 위험도, 쿼터, 실행 가능성, 런타임 적합도를 판단해 자동으로 실행·대체·대기·승인 요청까지 처리하는 운영 시스템으로 성숙시키기 위한 압축 PRD입니다.

**작성 기준:**  
- Phase 수를 최소화합니다.
- 기능 확장보다 “실제 사용 가능성”과 “자동화 개방”을 우선합니다.
- OMC/OMX도 수동 선택이 아니라, 필요성이 감지되면 자동 후보로 올라오는 구조로 설계합니다.
- 위험 작업은 자동화하되, Release Gate 아래에서만 실행합니다.
- 사용자는 에이전트, 모델, 런타임을 직접 고르지 않습니다. 시스템이 `Agent × Model × Runtime × Quota × Risk`를 판단합니다.
- 단, OMC/OMX 설치 전에는 자동 사용하지 않으며, 설치·검증·smoke test 통과 후에만 자동 선택 후보가 됩니다.

---

## 1. 현재 상태 요약

현재 Agent Control Room은 다음 기반이 구현된 상태입니다.

- Multi-Agent Runtime Registry
- Multi-Model Registry
- Agent × Model Router
- Quota / Rate Limit Parser
- Handoff Engine
- Recovery Scheduler Dry-Run
- Release Gate
- OMC / OMX Runtime Layer Scaffolding
- Antigravity 모델 전환 실패 시 사용자에게 `/model` 수동 전환을 요구하지 않고 자동 fallback
- Claude / Codex / Antigravity / Hermes 역할 분리
- TypeScript, lint, build, smoke dry-run, multi-agent tests 통과

현재 판정:

```txt
Final Local MVP Engine: Complete
Product Browser E2E Validation: Needed
Operational Automation: Not fully opened yet
OMC/OMX: Scaffolding exists, real installation/attachment needed
```

---

## 2. 최종 목표

원민님이 기획만 입력하면 Agent Control Room이 다음을 자동으로 수행하는 상태를 목표로 합니다.

```txt
기획 입력
→ 의도 정리
→ 실행 계약 고정
→ 작업 분해
→ Agent × Model × Runtime 자동 선택
→ 안전 작업 자동 실행
→ 위험 작업 Release Gate 생성
→ 토큰/쿼터 부족 시 handoff
→ OMC/OMX가 더 적합하면 자동 후보로 선택
→ 모두 막히면 waiting_for_recovery
→ 회복 후 자동 재개 후보 생성
→ 결과/로그/Hermes 인사이트 저장
→ 사용자는 방향 결정과 고위험 승인만 수행
```

---

## 3. 핵심 운영 원칙

### 3.1 사용자는 에이전트를 직접 고르지 않는다

```txt
Claude Code
Codex
Antigravity
Hermes
OMC
OMX
```

중 무엇을 쓸지는 시스템이 판단합니다.

### 3.2 사용자는 모델을 직접 고르지 않는다

```txt
Claude Sonnet / Opus
Codex gpt 계열
Antigravity Gemini / Claude / GPT-OSS 계열
```

중 무엇을 쓸지는 시스템이 판단합니다.

Antigravity의 모델 전환 자동화가 불가능할 경우에도 사용자는 `/model`을 직접 바꾸도록 요청받지 않습니다. 시스템은 다음 중 하나를 선택합니다.

```txt
1. 현재 Antigravity 모델로 실행 가능하면 그대로 실행
2. 더 적합한 모델이 필요하지만 자동 전환 불가하면 Claude Code Sonnet 등으로 fallback
3. 모든 대체가 불가능하면 waiting_for_recovery
```

### 3.3 사용자는 런타임을 직접 고르지 않는다

OMC/OMX도 “수동으로 선택하는 도구”가 아니라, Runtime Router의 자동 후보입니다.

```txt
단일 구현 작업 → claude-direct
QA/테스트 → codex-direct
UI/브라우저 QA → antigravity-direct
로그/회복/감시 → hermes-supervisor
복잡한 Claude 팀 작업 → omc-runtime 후보
긴 Codex QA workflow → omx-runtime 후보
```

### 3.4 OMC/OMX는 자동 설치되지 않는다

OMC/OMX는 설치·setup·doctor·smoke test를 통과한 뒤에만 자동 선택 후보가 됩니다.

```txt
not_installed → 자동 선택 불가
installed_unverified → 자동 선택 불가
setup_required → 자동 선택 불가
available_verified → 자동 선택 가능
```

### 3.5 무제한 자동 실행은 금지한다

자동 실행은 “bounded autonomous loop”로만 허용합니다.

```ts
maxConsecutiveRuns = 5
maxRuntimeMinutes = 60
maxChangedFiles = 10
failureThreshold = 2
requireBuildPass = true
requireFocusedTests = true
stopOnRepeatedFailure = true
```

### 3.6 위험 작업은 Release Gate 아래에서만 실행한다

Release Gate 대상:

```txt
git push
production deploy
preview deploy
DB migration
Supabase production write
Telegram approval authority
GitHub PR 생성/merge
.env / secrets 변경
package install/remove
destructive git command
```

---

## 4. 성공 기준

이 PRD가 완료되면 다음 상태여야 합니다.

### Product Usability

- 비개발자 PM도 화면에서 현재 상태와 다음 행동을 이해할 수 있습니다.
- 영어/개발자 용어가 주요 화면에서 제거되거나 설명됩니다.
- 깨진 화면, mock 버튼, 불명확한 빈 상태가 정리됩니다.
- UI 이슈는 `docs/UI_BROWSER_QA_BACKLOG.md`에 우선순위별로 기록됩니다.

### Automation

- Safe Auto가 실제로 작동합니다.
- Guarded Auto를 제한된 조건에서 사용할 수 있습니다.
- Recovery Worker가 dry-run을 넘어 one-shot 수준으로 확장됩니다.
- Codex가 rate limit이면 자동 대체 또는 회복 대기로 전환됩니다.
- Antigravity 모델 전환을 사용자가 직접 하지 않습니다.
- OMC/OMX가 설치·검증된 경우, 작업 특성에 따라 자동 후보로 선택됩니다.

### Runtime Selection

- direct runtime과 optional runtime이 구분됩니다.
- OMC/OMX는 기본 런타임이 아닙니다.
- OMC/OMX는 “더 적합한 상황”에서만 자동 선택 후보가 됩니다.
- OMC/OMX 선택 이유가 UI와 로그에 기록됩니다.
- OMC/OMX 실패 시 direct runtime으로 fallback하거나 waiting_for_recovery로 이동합니다.

### Safety

- git push, deploy, DB migration, Supabase write, Telegram approval authority는 Release Gate 아래에 있습니다.
- high/critical 작업은 승인 없이 실행되지 않습니다.
- 무제한 자동 실행은 금지하고, bounded autonomous loop만 허용합니다.

---

# 5. Phase 구조

전체 과정을 다음 **2개 Phase + Launch Gate**로 구성합니다.

```txt
Phase 1 — Fast-Track Operational Automation Loop
Phase 2 — OMC / OMX Runtime Installation & Auto-Selection Attachment
Launch Gate — 운영 개방 판단
```

---

# Phase 1 — Fast-Track Operational Automation Loop

## 목적

현재 완성된 Local MVP Engine을 실제 운영 가능한 자동화 루프로 만듭니다.

```txt
자연어 기획 입력
→ 의도 정리
→ 실행 계약 고정
→ 작업 분해
→ Agent × Model × Runtime 후보 선택
→ Safe/Guarded Auto 실행
→ 위험 작업 Release Gate 생성
→ 토큰/쿼터 부족 시 handoff
→ 브라우저 QA / 코드 QA
→ 결과 기록 / 다음 행동 추천
```

---

## Track 1 — Workflow Policy Engine

### 목적

원민님의 자연어 작업 방식을 개발자식 실행 계약으로 변환합니다.

시스템은 사용자 요청을 아래 구조로 정리해야 합니다.

```txt
Goal
Constraints
Allowed Files
Blocked Files
Risk Level
Agent Candidate
Model Candidate
Runtime Candidate
Execution Mode
Acceptance Criteria
QA Type
Release Gate 필요 여부
Next Action
```

### 구현 항목

- Intent Normalizer
- Execution Contract 생성
- Allowed/Blocked file 자동 추론
- Risk 자동 분류
- Runtime 후보 자동 추론
- QA 유형 자동 선택
  - Code QA
  - Browser QA
  - Release QA
- 다음 행동 추천

### 완료 기준

- 사용자의 자연어 요청이 실행 가능한 작업 계약으로 변환됩니다.
- 에이전트가 임의로 범위를 넓히지 않습니다.
- 작업마다 완료 기준과 QA 기준이 생깁니다.
- 런타임 후보가 자동으로 기록됩니다.

---

## Track 2 — Browser E2E QA + UI Backlog

### 목적

코드 테스트가 아니라 실제 브라우저에서 비개발자 PM이 쓸 수 있는지 확인합니다.

### 대상 화면

```txt
/
 /plan
 /orchestration
 /agent-status
 /workbench
 /dashboard
 /ops-dashboard
```

### 확인 항목

- 화면 깨짐
- 영어/개발자 용어
- Mock 버튼 노출
- 빈 상태 설명
- 다음 행동 안내
- Agent 상태 표시
- Model 상태 표시
- Runtime 상태 표시
- Codex rate limit 표시
- Antigravity fallback 표시
- OMC/OMX 상태 표시
- Release Gate 표시
- Worker dry-run의 “0 tasks”가 정상 상태로 설명되는지

### 산출물

```txt
docs/UI_BROWSER_QA_BACKLOG.md
```

### Backlog 형식

```md
| ID | Severity | Page | Issue | Why it matters | Recommended Fix | Status | Related Files |
|---|---|---|---|---|---|---|---|
```

### 처리 원칙

```txt
P0는 즉시 수정
빠른 P1은 즉시 수정
나머지 P1/P2/P3는 backlog화
```

---

## Track 3 — Operational Dogfooding Run

### 목적

실제 작업을 넣어서 Agent Control Room이 스스로 판단·실행·대체·대기하는지 검증합니다.

### Run 01 — 문서 생성

```txt
docs/LOCAL_MVP_USAGE.md 생성
```

검증:

```txt
safe/low 분류
Agent × Model 추천
Runtime 후보 추천
결과 저장
Hermes supervision
```

### Run 02 — UI 문구 수정

```txt
/plan 또는 /orchestration의 PM 친화 문구 수정
```

검증:

```txt
Antigravity 추천
모델 수동 변경 요구 없음
fallback 자동 처리
```

### Run 03 — QA/테스트 작업

```txt
Release Gate 관련 테스트 추가 또는 검증
```

검증:

```txt
Codex 우선 추천
Codex rate limit이면 실행 차단
Claude fallback 또는 waiting_for_recovery
OMX가 사용 가능한 경우 Runtime 후보로 제안
```

### Run 04 — 위험 작업 시뮬레이션

```txt
git push / deploy / DB migration 요청
```

검증:

```txt
Release Gate 생성
승인 전 실행 차단
rollback/checklist 생성
```

### Run 05 — 에이전트 장애 상황

```txt
Codex rate-limited
Antigravity model mismatch
Claude unavailable
```

검증:

```txt
handoff
waiting_for_recovery
nextRetryAt 유지
Hermes insight 기록
```

### Run 06 — Runtime 자동 선택 시뮬레이션

```txt
복잡한 Claude 팀 작업 또는 긴 Codex QA workflow 요청
```

검증:

```txt
OMC/OMX가 설치·검증 전이면 선택 불가로 표시
OMC/OMX가 설치·검증 후이면 자동 후보로 제안
기본 direct runtime을 대체하지 않고 조건부 후보로 사용
```

---

## Track 4 — Safe Auto + Guarded Auto 개방

### Safe Auto

허용 작업:

```txt
문서 생성/수정
가벼운 UI 문구 수정
테스트 추가
작은 리팩토링
로컬 docs 파일 생성
```

기본 제한:

```ts
maxConsecutiveRuns = 3
maxRuntimeMinutes = 30
maxChangedFiles = 5
allowPackageJsonChange = false
allowEnvChange = false
allowGitPush = false
```

### Guarded Auto

허용 작업:

```txt
여러 파일 수정
API route 수정
상태 관리 수정
runner 주변 코드 수정
approval 주변 코드 수정
orchestration flow 수정
```

기본 제한:

```ts
maxConsecutiveRuns = 5
maxRuntimeMinutes = 60
maxChangedFiles = 10
failureThreshold = 2
requireBuildPass = true
requireFocusedTests = true
stopOnRepeatedFailure = true
```

### 자동 중단 조건

```txt
high/critical 감지
blocked file 변경
package install 필요
env/secrets 접근
반복 실패
git 상태 불명확
테스트 실패
Release Gate 필요 작업 감지
```

---

## Track 5 — Recovery Scheduler one-shot

### 목적

현재 dry-run worker를 실제 운영 후보로 올립니다.

### 명령

```bash
npm run agent:worker -- --dry
npm run agent:worker -- --once
```

### 기능

```txt
waiting_for_recovery 작업 확인
nextRetryAt 경과 여부 확인
Codex 회복 여부 확인
Claude/Antigravity 사용 가능 여부 확인
OMC/OMX 사용 가능 여부 확인
handoff 후보 생성
Hermes insight 기록
위험 작업은 Release Gate로 이동
```

---

## Track 6 — Release Gate 확장

### Release Gate 대상

```txt
git push
production deploy
preview deploy
DB migration
Supabase production write
Telegram approval authority
GitHub PR 생성/merge
```

### Release Gate 필수 정보

```txt
위험 설명
변경 파일
실행 명령
rollback plan
필수 체크리스트
승인자
승인 토큰
만료 시간
실행 결과 기록
```

---

## Track 7 — Ops Dashboard

### 목적

최종 운영 화면은 세 가지 질문에 답해야 합니다.

```txt
지금 어디까지 됐나?
뭐가 막혔나?
내 승인이 필요한가?
```

### 표시 항목

```txt
현재 실행 중인 작업
대기 중인 작업
막힌 작업
내 승인이 필요한 작업
에이전트 상태
모델 상태
런타임 상태
Codex 회복 예정
OMC/OMX 상태
Release Gate 요청
최근 Hermes 인사이트
handoff 이력
UI Browser QA backlog 요약
```

---

## Phase 1 완료 기준

```txt
Browser E2E QA 완료
UI_BROWSER_QA_BACKLOG 생성
P0 이슈 0개
핵심 P1 이슈 해결 또는 backlog 기록
Dogfooding Run 01~06 완료
Safe Auto 작동
Guarded Auto 제한 정책 적용
Recovery Worker --once 준비 또는 구현
Agent × Model × Runtime 라우팅이 실제 화면/실행 흐름에서 확인됨
Release Gate가 위험 작업을 차단함
Ops Dashboard에서 현재 상태 확인 가능
typecheck / lint / build / smoke:e2e:dry 통과
필요 시 로컬 커밋 완료
git push 없음
```

---

# Phase 2 — OMC / OMX Runtime Installation & Auto-Selection Attachment

## 목적

OMC/OMX를 단순 문서상 후보가 아니라, 실제 로컬 시스템에 설치하고 Agent Control Room에서 자동 선택 가능한 보조 실행 런타임으로 연결합니다.

```txt
Agent Control Room = 최상위 제어 평면
OMC / OMX = 자동 선택 가능한 보조 실행 런타임
Claude / Codex / Antigravity / Hermes = 실제 실행 에이전트
```

---

## 2.1 OMC 설치 및 검증

### OMC 목적

OMC는 Claude Code 중심의 team/runtime layer입니다.

용도:

```txt
Claude 기반 병렬/팀 작업 실험
복잡한 구현 작업 분산
다중 worker 관리 실험
장시간 작업을 여러 worker로 쪼개는 후보
```

### 설치 명령

```bash
npm i -g oh-my-claude-sisyphus@latest
omc setup
omc --help
```

### 검증 명령

```bash
command -v omc
omc --version || omc --help
```

### Smoke Test 후보

```bash
omc team 1:claude "Reply with exactly OMC-CLAUDE-OK. Do not modify files."
```

Codex/Gemini worker까지 확인할 경우:

```bash
omc team 1:codex "Reply with exactly OMC-CODEX-OK. Do not modify files."
omc team 1:gemini "Reply with exactly OMC-GEMINI-OK. Do not modify files."
```

단, Codex가 rate-limited이거나 gemini CLI가 미설치일 경우 실패가 아니라 상태로 기록합니다.

---

## 2.2 OMX 설치 및 검증

### OMX 목적

OMX는 Codex CLI 위에 붙는 workflow/runtime layer입니다.

용도:

```txt
Codex QA workflow
테스트/리뷰 반복 작업
Codex 회복 후 회귀 검증 자동화
긴 QA 작업의 상태 추적
```

### 설치 명령

현재 Codex CLI가 이미 설치되어 있으므로 `@openai/codex`를 다시 설치하지 않습니다.

```bash
codex --version
npm install -g oh-my-codex
omx setup
omx --help
```

### Health Check

```bash
command -v omx
omx doctor
codex login status
```

### Real Smoke Test

Codex usage limit이 회복된 뒤 실행합니다.

```bash
omx exec --skip-git-repo-check -C . "Reply with exactly OMX-EXEC-OK"
```

Codex가 아직 rate-limited이면 이 테스트는 실패가 아니라 다음 상태로 기록합니다.

```txt
OMX installed
OMX doctor passed/failed
Codex auth checked
real exec blocked by Codex rate limit
nextRetryAt 유지
```

---

## 2.3 Runtime Adapter Registry 연결

### Runtime Adapter ID

```ts
type RuntimeAdapterId =
  | "claude-direct"
  | "codex-direct"
  | "antigravity-direct"
  | "hermes-supervisor"
  | "omc-runtime"
  | "omx-runtime";
```

### Runtime Adapter Profile

```ts
type RuntimeAdapterProfile = {
  id: RuntimeAdapterId;
  displayName: string;
  command: string;
  status:
    | "not_installed"
    | "installed_unverified"
    | "setup_required"
    | "available_verified"
    | "rate_limited"
    | "failed"
    | "unknown";
  bestFor: string[];
  constraints: string[];
  isDefault: boolean;
  requiresSmokeTest: boolean;
  autoSelectable: boolean;
  lastCheckedAt: string;
  lastSmokeTestAt?: string;
  lastFailureReason?: string;
};
```

### 기본 등록값

```txt
claude-direct
- command: claude
- default: true
- autoSelectable: true
- bestFor: implementation, architecture, orchestration logic

codex-direct
- command: codex
- default: true
- autoSelectable: true if not rate_limited
- bestFor: QA, tests, code review

antigravity-direct
- command: agy
- default: true
- autoSelectable: true
- bestFor: UI/UX, browser QA, PM copy

hermes-supervisor
- command: hermes
- default: true
- autoSelectable: true for supervision only
- bestFor: monitoring, recovery, insights

omc-runtime
- command: omc
- default: false
- autoSelectable: true only after smoke test
- bestFor: Claude team workflow, multi-worker experiment

omx-runtime
- command: omx
- default: false
- autoSelectable: true only after smoke test
- bestFor: Codex durable QA workflow, repeated validation
```

---

## 2.4 Runtime Router 자동 선택 정책

### 기본 원칙

Runtime Router는 매 작업마다 다음을 평가합니다.

```txt
작업 유형
위험도
필요 에이전트
필요 모델
쿼터 상태
예상 작업 시간
파일 충돌 위험
다중 worker 필요 여부
QA 반복 필요 여부
런타임 설치/검증 상태
```

### 자동 선택 조건

#### claude-direct

```txt
단일 구현 작업
오케스트레이션 로직
runner/approval/status 코드
빠른 수정
```

#### codex-direct

```txt
단일 QA
테스트 추가
코드 리뷰
회귀 검증
Codex 사용 가능 상태
```

#### antigravity-direct

```txt
UI/UX 수정
브라우저 QA
PM 문구 개선
화면 깨짐 수정
```

#### hermes-supervisor

```txt
로그 분석
회복 판단
인사이트 기록
작업 상태 감시
```

#### omc-runtime

OMC는 다음 조건을 만족할 때 자동 후보가 됩니다.

```txt
omc available_verified
작업이 Claude 기반 다중 worker에 적합
작업이 여러 subtask로 자연스럽게 분해 가능
파일 충돌 위험 낮음
예상 작업 시간이 길거나 병렬 검토가 유리함
direct Claude만으로는 토큰 집중 위험이 높음
```

예시:

```txt
큰 리팩토링을 여러 모듈로 나눠 검토
아키텍처 설계 + 구현 + QA 분리
여러 파일을 병렬 분석하되 수정 범위가 분리된 작업
```

#### omx-runtime

OMX는 다음 조건을 만족할 때 자동 후보가 됩니다.

```txt
omx available_verified
Codex rate_limited 아님
작업이 QA/테스트/리뷰 workflow에 적합
반복 검증이 필요함
긴 테스트/리뷰 로그를 추적할 필요가 있음
```

예시:

```txt
Release Gate 회귀 테스트
보안 경로 검토
테스트 실패 원인 반복 분석
Codex 회복 후 전체 QA 검증
```

### 자동 선택 실패 처리

```txt
OMC가 적합하지만 미설치/미검증
→ claude-direct fallback

OMX가 적합하지만 Codex rate_limited
→ Claude fallback 또는 waiting_for_recovery

OMC/OMX smoke test 실패
→ 해당 runtime을 autoSelectable=false로 변경
→ direct runtime으로 fallback

모든 runtime 불가
→ waiting_for_recovery
→ Hermes insight 기록
```

---

## 2.5 UI 연결

### 표시 위치

```txt
/agent-status
/orchestration
/plan
/ops-dashboard
```

### 표시 항목

```txt
OMC 상태
OMX 상태
설치 여부
setup 여부
doctor 결과
smoke test 결과
마지막 확인 시간
사용 가능한 작업 유형
기본 실행기 여부
자동 선택 가능 여부
선택된 이유
fallback 이유
```

### PM용 문구

```txt
OMC
Claude Code 팀 실행 엔진
상태: 설치됨 / 검증 필요 / 사용 가능
자동 선택: 가능 / 불가
추천 상황: 큰 구현 작업을 여러 흐름으로 나눌 때

OMX
Codex QA 실행 엔진
상태: 설치됨 / Codex 사용량 제한 / 사용 가능
자동 선택: 가능 / 불가
추천 상황: 긴 QA나 반복 테스트가 필요할 때

기본 실행
현재는 기존 직접 실행 방식을 우선 사용합니다.
OMC/OMX는 검증된 특정 작업에서만 자동 후보로 선택됩니다.
```

---

## 2.6 Docs / Runbook

### 생성 문서

```txt
docs/OMC_OMX_INSTALLATION_RUNBOOK.md
docs/OMC_OMX_EXPERIMENT_REPORT.md
docs/RUNTIME_ADAPTER_POLICY.md
```

### Runbook 포함 내용

```txt
설치 명령
설정 명령
검증 명령
smoke test
실패 시 복구
Codex rate limit 대응
OMC/OMX를 기본 실행기로 쓰지 않는 이유
Agent Control Room과의 관계
자동 선택 조건
fallback 정책
```

---

## 2.7 Tests

### 추가 테스트

```txt
OMC command detection
OMX command detection
OMC not installed → not_installed
OMX not installed → not_installed
OMC installed but no setup → setup_required
OMX doctor failed → installed_unverified or failed
OMX with Codex rate limit → rate_limited
OMC/OMX are never default unless explicitly enabled
OMC/OMX can be auto-selected only after smoke test
OMC/OMX fallback to direct runtime when unavailable
Agent Control Room remains top-level control plane
```

### 검증 명령

```bash
npm run typecheck
npm run lint
npm run build
npm run smoke:e2e:dry
npm test -- __tests__/runtime-adapters.test.ts
npm run agent:worker -- --dry
```

---

## Phase 2 완료 기준

```txt
OMC 실제 설치 완료
OMX 실제 설치 완료
omc / omx command 감지됨
setup / doctor / help 검증 완료
OMC smoke test 결과 기록
OMX smoke test 결과 기록 또는 Codex rate limit 상태 기록
Runtime Adapter Registry에 OMC/OMX 등록
Runtime Router가 OMC/OMX를 자동 후보로 평가
UI에서 OMC/OMX 상태 표시
OMC/OMX는 기본 실행기가 아님
OMC/OMX는 smoke test 통과 후에만 autoSelectable
Agent Control Room이 최상위 제어권 유지
문서 / runbook / 실험 보고서 생성
typecheck / lint / build / smoke:e2e:dry 통과
필요 시 로컬 커밋 완료
git push 없음
```

---

# Launch Gate — 운영 개방 판단

Fast-Track Phase와 OMC/OMX Attachment Phase 완료 후 아래 기준으로 운영 개방 여부를 판단합니다.

## Product

```txt
[ ] 비개발자 PM도 기본 흐름을 이해할 수 있음
[ ] 모든 주요 화면에 다음 행동이 표시됨
[ ] Agent/Model/Runtime 상태가 명확함
[ ] Codex rate limit이 오류가 아니라 회복 대기로 표시됨
[ ] Antigravity 모델 전환 실패 시 자동 fallback됨
[ ] OMC/OMX가 미설치/미검증/사용 가능 상태로 표시됨
[ ] UI backlog가 존재하고 우선순위가 정리됨
```

## Automation

```txt
[ ] Safe Auto 안정적으로 작동
[ ] Guarded Auto 제한 조건 작동
[ ] Recovery Worker가 대기 작업을 재검토함
[ ] handoff 이력이 기록됨
[ ] Hermes insight가 누적됨
[ ] OMC/OMX가 필요한 작업에서 자동 후보로 평가됨
[ ] OMC/OMX가 불가할 때 direct runtime fallback이 작동함
```

## Safety

```txt
[ ] high/critical은 Release Gate 필수
[ ] git push/deploy/DB migration은 승인 없이는 실행되지 않음
[ ] .env*, secrets, destructive git 명령은 보호됨
[ ] package install/remove는 명시 승인 없이는 실행되지 않음
[ ] Telegram 승인은 토큰/작업 ID 검증 기반
[ ] OMC/OMX가 Agent Control Room의 승인 체계를 우회하지 않음
```

## Operations

```txt
[ ] 로컬 실행 문서 있음
[ ] 작업 실패 시 복구 절차 있음
[ ] 배포 전 preview/staging 검증 절차 있음
[ ] 최근 커밋/변경 이력 추적 가능
[ ] 사용자 승인 필요한 항목이 한 화면에 모임
[ ] OMC/OMX 설치/검증 runbook이 있음
```

---

# Backlog — Launch 이후 고도화

Launch Gate 이후로 미룹니다.

```txt
Telegram 승인 완전 연동
GitHub PR 자동 생성/merge
Preview deploy 자동화
Production deploy 자동화
Supabase 운영 저장
OMC/OMX 실제 다중 worker 운영 고도화
Antigravity TTY 기반 모델 자동 전환 고도화
장시간 daemon worker
모델 쿼터 시각화
자동 비용/토큰 예산 관리
Runtime별 성능/성공률 대시보드
```

---

# 최종 산출물

Fast-Track + OMC/OMX Phase 완료 시 산출물은 다음과 같습니다.

```txt
docs/UI_BROWSER_QA_BACKLOG.md
docs/LOCAL_MVP_USAGE.md
docs/OPERATIONAL_DOGFOODING_REPORT.md
docs/AUTOMATION_LEVEL_POLICY.md
docs/RECOVERY_SCHEDULER_RUNBOOK.md
docs/RELEASE_GATE_RUNBOOK.md
docs/WORKFLOW_POLICY_ENGINE.md
docs/OPS_DASHBOARD_GUIDE.md
docs/OMC_OMX_INSTALLATION_RUNBOOK.md
docs/OMC_OMX_EXPERIMENT_REPORT.md
docs/RUNTIME_ADAPTER_POLICY.md
```

---

# 최종 정의

```txt
Agent Control Room은 Claude 단독 자동화 도구가 아니다.

원민님의 자연어 기획을 개발자식 실행 계약으로 바꾸고,
여러 AI CLI 에이전트와 모델, 그리고 OMC/OMX 같은 보조 런타임까지
작업 성격, 위험도, 쿼터 상태, 런타임 적합도에 따라 자동 배정하며,
실패 시 handoff하고,
회복 시 재개하고,
위험 작업은 Release Gate로 보호하는
로컬 AI 오케스트레이션 운영 시스템이다.
```
