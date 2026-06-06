# index · acr-kernel

Harness 14단계(`lib/harness/harness-pipeline.ts` `runHarness`):
validate → context pack → approval → mode → workspace → command guard → agent → logs → diff → verify → boundary → result packet → handoff → return.

- 모드 rail: direct(C0) · safe_solo(C1) · standard(C2) · strict(C3~C4, 승인) · parallel_patch(C5).
- Context Pack: `lib/harness/context-harness.ts` `selectContextPack(workType|domains)`.
- 타입: `lib/harness/types.ts` (`HarnessInput`/`HarnessOutput`).
- Result Packet recommendation: merge_ready / human_review / retry_* / blocked / discard_patch.
