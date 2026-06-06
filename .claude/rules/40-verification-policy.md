# 40 · Verification Policy

"Agent says done" ≠ Done. Checks passed = Done.

- 코드: `lib/harness/verification-runner.ts` (`runVerification`, `CommandRunner` injectable).
- 프로파일(boolean map): typecheck/lint/test/build/playwright/boundary.
- 명령: `pnpm typecheck` · `pnpm lint` · `pnpm test`(jest) · `pnpm build`.
- 요청한 check만 실행, 나머지는 skipped. 실패 시 logTail 저장.
- boundary는 finalizeDiff가 선계산해 프로파일에 주입.
- next build는 tsc보다 엄격. 배포 전 풀 빌드 필수.
