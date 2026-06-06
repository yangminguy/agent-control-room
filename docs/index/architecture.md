# index · architecture

ACR = pulk CTO의 실행 커널. Next.js + jest + Supabase.

흐름: pulk CTO Work Order → Harness(`lib/harness/`) → Worktree(`lib/worktree/`) → Verifier → Result Packet → pulk 반환.

- `lib/harness/` — 실행 하네스(pipeline, command-guard, context-harness, verification, handoff).
- `lib/execution-run/` — ExecutionRun 타입/모델.
- `lib/worktree/` — sandbox 격리.
- `lib/runner/`, `lib/workspace/`, `app/api/runner` — 기존 runner(불가침, adapter-first).
