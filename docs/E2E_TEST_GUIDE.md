# E2E Test: Complete Feature Loop

**Test Case**: Add task counter to Dashboard
**Duration**: ~5-10분 (수동 실행 기준)
**Base URL**: `http://localhost:3000`
**Prerequisite**: `npm run dev` 실행 중, `data/projects.json`에 `agent-control-room` 프로젝트 존재

---

## Step 1: Direction Input

**진입점**: `/` → 페이지 하단 "New Direction" 섹션

**입력**
```
projectName: "Agent Control Room"
projectContext: ""
direction: "Dashboard에 task counter를 추가해. 완료한 task 수와 남은 task 수를 표시해줘"
```

**UI 검증**
- [ ] "New Direction" 섹션에 `<textarea>` 렌더링 확인
- [ ] 텍스트 입력 후 입력 필드에 한글 깨짐 없이 표시
- [ ] "Orchestrate" 버튼 활성화 확인

---

## Step 2: Orchestration API

**API**: `POST /api/orchestrate`

**curl 테스트**
```bash
curl -X POST http://localhost:3000/api/orchestrate \
  -H "Content-Type: application/json" \
  -d '{"projectName":"Agent Control Room","projectContext":"","direction":"Dashboard에 task counter를 추가해. 완료한 task 수와 남은 task 수를 표시해줘","preferredAgentStatus":"available"}'
```

**검증 항목**
- [ ] HTTP 200 반환
- [ ] `technicalTranslation` 객체 존재
- [ ] `tasks` 배열 길이 >= 1
- [ ] `recommendedAgent`가 "antigravity" 또는 "claude-code"
- [ ] `copyReadyPrompt` 존재

---

## Step 3-9: 나머지 단계

자세한 내용은 docs/E2E_TEST_GUIDE.md 참조

---

## 전체 E2E 통과 기준

| 항목 | 기대값 |
|---|---|
| orchestrate API | HTTP 200, tasks >= 1 |
| feature plan 저장 | data/feature-plans.json에 신규 plan |
| git branch 생성 | `acr/pt-*` 브랜치 존재 |
| execution log 생성 | data/execution-logs.json에 신규 log |
| analyzer 판정 | completionJudgment 업데이트 |
| loop-continue | targetTask.status = "ready" 또는 완주 |
| session report | data/session-reports.json에 신규 report |
| 대시보드 반영 | / 페이지에 Recent Session Report 표시 |
