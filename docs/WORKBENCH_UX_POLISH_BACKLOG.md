# WORKBENCH_UX_POLISH_BACKLOG.md

**Status:** Active Backlog — Not Blocking  
**Created:** 2026-05-21  
**Source:** UX Gap Review following Workbench / Local Runner safety bundle completion  
**Owner:** Product / Antigravity (UX), Claude Code (implementation)

---

## 1. Current Status

The **Workbench / Local Runner UX safety bundle is complete** as of 2026-05-21.

Validation passed:
- `npm run typecheck` ✅
- `npm run lint` ✅
- `npm run test` ✅
- `npm run build` ✅

Codex QA found one required copy issue; Claude Code fixed it before the bundle was closed.

### Agent Execution Boundary — Locked, Do Not Change

| Agent | Execution Mode | Notes |
|---|---|---|
| **Claude Code** | ✅ Local Runner Executable | Only agent with direct execution through `/api/runner` |
| **Codex** | 📋 Manual Handoff | Copy-ready prompt, user runs manually |
| **Antigravity** | 📋 Manual UI/Visual Work | Copy-ready prompt, user runs manually |
| **Hermes** | 🔄 Background Worker | Summary / memory / Context Pack generation only |
| **Vibe Kanban** | 🌐 Session / Diff / Preview | External workbench surface, issue export only |

The approval gate, runner allowlist, and approval token semantics were **not weakened** during this bundle. Claude Code remains the only agent spawnable through the local runner.

---

## 2. Future UX Polish Backlog

Items are ordered within each priority tier by user impact. None of these items block the current completed state.

> These items were identified during the post-implementation UX gap review conducted on 2026-05-21.
> They represent copy clarity, display name consistency, and minor PM-experience improvements only.

---

### P0 — Must Fix Before Runner Expansion

These items must be resolved **before onboarding a second executable agent** (e.g., Codex CLI if verified, or a future runner agent). They are not blockers today because Claude Code is the only runner.

---

#### WUX-01 — Add graceful display handling for Hermes

| Field | Value |
|---|---|
| **Priority** | P0 |
| **Risk** | Low — copy/UI only |
| **Owner** | Antigravity |
| **File** | `components/workbench/ExecutionReadinessGate.tsx` |

**Problem:** `AGENT_EXECUTION_MODE` does not include `hermes`. If a task is ever assigned to Hermes, the component will access `undefined` and likely crash or render nothing.

**Required fix:** Add a `hermes` entry to `AGENT_EXECUTION_MODE` with `type: 'background'` and clear Korean copy explaining Hermes is a background-only worker.

**Suggested copy:**
```
label: '백그라운드 워커 전용'
description: 'Hermes는 요약 생성, 메모리 저장, Context Pack 생성에만 사용됩니다. 코드를 직접 실행하지 않습니다. 아래 패킷을 검토하고 복사하세요.'
```

---

#### WUX-02 — Add graceful display handling for Vibe Kanban

| Field | Value |
|---|---|
| **Priority** | P0 |
| **Risk** | Low — copy/UI only |
| **Owner** | Antigravity |
| **File** | `components/workbench/ExecutionReadinessGate.tsx` |

**Problem:** `AGENT_EXECUTION_MODE` does not include `vibe-kanban`. Same crash/undefined risk as WUX-01.

**Required fix:** Add a `vibe-kanban` entry with `type: 'external'` and copy explaining it is an external workbench, not a local runner.

**Suggested copy:**
```
label: '외부 워크벤치 (Vibe Kanban)'
description: 'Vibe Kanban은 이슈 관리, 워크스페이스, 세션, 차이점 검토를 위한 외부 도구입니다. Agent Control Room에서 직접 실행할 수 없습니다. 아래 이슈를 내보내세요.'
```

---

### P1 — Should Fix Before Broader User Testing

These items affect PM comprehension on first use. A PM unfamiliar with the system will be confused by raw agent IDs, missing action buttons, or developer-facing output labels.

---

#### WUX-03 — Replace raw agent IDs with display names in task header badge

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Risk** | Low — copy/UI only |
| **Owner** | Antigravity |
| **File** | `components/workbench/ExecutionReadinessGate.tsx` L123–125 |

**Problem:** The agent badge in the task header renders the raw system key `claude-code`, `codex`, `antigravity` directly. A non-developer PM does not know what `claude-code` means.

**Required fix:** Add an `AGENT_DISPLAY_NAME` map:
```ts
const AGENT_DISPLAY_NAME: Record<AgentType, string> = {
  'claude-code': 'Claude Code',
  'codex': 'Codex',
  'antigravity': 'Antigravity',
  'hermes': 'Hermes',
  'vibe-kanban': 'Vibe Kanban',
};
```
Use `AGENT_DISPLAY_NAME[task.assignedAgent]` wherever the agent ID is shown as a label to the PM.

---

#### WUX-04 — CTA button must include the agent name

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Risk** | Low — copy/UI only |
| **Owner** | Claude Code |
| **File** | `components/runner/RunnerLogView.tsx` L165 |

**Problem:** The approval CTA reads `"승인 후 에이전트 실행"`. The spec requires the agent name to be explicit: `"승인 후 Claude Code 실행"`. A PM clicking a generic "에이전트 실행" button does not know which tool will start.

**Required fix:**
```tsx
// Add to RunnerLogView or pass from parent:
const AGENT_DISPLAY: Record<AgentType, string> = { 'claude-code': 'Claude Code', ... };

// Button label:
isRunning ? "실행 중..." : isComplete ? "완료됨" : `승인 후 ${AGENT_DISPLAY[agent]} 실행`
```

---

#### WUX-05 — Add "완료로 표시 ✓" action after successful completion

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Risk** | Medium — triggers a task status update |
| **Owner** | Claude Code |
| **File** | `components/workbench/WorkbenchRunPanel.tsx` L372–383 |

**Problem:** When `completionJudgment === 'completed'`, the panel shows a prose next-steps list but no action button. The PM is told "실행 계획에서 다음 작업을 선택하세요" but cannot mark this task complete from the Workbench. The roadmap stays un-updated until the PM manually navigates to `/plan`.

**Required fix:** Add a "완료로 표시 ✓" button in the completed branch. It should call a task-status update endpoint (e.g., `PATCH /api/tasks/[id]` with `{ status: 'done' }`). Only enable this button when `completionJudgment === 'completed'` — never for `partial` or `not_completed`.

---

#### WUX-06 — Add "Codex QA로 전달" action when validation fails

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Risk** | Low — generates copy-ready handoff, no execution |
| **Owner** | Antigravity |
| **File** | `components/workbench/WorkbenchRunPanel.tsx` L410–457 |

**Problem:** When execution completes but `completionJudgment !== 'completed'`, the action panel does not surface a Codex QA handoff option. The PM sees "핸드오프 초안 준비" which links to `/hermes-packets` — but this is a Hermes-specific flow, not a Codex QA flow. There is no path that says "이 실패를 Codex에 보내서 QA/수정을 요청하세요."

**Required fix:** Add a "Codex QA로 전달" button in the partial/failed branch. It should open a copy-ready Codex QA handoff panel (draft only — no execution). The panel must clearly state: "Codex에 직접 붙여넣어 QA/수정을 요청하세요. 자동으로 실행되지 않습니다."

---

#### WUX-07 — Hide or de-emphasize exit code in PM-facing status badge

| Field | Value |
|---|---|
| **Priority** | P1 |
| **Risk** | Low — display-only |
| **Owner** | Claude Code |
| **File** | `components/runner/RunnerLogView.tsx` L189 |

**Problem:** The completion badge shows `종료 코드: 0` or `종료 코드: 1` alongside the ✅/❌ result. "종료 코드" is a developer concept. A PM does not know what an exit code is and may be confused by a number appearing in a result summary.

**Required fix:** Remove `종료 코드: {exitCode}` from the PM-facing status badge. The exit code can remain visible inside the terminal log panel (black background) where a developer would look. The PM-facing badge needs only the icon and "성공" / "실패" text.

---

### P2 — Polish

These items improve the overall experience but do not block PM comprehension of the core flow.

---

#### WUX-08 — Fix Korean fallback for analyzer error

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | Low — error copy only |
| **Owner** | Claude Code |
| **File** | `components/workbench/WorkbenchRunPanel.tsx` L131 |

**Problem:** If the analyzer API returns an empty error, the PM sees the English fallback string `"Analyzer request failed."` in an otherwise Korean UI.

**Required fix:**
```ts
throw new Error(data.error || "분석 요청에 실패했습니다.");
```

---

#### WUX-09 — Rewrite misleading Codex failure copy

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | Low — copy only |
| **Owner** | Claude Code |
| **File** | `components/workbench/WorkbenchRunPanel.tsx` L290 |

**Problem:** The failure state shows: `"여전히 실패하면 Codex 또는 Claude Code 명시적 실행을 고려하세요"`. Two issues: (a) "명시적 실행" is technical jargon, (b) it implies Codex can execute directly, which violates the manual-handoff boundary.

**Required fix:**
```
여전히 실패하면 Codex에 수동으로 전달하거나 담당자에게 문의하세요.
```

---

#### WUX-10 — Add elapsed time counter during execution

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | Low — UI display only, no state/API changes |
| **Owner** | Claude Code |
| **File** | `components/runner/RunnerLogView.tsx` |

**Problem:** When Claude Code is running without stdout for several minutes, the PM sees only `"실행 중..."` on the button with no indication of elapsed time. After 3+ silent minutes, the PM cannot tell if the tool is working or frozen.

**Required fix:** Add a `useEffect` + `setInterval(1000)` timer that starts when `isRunning` becomes `true` and stops on completion. Display as: `"실행 중... (2분 15초 경과)"` next to or below the button.

---

#### WUX-11 — Add mobile collapse for long runner logs

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | Low — layout/responsive only |
| **Owner** | Antigravity |
| **File** | `components/runner/RunnerLogView.tsx` L197–223 |

**Problem:** The full `max-h-96` log panel renders unconditionally regardless of screen width. On narrow mobile screens (< 768px), this pushes the result summary and action buttons far off-screen, requiring significant scrolling before the PM can take an action.

**Required fix:** Wrap the log panel in a responsive disclosure pattern — collapsed by default at < 768px, expanded by default at ≥ 768px. A `"실행 로그 보기 ▾"` toggle button should be shown on mobile. A `hidden md:block` Tailwind utility or a `useState` toggle conditioned on `window.innerWidth` are both acceptable approaches.

---

#### WUX-12 — Surface blocked file paths visibly if task data provides them

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | Low — display only, reads from existing task data |
| **Owner** | Antigravity |
| **File** | `components/workbench/ExecutionReadinessGate.tsx` |

**Problem:** The `forbiddenFiles` checkbox tells the PM "패키지 파일(.json), 환경 파일(.env), 데이터베이스 마이그레이션 스크립트는 수정되지 않습니다." This is a generic promise, not a specific list. If the task's data model includes a `blockedFiles` or `doNotEdit` array, those specific paths should be rendered as a visible list before the approval CTA.

**Required fix (conditional):** If `task.blockedFiles` exists and has items, render a visible list:
```
🚫 수정 금지 파일:
  • lib/storage/json-store.ts
  • package.json
  • .env.local
```
This section must appear above the approval CTA and must never be collapsed before the user has approved.

---

#### WUX-13 — Improve vague scroll-dependent completion copy

| Field | Value |
|---|---|
| **Priority** | P2 |
| **Risk** | Low — copy only |
| **Owner** | Claude Code |
| **File** | `components/runner/RunnerLogView.tsx` L241 |

**Problem:** After a successful run, the PM sees: `"아래의 분석 결과를 확인하고 다음 단계를 진행하세요."` The word "아래" (below) is ambiguous — on many screens, the result panel is not immediately visible without scrolling, leaving the PM unsure what to look at.

**Required fix:**
```
실행이 완료되었습니다. 아래에서 변경된 파일과 다음 조치를 확인하세요.
```
Consider also adding a small scroll-to-result affordance (anchor link or smooth-scroll button: "결과 보기 ↓").

---

### Later — Optional / Low-Value

These items are quality-of-life improvements with diminishing returns relative to effort.

#### WUX-14 — Timestamp prefix in runner log entries

| Field | Value |
|---|---|
| **Priority** | Later |
| **Risk** | Low |
| **Owner** | Claude Code |

**Note:** The spec mentions an optional timestamp prefix for log lines. Not needed for PM readability — only useful for developer debugging. Implement only if Claude Code debugging sessions require it.

---

#### WUX-15 — Handoff document preview before sending

| Field | Value |
|---|---|
| **Priority** | Later |
| **Risk** | Low — read-only preview |
| **Owner** | Antigravity |

**Note:** The spec requires "Prepare Handoff" to show a handoff document preview before it is sent. The current "핸드오프 초안 준비" link navigates away to `/hermes-packets`. A modal or inline preview of the draft would reduce context loss. Implement when the handoff flow is revisited.

---

## 3. Priority Distribution Summary

| Priority | Count | Items |
|---|---|---|
| **P0 — Must fix before runner expansion** | 2 | WUX-01, WUX-02 |
| **P1 — Should fix before broader user testing** | 5 | WUX-03, WUX-04, WUX-05, WUX-06, WUX-07 |
| **P2 — Polish** | 6 | WUX-08, WUX-09, WUX-10, WUX-11, WUX-12, WUX-13 |
| **Later — Optional** | 2 | WUX-14, WUX-15 |
| **Total** | **15** | |

---

## 4. Blocking Assessment for Next `/plan` Roadmap Work

**None of these items block the next roadmap task.**

The current Workbench / Local Runner safety bundle is complete and validated. The P0 items (WUX-01, WUX-02) become blocking only when a second executable agent is considered. The P1 items (WUX-03 through WUX-07) should be addressed before the Workbench is shown to a wider audience or included in onboarding flows.

**Recommended trigger:** Schedule a UX polish sprint before the first external demo or user test of the Workbench. P0 and P1 items should all be resolved by that point.

---

## 5. Do-Not-Do Reminder

Future Workbench UX polish work **must not**:

- ❌ Add direct execution support for Codex
- ❌ Add direct execution support for Antigravity
- ❌ Add Hermes CLI or API execution capability
- ❌ Add direct execution support for Vibe Kanban
- ❌ Change approval token semantics (context-bound, 5-min TTL, one-time use)
- ❌ Modify the runner allowlist to add new agents without a separate security review
- ❌ Add deployment automation
- ❌ Add database migration execution
- ❌ Add git push, merge, or auto-merge capability
- ❌ Add any execution path that bypasses the human approval gate

Any item that touches `app/api/runner/route.ts`, `app/api/workbench/approval/route.ts`, `lib/runner/`, or the approval checklist logic requires a dedicated security review task — not a UX polish task.

---

## 6. Related Documents

| Document | Relevance |
|---|---|
| [`docs/WORKBENCH_RUNNER_UX_SPEC.md`](file:///Users/wonminyang/Desktop/양원민%20개발자/agent_control_room_docs/docs/WORKBENCH_RUNNER_UX_SPEC.md) | Original UX spec this backlog derives from |
| [`docs/EXECUTION_UI_SPEC.md`](file:///Users/wonminyang/Desktop/양원민%20개발자/agent_control_room_docs/docs/EXECUTION_UI_SPEC.md) | Component-level prop specs and status map |
| [`docs/EXECUTION_CONTROL_TOWER_UX.md`](file:///Users/wonminyang/Desktop/양원민%20개발자/agent_control_room_docs/docs/EXECUTION_CONTROL_TOWER_UX.md) | Layout, button label rules, mobile UX patterns |
| [`docs/LOCAL_RUNNER_ARCHITECTURE.md`](file:///Users/wonminyang/Desktop/양원민%20개발자/agent_control_room_docs/docs/LOCAL_RUNNER_ARCHITECTURE.md) | Agent adapter model and safety boundary |
| [`docs/QA_EXECUTION_MANAGER.md`](file:///Users/wonminyang/Desktop/양원민%20개발자/agent_control_room_docs/docs/QA_EXECUTION_MANAGER.md) | QA regression checks and failure scenarios |
