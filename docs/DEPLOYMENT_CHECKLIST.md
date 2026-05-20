# 배포 준비 체크리스트

## 환경 설정

### 필수 환경 변수 (.env.local 또는 배포 플랫폼)

```
OPENAI_API_KEY=sk-...  # ✓ 설정됨
VIBE_KANBAN_URL=http://localhost:3001  # (옵션) Vibe Kanban 로컬 서버
```

**검증**
```bash
# 현재 상태 확인
cat .env.local

# 배포 전 환경 변수 제거 (보안)
# .env.local을 버전 관리에 포함하지 않음 확인
git check-ignore .env.local  # ".env.local" 출력 = 안전
```

---

## 보안 검사

### 1. API 키 하드코딩 확인

```bash
# 코드베이스에서 API 키가 직접 작성되어 있는지 확인
grep -r "sk-proj" app/ lib/ components/ --include="*.ts" --include="*.tsx"
# 결과: 없어야 함 (모두 환경 변수 사용)
```

**상태**: ✅ PASS
- `app/api/orchestrate/route.ts`: `process.env.OPENAI_API_KEY` 사용

---

### 2. npm 보안 취약점

```bash
npm audit
```

**현재 상태**:
```
5 vulnerabilities (1 moderate, 4 high)
```

**행동 방안**:
- [ ] `npm audit fix` 실행해서 자동 수정 가능한 항목 적용
- [ ] 남은 취약점 평가 (주요도, 영향 범위)
- [ ] 필요시 의존성 버전 업그레이드 또는 대체 패키지 검토

**임시**: 현재 MVP 배포는 가능하나, 프로덕션 전에 해결 권장

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

## 빌드 & 성능

### 1. 프로덕션 빌드

```bash
npm run build

# 예상 출력:
# ✓ Compiled successfully
# ✓ Generating static pages (21/21)
# ○ (Static) prerendered
# ƒ (Dynamic) server-rendered
```

**상태**: ✅ PASS

---

### 2. 번들 크기

```bash
# Next.js build 분석 (@next/bundle-analyzer 필요)
npm run build

# .next/static 디렉토리 크기 확인
du -sh .next/static/

# 페이지별 크기 (위 빌드 로그에서 확인)
```

**현재 페이지 로드 크기** (from build):
- `/`: 3.53 kB page + 99.5 kB First Load JS
- `/plan`: 6.92 kB page + 103 kB First Load JS
- 기타: 1-4 kB 페이지

**평가**: ✅ 적정 수준 (core bundle 87.3 kB)

---

### 3. 동적 경로 확인

```bash
# 빌드 로그에서 확인한 동적 경로:
# ƒ /api/... (모두 서버 렌더링)
# ○ / /projects /reports (정적 사전 생성)

# 이는 다음을 의미:
# - 정적 페이지는 빠른 로딩
# - API는 요청마다 서버에서 처리 (동적 데이터)
```

**상태**: ✅ 최적 구성

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

## 데이터 저장소 (MVP → 프로덕션 전환)

### 현재 상태 (MVP)
- 저장소: 로컬 JSON 파일 (`data/*.json`)
- 한계: 서버리스 환경에서 작동 불가, 다중 인스턴스에서 동시성 문제

### 프로덕션 권장 사항

| 저장소 | 용도 | 비용 | 구현 난도 |
|---|---|---|---|
| **SQLite + S3** | 중소 규모, 서버 호스팅 | 낮음 | 중간 |
| **Supabase (PostgreSQL)** | 스케일 가능, 실시간 | 중간 | 낮음 |
| **Firebase** | 빠른 통합, 백엔드 최소화 | 중간 | 낮음 |
| **MongoDB Atlas** | 문서 기반, 유연성 | 중간 | 중간 |

**MVP 연장**: 현재 JSON + Vercel로도 소규모 사용 가능 (로컬 파일 저장 불가이므로, Vercel KV 또는 Supabase 간단 통합 필요)

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

## 최종 배포 체크리스트

- [ ] `npm run build` 성공 (0 에러)
- [ ] `npm run typecheck` 성공
- [ ] `npm run lint` 성공
- [ ] `.env.local` 제외 확인 (git check-ignore)
- [ ] `OPENAI_API_KEY` 설정 (배포 플랫폼에 저장)
- [ ] npm audit 취약점 평가
- [ ] 페이지 로드 성능 > 3초 목표 확인
- [ ] 에러 페이지 (404, 500) 렌더링 확인
- [ ] 데이터 저장소 마이그레이션 계획 (프로덕션 시)
- [ ] 모니터링 도구 설정 (선택)
- [ ] 초기 배포 후 모니터링 24시간

---

## 배포 후 검증

```bash
# 배포된 URL 접근 테스트
# 1. `/` 대시보드 로드
# 2. `/advisor` 어드바이저 모드
# 3. `/plan` 계획 페이지
# 4. `/reports` 리포트 페이지
# 5. API 건강성 확인: /api/orchestrate (POST)

# 로그 모니터링
# Vercel: Dashboard → Logs
# 수동 호스팅: tail -f logs/app.log
```

---

## 참고

- **현재 버전**: MVP (로컬 JSON 저장소)
- **권장 배포**: Vercel (Node.js + 환경 변수)
- **프로덕션**: Supabase 또는 Firebase로 저장소 마이그레이션
