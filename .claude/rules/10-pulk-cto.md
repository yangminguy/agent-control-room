# 10 · pulk CTO Contract

pulk CTO가 상위 판단자. ACR은 Work Order를 받아 실행만 한다.

- 입력: `CTOExecutionWorkOrder`(PRD §10) → `HarnessInput`(`lib/harness/types.ts`).
- ACR은 "무엇을 할지" 재기획하지 않는다. complexity/agent/mode는 CTO가 정함.
- 출력: `HarnessOutput` / Result Packet을 pulk CTO에 반환. pulk가 source of truth.
- pulk repo: `/Users/wonminyang/Desktop/pulk`.
