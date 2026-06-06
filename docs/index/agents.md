# index · agents

| Agent | 역할 | 코드수정 |
|---|---|---|
| Claude Code | 구현/리팩터링 | O |
| Codex | 검증/테스트/리뷰 | O |
| Antigravity | UI/QA/Playwright | UI 중심 |
| Hermes | 감시/요약/handoff | X |

- Agent adapter는 `AgentRunner`(injectable, `harness-pipeline.ts`).
- ACR은 팀을 기획하지 않는다. CTO plan을 안전 실행만.
- 이유 없는 team/sub-agent 사용은 reject.
