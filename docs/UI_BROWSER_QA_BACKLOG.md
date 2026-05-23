# UI/UX Browser QA Backlog

## Fixed (P1 - 2026-05-24)

| ID | Severity | Page | Issue | Fix Applied | Related Files |
|---|---|---|---|---|---|
| UI-QA-001 | P1 | /orchestration | 탭 이름이 영어로 표시됨 | 한글 탭명 적용: 실행 판단, 실행 작업 대기열, 실행 결과, 승인 요청, 진행 상황, 피드백, Hermes 인사이트, 실행 로그, 실행 지표, Hermes 실시간 감시 | components/orchestration/OrchestrationPageLayout.tsx |
| UI-QA-002 | P1 | /orchestration | Mock 버튼이 실제 버튼처럼 노출됨 | "[개발용]" 표시 + 아코디언 접기 + 회색 스타일 (opacity-60) → 개발자용임이 명확함 | components/orchestration/OrchestrationPageLayout.tsx |
| UI-QA-003 | P1 | /orchestration | 영어 Empty State 표시 | "아직 실행 대기 중인 작업이 없습니다. 기획 채팅에서 작업을 만들면 여기에 표시됩니다." | components/orchestration/DispatchStatusPanel.tsx |
| UI-QA-004 | P1 | /agent-status | 에이전트 상태가 영어로 표시됨 | 한글 상태 + "할 수 있는 일 / 제한되는 일 / 다음 행동" 3단 설명 추가 | app/agent-status/page.tsx |
| UI-QA-005 | P1 | / | 안내 문구가 영어로 되어있음 | 한글 안내 ("실행 제어판", "기획 채팅" 등) | components/navigation/ControlTowerNav.tsx, components/control-room/ChatControlRoom.tsx |

## Backlog (P2/P3)

| ID | Severity | Page | Issue | Recommendation | Related Files |
|---|---|---|---|---|---|
| UI-QA-006 | P2 | /orchestration | Legacy Advanced Section 존재 | 아코디언으로 이미 접혀있음. 향후 Phase 2 UI 완성 후 제거 예정 | components/orchestration/OrchestrationPageLayout.tsx |
| UI-QA-007 | P2 | /agent-status | 폼이 개발자 툴 같은 느낌 | 상태별 Context 힌트, PM 친화적 색상 강화 필요 (Phase G) | app/agent-status/page.tsx |
| UI-QA-008 | P3 | /dashboard | 대시보드 구체화 부족 | 로드맵 연동 요약 위젯 (Phase H 이후) | app/dashboard/page.tsx |
