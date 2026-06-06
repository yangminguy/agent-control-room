# 00 · Global Rules (always loaded)

<important>
ACR은 planning brain이 아니다.
pulk CTO가 task/spec/design/risk를 생성한다.
ACR은 execution run, worktree, log, diff, verification, result packet만 담당한다.
</important>

- package manager: pnpm. 검증: `pnpm typecheck` · `pnpm build` · `pnpm test`(jest) · `pnpm lint`.
- 헤드리스 실행 — 슬래시커맨드 불가. context pack(rules+docs/index) + 프롬프트가 그 역할.
- 작업유형에 맞는 rule + docs/index만 로드. 전체 repo 정독 금지.
- 미커밋 111 WIP 파일 불가침. git 커밋/푸시는 오케스트레이터 소유.

## 금지 명령 (§19.1 / §14.8)
`rm -rf` · `git push` · `git reset --hard` · `.env` 수정 · `node_modules`/`.git`/lockfile 직접 수정 · production deploy · DB migration apply · unknown package install.
이 목록은 `lib/harness/command-guard.ts`가 실제로 강제하며, `scripts/hooks/command-guard-hook.mjs`가 PreToolUse로 차단한다.
