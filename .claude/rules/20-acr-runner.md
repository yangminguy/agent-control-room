# 20 · ACR Runner / Harness

`받는다 → 격리 → 실행 → 검사 → result packet 반환`

- Harness 14단계: `lib/harness/harness-pipeline.ts` (`runHarness`).
- Context Pack 선택: `lib/harness/context-harness.ts` (`selectContextPack`).
- Command Guard: `lib/harness/command-guard.ts` (`checkCommand`/`checkCommands`).
- 검증: `lib/harness/verification-runner.ts`. Handoff: `lib/harness/handoff-generator.ts`.
- Agent adapter는 injectable(`AgentRunner`). 실 CLI는 thin adapter로 흡수.
- 기존 `/api/runner`, `lib/runner/*`, `lib/workspace/*` 깨지 말 것(adapter-first).
- ACR UI는 운영자/디버그 화면. PM 메인 대시보드 아님.
