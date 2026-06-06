# index · api

ACR Kernel API (3개, `app/api/`):
- `POST /api/execution-runs` — run 생성(run_id, worktree 준비).
- `GET /api/execution-runs/:run_id` — run 조회.
- `POST /api/execution-runs/:run_id/result` — result packet 제출.

- 기존 `/api/runner`는 제거 금지. 새 API는 adapter layer.
- 응답 스키마는 안정적으로 유지. 상세 계약: PRD §9.
