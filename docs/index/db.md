# index · db

- ExecutionRun 저장소: `lib/storage/execution-run-store.ts` (JSON store, `JSON_STORE_DATA_DIR`).
- Supabase: `@supabase/supabase-js`, `supabase/`.
- migration apply는 금지(§19.1). dry-run만.
- run state는 ACR 소유, planning/task state는 pulk 소유(이중화 금지).
