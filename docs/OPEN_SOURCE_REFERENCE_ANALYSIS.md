# Open Source Reference Analysis

## 1. Repositories Inspected

| Repo | Clone URL | Commit SHA | Date Checked | Status |
|---|---|---:|---|---|
| BloopAI/vibe-kanban | https://github.com/BloopAI/vibe-kanban.git | `4deb7eca8f381f7cbc1f9d15515a9ab8f8009053` | 2026-05-25 | cloned ✅ |
| Dimillian/CodexMonitor | https://github.com/Dimillian/CodexMonitor.git | `dd61b9abd37de5ded86e82b9fe8a83fd49d46fa5` | 2026-05-25 | cloned ✅ |
| ralfkuh-lab/agy-skill | https://github.com/ralfkuh-lab/agy-skill.git | `064605a92acec84b8b01710d33284f70e1843840` | 2026-05-25 | cloned ✅ |
| builderz-labs/mission-control | https://github.com/builderz-labs/mission-control.git | `85215c577f491cf570aa667e6757d8b30e201d0a` | 2026-05-25 | cloned ✅ |

---

## 2. Files Actually Read

| Repo | File Path | Why Read | Relevant Pattern |
|---|---|---|---|
| agy-skill | `README.md` | agy 실행 규칙 | settings.json 모델 감지/전환 방식 |
| agy-skill | `SKILL.md` | Antigravity CLI 매뉴얼 | `-p` flag는 마지막, jq 기반 settings.json 편집 |
| vibe-kanban | `shared/types.ts` | Workspace 타입 | `Workspace.task_id`, `Session.workspace_id` 1:1 연결 |
| vibe-kanban | `crates/server/src/routes/workspaces/git.rs` | branch/worktree 관리 | `RepoBranchStatus`, target_branch 추적 |
| vibe-kanban | `crates/server/src/routes/workspaces/streams.rs` | diff streaming | WebSocket을 통한 실시간 diff 제공 |
| CodexMonitor | `src/types.ts` | Workspace 정의 | `WorkspaceInfo`, `WorktreeInfo.branch` |
| CodexMonitor | `src-tauri/src/shared/workspaces_core/worktree.rs` | worktree 경로 패턴 | `data_dir/worktrees/<parent_id>/` |
| CodexMonitor | `src-tauri/src/git_utils.rs` | git diff 처리 | 파일별 `additions/deletions` 집계 |
| mission-control | `src/lib/agent-workspace.ts` | 워크스페이스 후보 탐색 | `getAgentWorkspaceCandidates()` fallback 경로 |
| mission-control | `src/lib/workspaces.ts` | DB 기반 workspace CRUD | `getWorkspaceForTenant()` 패턴 |
| mission-control | `src/lib/skill-registry.ts` | 스킬 등록 | `SecurityReport(clean/warning/rejected)` 3단계 |
| mission-control | `src/lib/agent-runtimes.ts` | 보안 스크립트 | injection guard, 해시 검증 |

---

## 3. Pattern Extraction

| Pattern | Source Repo | Source File | Adopt? | Reason |
|---|---|---|---|---|
| Workspace-per-task (task_id 1:1) | vibe-kanban | `shared/types.ts` | **Yes** | Phase B: 모든 실행을 workspace에 귀속시키기 위해 필수 |
| worktree 저장 경로 (`data_dir/worktrees/<id>/`) | CodexMonitor | `worktree.rs` | **Yes** | Phase B: 파일 경로 일관성 |
| settings.json 기반 모델 감지 (jq) | agy-skill | `SKILL.md` | **Yes** | Phase A: Antigravity 자동 전환 구현 필수 |
| `-p` flag ordering (항상 마지막) | agy-skill | `SKILL.md` | **Yes** | Phase A: agy 호출 규칙 |
| diff = `{path, additions, deletions}` 최소 단위 | CodexMonitor | `git_utils.rs` | **Yes** | Phase B: diff review 구조 |
| session/thread resume (context 저장) | CodexMonitor | `src/types.ts` | **Yes** | Phase B/C: 에이전트 context 복원 |
| SecurityReport(clean/warning/rejected) | mission-control | `skill-registry.ts` | **Yes** | Phase C: subagent 등록 검증 |
| resolveWithin() 경로 탈출 방지 | mission-control | `agent-workspace.ts` | **Yes** | Phase B: workspace 보안 |
| ExecutorConfig 통일 인터페이스 | vibe-kanban | `shared/types.ts` | **Adapt** | 현재 3개 agent로 제한 → 6개 지원으로 확장 |
| Hermes는 감시만 (코딩 아님) | 현재 프로젝트 | `CONTROL_TOWER_DIRECTION.md` | **Yes** | 기존 설계 유지 |

---

## 4. What We Will Not Copy

- Vibe Kanban 전체 아키텍처 복제 (Rust 백엔드 + React 프론트엔드는 과도함)
- CodexMonitor의 Tauri 데스크톱 앱 구조
- mission-control의 SQLite + tenant 격리 시스템 (Supabase 사용 중)
- 원본 코드 대량 복붙 (패턴만 흡수)

---

## 5. Proposed Changes to Agent Control Room

| Current File | Proposed Change | Reference | Phase |
|---|---|---|---|
| `lib/agents/antigravity-model-detection.ts` | settings.json 기반 모델 감지/전환 구현 (현재 placeholder) | agy-skill/SKILL.md | A |
| `lib/agents/antigravity-runner.ts` | agy `-p` flag ordering 규칙 적용 | agy-skill/SKILL.md | A |
| (신규) `lib/workspace/agent-workspace-types.ts` | `AgentWorkspace` 타입, task_id 1:1 | vibe-kanban/shared/types.ts | B |
| (신규) `lib/workspace/workspace-store.ts` | workspace 영속화 | CodexMonitor/src/types.ts | B |
| (신규) `lib/workspace/workspace-resolver.ts` | worktree 경로 패턴 | CodexMonitor/worktree.rs | B |
| (신규) `lib/orchestration/subagent-types.ts` | SubagentSpec, AgentTeamPlan 타입 | mission-control/skill-registry.ts | C |
| (신규) `lib/orchestration/subagent-registry.ts` | subagent 등록, SecurityReport 3단계 | mission-control/skill-registry.ts | C |
| `lib/orchestration/types.ts` | OrchestrationDecision에 `subagentTeam` 필드 추가 | 현재 설계 | C |

---

## 6. Risks

| Risk | Mitigation |
|---|---|
| License compatibility | agy-skill은 문서만, 코드는 우리가 작성. MIT 준수 예상 |
| Architecture mismatch | vibe-kanban은 Rust 기반이지만, 타입 패턴만 참고하므로 무관 |
| Overfitting to external impl | 패턴 추출 후 우리 아키텍처에 맞게 재설계 |
| Reference repo staleness | clone 당시 최신 버전이므로 적절함 |
| settings.json 없는 환경 | 현재 사용자 환경에서 확인됨 (존재) |

---

## 7. Decision

**Proceed with:**
1. ✅ Phase A — Antigravity Runtime Fix (agy-skill 패턴)
2. ✅ Phase B — Workspace Layer (vibe-kanban + CodexMonitor 패턴)
3. ✅ Phase C — Subagent Registry (mission-control 패턴)
4. ✅ Phase D~H — 나머지 Phase들

**Do not proceed with:**
- Vibe Kanban 전체 구조 마이그레이션
- Tauri 데스크톱 앱화
- SQLite 도입 (Supabase 유지)

---

## 8. Implementation Evidence

- `/Users/wonminyang/Desktop/양원민 개발자/agent-control-room-references/vibe-kanban/` — 실제 clone
- `/Users/wonminyang/Desktop/양원민 개발자/agent-control-room-references/CodexMonitor/` — 실제 clone
- `/Users/wonminyang/Desktop/양원민 개발자/agent-control-room-references/agy-skill/` — 실제 clone
- `/Users/wonminyang/Desktop/양원민 개발자/agent-control-room-references/mission-control/` — 실제 clone
- agy binary: `/Users/wonminyang/.local/bin/agy` ✅
- settings.json: `~/.gemini/antigravity-cli/settings.json` ✅

---

**승인 상태:** ✅ 모든 Phase 0 조건 충족. Phase A부터 시작 가능.
