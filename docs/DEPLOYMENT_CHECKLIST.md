# 배포 준비 체크리스트 (Phase 10)

## 환경 설정

### 필수 환경 변수 (.env.local 로컬 개발 / Vercel 배포)

#### OpenAI (모든 환경)
```
OPENAI_API_KEY=sk-...  # 필수: API 키
```

#### Supabase (프로덕션 권장 / 로컬 JSON fallback 가능)
```
# .env.local 및 Vercel 환경 변수에 설정
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # 서버 전용 (Vercel에만)
```

**설정 위치** (Vercel 배포 시):
- 로그인 → 프로젝트 → Settings → Environment Variables
- `NEXT_PUBLIC_*` 접두사: 클라이언트에 노출됨 (API key 노출 금지)
- `SUPABASE_SERVICE_ROLE_KEY`: 서버만 접근 (Vercel 서버리스 함수용)

**미설정 시**: 앱은 자동으로 JSON fallback 사용 → 로컬에서만 persistence 동작, Vercel serverless에서는 동작하지 않음 ⚠️

#### Vibe Kanban (선택사항)
```
VIBE_KANBAN_URL=http://localhost:3003  # (또는 원격 URL)
VIBE_KANBAN_ORG_ID=your-org-id         # (선택, UI에서도 입력 가능)
```

**검증**
```bash
# 현재 상태 확인
cat .env.local

# 배포 전 환경 변수 제거 (보안)
git check-ignore .env.local  # ".env.local" 출력 = 안전
```

---

## 보안 검사

### 1. API 키 하드코딩 확인

```bash
# 코드베이스에서 API 키가 직접 작성되어 있는지 확인
grep -r "sk-proj\|sk-" app/ lib/ components/ --include="*.ts" --include="*.tsx"
# 결과: 없어야 함 (모두 환경 변수 사용)
```

**상태**: ✅ PASS
- `app/api/orchestrate/route.ts`: `process.env.OPENAI_API_KEY` 사용
- `app/api/agent-status/route.ts`: 환경 변수 기반

---

### 2. npm 보안 취약점 (T025 — Phase 7)

```bash
npm audit
```

**현재 상태** (T025 완료):
```
2 vulnerabilities (2 moderate)
- bundled postcss (Next.js 15.5 번들): 이 앱에서 exploitable 아님
```

**완료 항목** (T025):
- ✅ `npm audit fix` 적용 (자동 수정 가능한 항목)
- ✅ Next.js 15.5로 업그레이드 (취약점 완화)
- ✅ 핵심 직접 의존성 모두 안전 (supabase-js, openai, zod, lucide-react 등)

**다음 update**:
- Next.js upstream 패치 대기 (postcss 취약점 상위 수정)
- 또는 별도 fork 사용 (위험도 낮음, 현 앱에서 non-exploitable)

---

### 3. 민감한 정보 누수 확인

```bash
# 커밋 히스토리에서 실수로 커밋된 API 키 확인
git log --all --source --grep="OPENAI_API_KEY\|sk-proj" -- ':!node_modules'
# 결과: 없어야 함

# 또는 git-secrets 사용 (설치 필요)
# brew install git-secrets
# git secrets --register-aws
# git secrets --scan
```

**상태**: ✅ PASS (`.env.local` 제외 확인됨)

---

## 빌드 & 성능 (Phase 10)

### 1. 프로덕션 빌드

```bash
npm run build

# 예상 출력:
# ✓ Compiled successfully
# ✓ Generating static pages (30+/30+)
# ○ (Static) prerendered
# ƒ (Dynamic) server-rendered
```

**상태**: ✅ PASS (Phase 10: 15개 페이지 + 18개 API route)

---

### 2. 페이지 목록 (Phase 10 기준)

**사용자 페이지** (15개):
- [ ] `/` — 대시보드 (최근 세션 리포트)
- [ ] `/projects` — 프로젝트 목록
- [ ] `/projects/[id]` — 프로젝트 상세
- [ ] `/plan` — 로드맵 제어 패널
- [ ] `/agent-status` — 에이전트 상태
- [ ] `/prompt-compiler` — 시니어 개발자 프롬프트 컴파일러
- [ ] `/context-pack` — Context/Handoff 빌더
- [ ] `/memory` — Obsidian 노트 생성기
- [ ] `/hermes-packets` — Hermes 패킷 초안
- [ ] `/result-review` — 결과 검토 및 분류
- [ ] `/workbench` — Vibe Kanban 워크벤치 연동
- [ ] `/advisor` — 어드바이저 모드 (legacy)
- [ ] `/reports` — 세션 리포트 저장소
- [ ] `/handoffs` — 핸드오프 기록
- [ ] (추가) 접근성 페이지

**API 엔드포인트** (18개):
- [ ] `POST /api/orchestrate` — 기술 번역 및 로드맵 생성
- [ ] `GET /api/roadmap` — 로드맵 데이터
- [ ] `GET /api/agent-status` — 에이전트 상태
- [ ] `POST /api/agents/capability` — 에이전트 역량 평가
- [ ] `POST /api/advisor` — 어드바이저 분석
- [ ] `POST /api/analyzer` — diff 분석
- [ ] `POST /api/loop-continue` — 루프 계속
- [ ] `POST /api/vibe-kanban/projects` — VK 프로젝트
- [ ] `POST /api/vibe-kanban/statuses` — VK 상태
- [ ] `POST /api/vibe-kanban/issue` — VK 이슈 생성
- [ ] `POST /api/vibe-kanban/import` — VK 임포트
- [ ] `POST /api/orchestration/queue` — 실행 큐
- [ ] `POST /api/runner` — 에이전트 실행
- [ ] `POST /api/workbench/approval` — 워크벤치 승인
- [ ] `POST /api/reports` — 세션 리포트 저장
- [ ] `POST /api/qa/code-review` — QA 코드 리뷰
- [ ] `POST /api/knowledge/patterns` — 프롬프트 패턴 저장
- [ ] `GET/POST /api/plans/[planId]/tasks/[taskId]` — 작업 상태

---

### 3. 번들 크기

```bash
# Next.js build 분석 (@next/bundle-analyzer 필요)
npm run build

# .next/static 디렉토리 크기 확인
du -sh .next/static/
```

**예상 페이지 로드 크기** (Phase 10):
- `/`: ~3.5 kB page + ~100 kB First Load JS
- `/plan`: ~7 kB page + ~105 kB First Load JS
- `/prompt-compiler`: ~5 kB page + ~102 kB First Load JS
- `/hermes-packets`: ~4 kB page + ~102 kB First Load JS
- 기타: 1-4 kB 페이지

**평가**: ✅ 적정 수준 (core bundle 88-105 kB)

---

## 배포 플랫폼별 설정

### Vercel (권장 - Next.js 최적화)

```bash
# Vercel CLI 설치
npm i -g vercel

# 배포 (초기)
vercel
# 또는
vercel --prod

# 환경 변수 설정 (Vercel 대시보드)
# Settings → Environment Variables
# OPENAI_API_KEY=sk-...
# VIBE_KANBAN_URL=http://...
```

### 수동 배포 (Node.js 호스팅)

```bash
# 빌드
npm run build

# 실행
NODE_ENV=production npm start
# 또는 PM2로 관리
pm2 start "npm start" --name "agent-control-room"
```

### Docker (선택)

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

---

## 데이터 저장소 (T026 — Phase 8 / Phase 10)

### 현재 상태
- **로컬 JSON** (`data/*.json`): MVP, 개발용 ✅
- **Supabase (PostgreSQL)**: Phase 8 migration 준비 ✅
  - Schema 파일: `supabase/migrations/20260521_initial_schema.sql`
  - 7개 테이블 설정: `projects`, `tasks`, `handoffs`, `session_reports`, `feature_plans`, `execution_logs`, `agent_statuses`
  - RLS (Row Level Security) policies: enabled (single-user allow-all)
  - Fallback: Supabase 미설정 시 자동으로 JSON fallback 사용

### 배포 환경별 설정

#### 로컬 개발
```bash
# JSON fallback 사용 (자동)
# Supabase 선택사항
npm run dev
```

#### Vercel 배포 (프로덕션 권장)

**옵션 A: Supabase + env vars** (권장)
1. Supabase 프로젝트 생성 (https://supabase.com)
2. Vercel 환경 변수 설정:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbG...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbG...  # 서버 전용
   ```
3. Supabase 대시보드 → SQL Editor → `20260521_initial_schema.sql` 실행
4. 배포 후 `GET /api/roadmap` 테스트 → Supabase 데이터 반환 확인

**옵션 B: JSON fallback only** (주의 ⚠️)
- Supabase 환경 변수 생략
- 앱은 자동으로 JSON fallback 사용
- **문제**: Vercel serverless 환경에서는 파일 시스템이 ephemeral (임시)
- **결과**: 재배포 시 모든 데이터 손실
- **용도**: 데모/프로토타입 전용

### 마이그레이션 체크리스트

- [ ] Supabase 프로젝트 생성 (또는 기존 연결)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 및 anon key 복사
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 복사 (서버 전용)
- [ ] Vercel 환경 변수 3개 모두 설정
- [ ] `supabase/migrations/20260521_initial_schema.sql` 실행 확인
- [ ] `npm run build` 후 `npm start` 로컬 테스트 (Supabase 연결)
- [ ] Vercel Preview deployment 테스트 (위 smoke test 참조)
- [ ] Production deployment 승인

---

## 모니터링 & 로깅

### Vercel 배포 시
- 자동: 배포 로그, 에러 추적
- 수동 추가: Sentry (에러 모니터링)

```bash
npm install --save @sentry/nextjs

# next.config.mjs에 Sentry 초기화
# .env.local에 SENTRY_DSN 추가
```

### 수동 배포 시
- 구조화된 로그 (winston, pino)
- 모니터링 도구 (PM2 Plus, New Relic 등)

---

## 최종 배포 체크리스트 (Phase 10)

### 빌드 및 보안 검증
- [x] `npm run build` 성공 (0 에러)
- [x] `npm run typecheck` 성공
- [x] `npm run lint` 성공
- [x] `.env.local` 제외 확인 (git check-ignore)
- [x] API 키 하드코딩 없음 (환경 변수만 사용)
- [x] npm audit 통과 (2 moderate, non-exploitable)

### 환경 변수 설정
- [ ] `OPENAI_API_KEY` 설정 (필수)
- [ ] `NEXT_PUBLIC_SUPABASE_URL` 설정 (권장, JSON fallback 사용 가능)
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` 설정 (권장)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` 설정 (Vercel 서버 전용)
- [ ] `VIBE_KANBAN_URL` 설정 (선택, UI에서도 입력 가능)

### 데이터베이스 준비
- [ ] Supabase 프로젝트 생성 또는 기존 연결
- [ ] 마이그레이션 실행: `supabase/migrations/20260521_initial_schema.sql`
- [ ] 테이블 7개 확인 (projects, tasks, handoffs 등)
- [ ] RLS policies enabled 확인

### 성능 및 기능 검증
- [ ] 페이지 로드 성능 < 2초 (대시보드, 로드맵)
- [ ] 모든 15개 페이지 렌더링 성공
- [ ] 모든 18개 API 엔드포인트 응답 성공
- [ ] 에러 페이지 (404, 500) 렌더링 확인
- [ ] 콘솔 에러 또는 경고 없음 (DevTools F12)

### 배포 프로세스
- [ ] Vercel 프로젝트 생성 또는 기존 연결
- [ ] GitHub repo 연결 (또는 manual git push)
- [ ] Environment Variables 설정 (대시보드 또는 CLI)
- [ ] Preview deployment 실행 및 smoke test 통과
- [ ] Production deployment 승인 및 실행

### 배포 후 모니터링
- [ ] 배포 후 24시간 스모크 테스트 반복
- [ ] Vercel 대시보드 또는 로그에서 에러 없음 확인
- [ ] 데이터 저장소 동작 확인 (세션 리포트, 에이전트 상태)
- [ ] API 응답 시간 모니터링 (< 1초 목표)
- [ ] 사용자 보고 이슈 대기 (초기 24시간)

---

## 배포 후 스모크 테스트 (Phase 10)

### 1. 페이지 접근성 검증 (모든 8개 사용자 인터페이스)

배포된 URL에서 다음을 확인:

```bash
# 1. 대시보드
curl https://<your-deployment>/
# 응답: HTML with 최근 세션 리포트 또는 빈 대시보드

# 2. 로드맵 제어 패널
curl https://<your-deployment>/plan
# 응답: HTML with 로드맵 timeline, 에이전트 상태, 현재 작업

# 3. 에이전트 상태
curl https://<your-deployment>/agent-status
# 응답: 에이전트 6개 (Claude Code, Codex, Antigravity, Hermes, Vibe Kanban, User)

# 4. 프롬프트 컴파일러
curl https://<your-deployment>/prompt-compiler
# 응답: 프롬프트 입력 폼 + 컴파일 UI

# 5. Context/Handoff 빌더
curl https://<your-deployment>/context-pack
# 응답: Context Pack 또는 Handoff Pack 생성 폼

# 6. 메모리 (Obsidian 노트)
curl https://<your-deployment>/memory
# 응답: 노트 생성 폼 + 과거 노트 목록

# 7. Hermes 패킷
curl https://<your-deployment>/hermes-packets
# 응답: 패킷 종류 선택기, Markdown 미리보기

# 8. 결과 검토
curl https://<your-deployment>/result-review
# 응답: 결과 분류 및 diff 분석 UI
```

**체크리스트**:
- [ ] `/` 로드 (HTTP 200)
- [ ] `/plan` 로드 및 로드맵 timeline 렌더링
- [ ] `/agent-status` 로드 및 6개 에이전트 표시
- [ ] `/prompt-compiler` 로드 및 프롬프트 생성 동작
- [ ] `/context-pack` 로드 및 폼 제출 동작
- [ ] `/memory` 로드 및 노트 생성 동작
- [ ] `/hermes-packets` 로드 및 패킷 선택 동작
- [ ] `/result-review` 로드 및 분류 UI 동작
- [ ] 모든 페이지에서 404 또는 500 에러 없음
- [ ] 콘솔에 JavaScript 에러 없음 (F12 DevTools)

### 2. API 엔드포인트 검증

```bash
# 로드맵 데이터
curl -X GET https://<your-deployment>/api/roadmap \
  -H "Content-Type: application/json"
# 응답: roadmap data JSON (또는 초기값)

# 에이전트 상태
curl -X POST https://<your-deployment>/api/agent-status \
  -H "Content-Type: application/json" \
  -d '{}'
# 응답: 6개 에이전트 상태 배열

# 기술 번역 (orchestration)
curl -X POST https://<your-deployment>/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"direction":"테스트 방향","projectDocs":"테스트 문서"}'
# 응답: 로드맵 + 작업 분해

# Vibe Kanban 프로젝트 목록 (mock 또는 실제)
curl -X POST https://<your-deployment>/api/vibe-kanban/projects \
  -H "Content-Type: application/json" \
  -d '{"force_mock":true}'
# 응답: 프로젝트 배열 (또는 mock)

# diff 분석
curl -X POST https://<your-deployment>/api/analyzer \
  -H "Content-Type: application/json" \
  -d '{"before":"// old","after":"// new"}'
# 응답: 분석 결과

# 루프 계속
curl -X POST https://<your-deployment>/api/loop-continue \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","lastResult":"test"}'
# 응답: 다음 단계 추천
```

**체크리스트**:
- [ ] `GET /api/roadmap` → 200 OK + JSON
- [ ] `POST /api/agent-status` → 200 OK + 6개 에이전트
- [ ] `POST /api/orchestrate` → 200 OK + 로드맵 데이터
- [ ] `POST /api/vibe-kanban/projects` → 200 OK + 배열
- [ ] `POST /api/analyzer` → 200 OK + 분석 결과
- [ ] `POST /api/loop-continue` → 200 OK + 다음 단계
- [ ] 모든 API 응답에 에러 메시지 없음

### 3. 데이터 저장소 검증

```bash
# Supabase 연결 테스트 (환경 변수 설정된 경우)
# 1. Supabase 대시보드 → Table Editor
# 2. 테이블 7개 확인:
#    - projects
#    - tasks
#    - handoffs
#    - session_reports
#    - feature_plans
#    - execution_logs
#    - agent_statuses

# JSON fallback 테스트 (Supabase 미설정된 경우)
# 1. Vercel 로그 확인:
#    - "Falling back to JSON storage" 메시지 존재
# 2. `/api/reports` (POST) 테스트:
#    - 로컬: 파일에 저장됨 (재배포 후 보존)
#    - Vercel: ephemeral (재배포 시 손실)
```

**체크리스트**:
- [ ] Supabase 환경 변수 설정 여부 확인
- [ ] Supabase 사용 시: 테이블 7개 생성됨
- [ ] Supabase 미사용 시: JSON fallback 로그 확인
- [ ] Session report 저장 테스트 (POST /api/reports)
- [ ] Agent status 저장 테스트 (POST /api/agent-status)
- [ ] 데이터 조회 테스트 (GET /api/roadmap)

### 4. 로그 모니터링

```bash
# Vercel 배포
# 1. Vercel 대시보드 → Deployments → 선택
# 2. "Logs" 탭 확인
# 3. 에러 메시지 없음 확인
# 4. API 성공 로그 확인

# 수동 호스팅
tail -f logs/app.log  # 또는 PM2 로그
pm2 logs "agent-control-room"
```

**체크리스트**:
- [ ] 배포 로그 성공 (no build errors)
- [ ] 런타임 에러 없음
- [ ] API 요청 성공 (200, 201 상태 코드)
- [ ] Supabase 연결 성공 (또는 JSON fallback 작동)

---

## 배포 플랫폼별 최종 단계 (Phase 10)

### Vercel (권장 - Next.js 최적화)

```bash
# 1. Vercel CLI 설치 (또는 GitHub 연결로 자동 배포)
npm install -g vercel

# 2. 초기 배포 (대화형)
vercel
# 또는 자동 배포
vercel --prod

# 3. 환경 변수 설정 (대시보드 또는 CLI)
# 설정 위치: Vercel Dashboard → 프로젝트 → Settings → Environment Variables

# 4. Preview deployment 테스트
# Vercel는 자동으로 PR마다 preview 배포 생성

# 5. Production deployment 확인
# Vercel Dashboard → Deployments → 최신 배포 클릭
```

**이점**:
- Next.js 공식 호스팅 (최고 성능)
- 자동 HTTPS, CDN, 무료 SSL
- GitHub 자동 연결 (push → 배포)
- 무료 플랜 (프로토타입용) + Pro (프로덕션용)

**주의**:
- Supabase 환경 변수 필수 (JSON fallback은 ephemeral)
- 빌드 시간 < 5분 목표

### 수동 배포 (Node.js 호스팅)

```bash
# 1. 서버 준비 (예: DigitalOcean, AWS, Linode)
# Node.js 18+ 설치

# 2. 빌드 및 시작
npm run build
NODE_ENV=production npm start

# 3. PM2로 백그라운드 실행 (권장)
npm install -g pm2
pm2 start "npm start" --name "agent-control-room"
pm2 startup
pm2 save

# 4. Nginx/Apache 리버스 프록시 설정
# :3000 (Node.js) ← :80/:443 (Nginx)

# 5. SSL 인증서 설정 (Let's Encrypt)
certbot certonly --webroot -w /var/www/html -d yourdomain.com
# Nginx 설정에 추가
```

**이점**:
- 완전한 제어
- 자체 서버에서 파일 시스템 persistence 가능
- 맞춤형 환경 변수 관리

**주의**:
- 서버 관리 필요 (패치, 모니터링)
- SSL 갱신 자동화 필요
- 로드 밸런싱 별도 구성

### Docker (선택)

```dockerfile
FROM node:18-alpine
WORKDIR /app

# 빌드 스테이지
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# 런타임 스테이지
FROM node:18-alpine
WORKDIR /app
COPY --from=0 /app/.next ./.next
COPY --from=0 /app/node_modules ./node_modules
COPY --from=0 /app/package.json ./

EXPOSE 3000
ENV NODE_ENV=production
CMD ["npm", "start"]
```

```bash
# 빌드
docker build -t agent-control-room:latest .

# 실행
docker run -p 3000:3000 \
  -e OPENAI_API_KEY=sk-... \
  -e NEXT_PUBLIC_SUPABASE_URL=... \
  -e NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  agent-control-room:latest

# Docker Compose 사용 (권장)
docker-compose up -d
```

**이점**:
- 일관된 환경 (로컬 개발 = 프로덕션)
- Kubernetes 호스팅 가능
- CI/CD 파이프라인 자동화

---

## 참고 (Phase 10 기준)

- **현재 버전**: Phase 10 (Roadmap-first Control Tower)
- **저장소**: JSON (MVP) + Supabase PostgreSQL (권장)
- **권장 배포**: Vercel (Next.js 최적화, 자동 HTTPS, CDN)
- **대체 배포**: Node.js 수동 호스팅 또는 Docker
- **보안**: npm audit 통과 (2 moderate, non-exploitable)
- **성능**: core bundle 88-105 kB, page load < 2초
- **지원 페이지**: 15개 (사용자 인터페이스)
- **지원 API**: 18개 엔드포인트
- **배포 후 모니터링**: 초기 24시간 + 지속적
