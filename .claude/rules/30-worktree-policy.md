# 30 · Worktree Policy

main repo 직접 수정 금지. run마다 독립 worktree.

- 코드: `lib/worktree/worktree-manager.ts`, `lib/worktree/run-worktree.ts`.
- branch 규칙: `agent/{taskId}-{runId}`.
- 생성 실패 → `status=blocked`. blocked file 수정 → `status=boundary_violation`.
- 금지: `.env` · `node_modules` · `.git` 직접 · lockfile 무단 · base branch 직접.
- diff 수집: `git diff --name-only`, `git diff --stat`. 종료 후 cleanup 가능.
