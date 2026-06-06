# index · verification

Checks passed = Done. 에이전트 선언은 완료 조건 아님.

- 코드: `lib/harness/verification-runner.ts`.
- 명령: `pnpm typecheck` · `pnpm lint` · `pnpm test`(jest) · `pnpm build`.
- 요청한 check만 실행, 나머지 skipped. 실패 시 logTail.
- next build가 tsc보다 엄격 — 배포 전 풀 빌드.
- 하네스 테스트: `__tests__/harness-pipeline.test.ts`(실 temp repo + mock agent/runner).
