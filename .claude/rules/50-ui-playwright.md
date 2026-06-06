# 50 · UI / Playwright

- Next.js(`app/`). ACR UI는 운영자/디버그 화면.
- UI 작업만 Playwright smoke. 실패 시 artifact: `artifacts/runs/{run_id}/`(screenshot, dom-snapshot, error).
- 자동수정 금지 — locator suggestion만(`lib/harness/playwright-artifact.ts`).
- selector는 role/testId 중심.
- next build가 tsc보다 엄격하므로 UI 변경 후 풀 빌드로 확인.
