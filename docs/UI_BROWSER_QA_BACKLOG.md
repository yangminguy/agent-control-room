# UI/UX Browser QA Backlog

| ID | Severity | Page | Issue | Why it matters | Recommended Fix | Status | Related Files |
|---|---|---|---|---|---|---|---|
| UI-QA-001 | P1 | /orchestration | "Dispatch Queue" 등 탭 이름이 영어로 표시됨 | 비개발자 PM이 메뉴의 의미(실행 대기, 진행 등)를 이해하기 어려움 | 탭 이름을 한글로 변경 ("실행 제어판", "실행 작업 대기열" 등) | fixed | components/orchestration/OrchestrationPageLayout.tsx |
| UI-QA-002 | P1 | /orchestration | Mock Approve / Mock Reject 버튼이 노출됨 | 일반 사용자나 PM이 실제 승인 프로세스로 오해할 수 있음 | "개발용 모의 승인/거절"로 레이블 변경 및 안내 추가 | fixed | components/orchestration/OrchestrationPageLayout.tsx |
| UI-QA-003 | P1 | /orchestration | 작업이 없을 때 "No jobs match the current filter" 등의 영어 Empty State 표시 | 작업이 없어서 발생한 정상 상태인지, 에러인지 파악하기 어려움 | "아직 실행 대기 중인 작업이 없습니다" 등으로 친절한 한글 안내 제공 | fixed | components/orchestration/DispatchStatusPanel.tsx |
| UI-QA-004 | P1 | /agent-status | "Available", "Manual Only" 등 에이전트 상태가 영어로 표시됨 | 에이전트 가용성과 역할을 PM이 직관적으로 이해하기 어려움 | 상태 및 설명을 한글로 번역 ("사용 가능", "수동 제어 전용" 등) | fixed | app/agent-status/page.tsx |
| UI-QA-005 | P1 | / | "Planning is safe by default" 등 안내 문구가 영어로 되어있음 | 초안 기획과 실제 실행의 분리라는 핵심 개념을 전달하기 부족함 | 기획 제어판 안내를 모두 한글화하여 쉽게 인지하도록 함 | fixed | components/navigation/ControlTowerNav.tsx, components/control-room/ChatControlRoom.tsx |
| UI-QA-006 | P2 | /orchestration | 아직 Legacy Advanced Section이 존재 | 기능이 중복되고 화면이 복잡해 보일 수 있음 | 향후 완전한 Phase 2 UI로 이관 완료 후 레거시 폼 제거 | backlog | components/orchestration/OrchestrationPageLayout.tsx |
| UI-QA-007 | P2 | /agent-status | 폼 UI 요소들이 다소 개발자 툴 같은 느낌을 줌 | PM 친화적인 모던 디자인 가이드(vibrant colors, glassmorphism 등)가 적용되지 않음 | 상태 변경 폼 디자인을 더욱 직관적이고 세련된 카드로 리뉴얼 | backlog | app/agent-status/page.tsx |
| UI-QA-008 | P3 | /dashboard | 전체 프로젝트 상태 대시보드의 구체화 부족 | 여러 프로젝트를 횡단으로 볼 때 현재 진행 단계가 한눈에 들어오지 않을 수 있음 | 로드맵과 연동된 요약 위젯 등 도입 | backlog | app/dashboard/page.tsx |
