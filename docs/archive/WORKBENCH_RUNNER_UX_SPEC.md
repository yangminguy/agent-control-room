# WORKBENCH_RUNNER_UX_SPEC.md — Workbench Local Runner UX Specification

**Author:** Antigravity (UI/UX Design Agent)
**Status:** Design Spec — No runtime code modified
**Last Updated:** 2026-05-21
**Target Audience:** Claude Code (execution page implementation), Codex (QA/safety regression), PM reviewer
**Related Docs:**
- `docs/EXECUTION_UI_SPEC.md` — component-level prop specs
- `docs/EXECUTION_CONTROL_TOWER_UX.md` — layout and safety UX patterns
- `docs/LOCAL_RUNNER_ARCHITECTURE.md` — adapter model and safety boundary

---

## 1. Screen Purpose

The **Workbench** (`/workbench`) is the **execution approval and result review screen** for the Agent Control Room.

It answers five questions for a non-developer PM:

| Question | Screen Section |
|---|---|
| What will run? | Task header + agent capability card |
| Which agent can execute? | Agent capability card with execution state badge |
| What risks exist? | Local Risk Warning + Approval Checklist |
| What happened after execution? | Execution Result Summary |
| What should I do next? | Next Action Panel |

### What the Workbench Is NOT

- ❌ Not a code editor or terminal
- ❌ Not a Vibe Kanban board clone
- ❌ Not an autonomous runner that starts without approval
- ❌ Not a multi-agent orchestrator that auto-routes work
- ✅ It is the **human approval gate** that sits between intent and local execution

---

## 2. Agent Execution States

Each agent in the Workbench must be presented with a clearly defined execution state that reflects reality. The state determines which UI card variant is rendered and which actions are available.

### State Definitions

| Agent | Execution State | UI Label (EN) | UI Label (KR) | Executable? |
|---|---|---|---|---|
| **Claude Code** | `local_runner_executable` | Local Runner Executable | 로컬 실행 가능 | ✅ Yes |
| **Codex** | `manual_handoff` | Manual Handoff / QA | 수동 핸드오프 / QA | ❌ No |
| **Antigravity** | `manual_ui_work` | Manual UI / Visual Work | 수동 UI 작업 | ❌ No |
| **Hermes** | `background_worker` | Background Worker / Memory | 백그라운드 워커 | ❌ No |
| **Vibe Kanban** | `session_workbench` | Session / Diff / Preview | 워크벤치 세션 | ❌ No (external) |

### Claude Code — `local_runner_executable`

- Agent badge: Purple, `CheckCircle2` icon, label "로컬 실행 가능"
- Approval gate is enabled
- "승인 후 에이전트 실행" button is available
- Local execution warning is shown before the button
- Risk panel is shown
- Readiness checklist is shown and must be fully green before button activates

### Codex — `manual_handoff`

- Agent badge: Blue, `ClipboardCopy` icon, label "수동 핸드오프"
- No execution button is shown
- "Codex QA 전달" button shown instead (sends structured prompt + context)
- Copy-ready prompt section is shown
- Warning message: "Codex는 현재 수동 전달 방식으로 작동합니다. 직접 실행이 지원되지 않습니다."
- Manual result import section shown after handoff

### Antigravity — `manual_ui_work`

- Agent badge: Amber/Orange, `Paintbrush` icon, label "수동 UI 작업"
- No execution button shown
- "Antigravity에서 열기" guidance shown (manual copy/open)
- Warning message: "Antigravity는 시각적 UI 작업을 위한 수동 도구입니다. 현재 직접 실행은 지원되지 않습니다."
- Manual result import section shown after work is done

### Hermes — `background_worker`

- Agent badge: Gray/Slate, `Bot` icon, label "백그라운드 워커"
- No execution button shown
- "요약 생성" or "Context Pack 생성" copy-action buttons shown (draft only)
- Warning message: "Hermes는 백그라운드 요약 및 메모리 생성에만 사용됩니다. 코드 실행이 지원되지 않습니다."

### Vibe Kanban — `session_workbench`

- Agent badge: Teal/Cyan, `LayoutKanban` icon, label "워크벤치 세션"
- No execution button shown
- "Vibe Kanban으로 전달" export button shown (opens or exports task as issue)
- Warning message: "Vibe Kanban은 실행 워크벤치입니다. Agent Control Room에서 직접 실행할 수 없습니다."

---

## 3. User Flow

The Workbench follows a strict left-to-right, top-to-bottom approval progression. No step can be skipped.

```
Step 1: User reviews task
        ↓
Step 2: User checks readiness checklist
        ↓ (all required items must be green)
Step 3: User confirms local execution (reads risk warning + checks acknowledgment)
        ↓ (approval gate unlocks)
Step 4: Runner starts (SSE stream begins)
        ↓
Step 5: Logs stream in real time
        ↓ (exit code received)
Step 6: Result summary appears (changed files, validation, plain-language outcome)
        ↓
Step 7: User sees next action (retry / handoff / mark complete)
```

### Step 1 — Task Review

The user sees:
- Task ID and title (large, prominent)
- Task description in plain language (1–3 sentences)
- Acceptance criteria (bullet list)
- Files allowed to be edited (bounded list)
- Files that must NOT be touched (blocked list — never collapsible)

### Step 2 — Readiness Checklist

The user reviews each checklist item:

| Checklist Item | Required | What it confirms |
|---|---|---|
| agent_selected | ✅ | Agent is Claude Code (or confirmed manual) |
| prompt_ready | ✅ | Senior Dev Prompt is compiled |
| project_path | ✅ | Working directory is set and valid |
| allowed_files | ✅ | At least one allowed file defined |
| blocked_files | ✅ | Blocked file list reviewed |
| branch_ready | ⚠️ | Git branch created (warns if missing) |
| validation_cmd | ⚠️ | Post-run validation command defined |
| human_approved | ✅ | User has read and acknowledged risk |

Rules:
- Required items missing → "승인 후 에이전트 실행" button remains disabled
- Warning items → shown in amber, non-blocking
- "checking" state → spinner while async validation runs

### Step 3 — Execution Confirmation

Before the button activates, the user must:
1. Read the local execution warning (inline text, not modal)
2. Check the risk acknowledgment checkbox (if risk level is "high")
3. Confirm no required checklist items are missing

The approval button label must include the agent name:
> "승인 후 Claude Code 실행" — not just "실행" or "승인"

### Step 4 — Runner Start

When the user clicks the approval button:
1. A server-issued, context-bound, one-time approval token is requested
2. The runner endpoint (`/api/runner`) is called with the token
3. A git branch is created from the current HEAD
4. Claude Code CLI is spawned locally
5. SSE stream opens to the UI

The UI transitions to the "실행 중" state:
- Status badge updates to `running` with pulse animation
- Elapsed time counter starts (prevents PM panic after 3+ silent minutes)
- Log preview panel activates (collapsed by default on mobile)
- Cancel/interrupt option only shown if explicitly implemented

### Step 5 — Log Streaming

The `RunnerLogView` panel shows streaming output:
- Raw stdout/stderr lines from Claude Code
- Auto-scrolls to latest line
- Collapsed by default on mobile (tap to expand)
- Never forced on the PM — a summary will be generated after
- Error lines highlighted in red, success in green, neutral in gray

### Step 6 — Result Summary

When execution ends (exit code received):
- `ExecutionResultSummary` panel appears at the bottom
- Status badge updates (completed / failed / needs_retry / needs_handoff)
- Git diff is analyzed automatically
- Plain-language summary is generated
- Changed files list shown (+/- line counts)
- Validation command result shown (passed / failed)
- Next recommendation shown in plain text

See `ExecutionResultSummary` props in `docs/EXECUTION_UI_SPEC.md §3`.

### Step 7 — Next Action

The PM chooses one of:

| Button | Label (KR) | When to show |
|---|---|---|
| Prepare Retry | 재시도 준비 | Status is `needs_retry` or `failed` |
| Prepare Handoff | 핸드오프 준비 | Status is `needs_handoff` or partial |
| Send to Codex QA | Codex QA로 전달 | Validation failed, needs QA review |
| Ask Claude Code to Fix | Claude Code에 수정 요청 | Agent-level failure, retry with edits |
| Mark Complete | 완료로 표시 ✓ | Status is `completed` (validation passed) |

**Rules:**
- Never auto-proceed to the next task
- "Mark Complete" only enabled when validation has passed
- "Prepare Retry" shows a prompt edit screen before re-running
- "Prepare Handoff" shows the handoff document preview before sending

---

## 4. UI Sections

### Section Layout (Desktop)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  HEADER: [Task ID + Title]   [Agent Badge + State]   [Status Badge]     │
├──────────────────────────────┬───────────────────────────────────────────┤
│                              │                                           │
│  LEFT COLUMN (40%)           │  RIGHT COLUMN (60%)                      │
│  ────────────────────        │  ──────────────────────                  │
│  [1] Execution Readiness     │  [5] Runner Log Preview                  │
│       Gate                   │      (collapsed by default)              │
│                              │                                           │
│  [2] Agent Capability Card   │  (Execution status timeline              │
│      (with state badge)      │   if ExecutionStatusTimeline exists)     │
│                              │                                           │
│  [3] Local Risk Warning      │                                           │
│                              │                                           │
│  [4] Approval Checklist      │                                           │
│                              │                                           │
│  [Cancel]                    │                                           │
│  [승인 후 Claude Code 실행] ← CTA │                                      │
│                              │                                           │
├──────────────────────────────┴───────────────────────────────────────────┤
│  [6] Execution Result Summary         (full width, appears after run)   │
│  ──────────────────────────────────────────────────────────────────────  │
│  [7] Next Action Panel                                                   │
│  ──────────────────────────────────────────────────────────────────────  │
│  [8] QA Handoff Panel (conditional)                                      │
└──────────────────────────────────────────────────────────────────────────┘
```

### Section Layout (Mobile, < 768px)

```
┌────────────────────────────────┐
│  [Task Title] · [Agent Badge]  │  ← always visible
│  [Status Badge]                │  ← always visible
├────────────────────────────────┤
│  ▶ 실행 준비 확인 (탭하여 열기)  │  ← [1] + [4] collapsible
├────────────────────────────────┤
│  ⚠ 위험도: 보통 (탭하여 보기)   │  ← [3] collapsible
├────────────────────────────────┤
│  [2] Agent Capability Card     │  ← always visible (compact)
├────────────────────────────────┤
│  ▶ 실행 로그 (탭하여 열기)      │  ← [5] collapsed on mobile
├────────────────────────────────┤
│  [취소]                        │
│  [승인 후 Claude Code 실행] CTA │  ← sticky bottom, full-width
└────────────────────────────────┘

POST-EXECUTION (appears below CTA area):
┌────────────────────────────────┐
│  [6] 실행 결과 요약             │  ← scrollable
├────────────────────────────────┤
│  [7] 다음 조치 선택             │  ← action buttons
├────────────────────────────────┤
│  [8] QA 전달 패널 (조건부)      │  ← only if validation failed
└────────────────────────────────┘
```

---

### Section 1 — Execution Readiness Gate

**Purpose:** Pre-flight safety checklist that must be fully green before execution.

**Content:**
- Section header: "실행 준비 확인"
- Each checklist item shown as a row: [icon] [label] [status chip]
- Required items: green `✓ 준비됨` or red `✗ 필요`
- Warning items: amber `⚠ 권장사항`
- "검사 중" spinner for async validation items

**UX Rules:**
- If any required item is red → CTA button disabled + tooltip: "모든 필수 항목을 완료해야 실행할 수 있습니다"
- Blocked files row must always be visible (never collapsed)
- On desktop: always expanded
- On mobile: collapsible accordion, expands by default if any item is red

**Component:** `ExecutionReadinessChecklist` (see `docs/EXECUTION_UI_SPEC.md §2`)

---

### Section 2 — Agent Capability Card

**Purpose:** Clearly communicates which agent will handle this task and what its execution boundary is.

**Content (Claude Code example):**
```
┌─────────────────────────────────────────┐
│  🤖 Claude Code                         │
│  ─────────────────────────────────────  │
│  ✅ 로컬 실행 가능                       │
│                                         │
│  실행 방식: 로컬 터미널 CLI              │
│  기본 작업: 아키텍처, 복잡한 구현, 리뷰 │
│  승인 필요: 예                          │
│  외부 API 호출: 없음 (로컬 전용)        │
│  마지막 사용: T028 (성공)               │
└─────────────────────────────────────────┘
```

**Content (Codex example — manual only):**
```
┌─────────────────────────────────────────┐
│  🤖 Codex                               │
│  ─────────────────────────────────────  │
│  📋 수동 핸드오프 전용                   │
│                                         │
│  실행 방식: 수동 복사 + 붙여넣기        │
│  기본 작업: 구현, 버그 수정, 타입 오류  │
│  직접 실행: 지원되지 않음              │
│  [Codex QA로 전달] ←  action button     │
└─────────────────────────────────────────┘
```

**UX Rules:**
- One card per assigned agent
- State badge color follows the table in Section 2
- Non-executable agents: execution button replaced with handoff/copy action
- Never imply that non-executable agents can run locally

---

### Section 3 — Local Risk Warning

**Purpose:** Inform the PM about what local execution actually means before they click Approve.

**Content (always shown for Claude Code):**
```
⚠️ 로컬 실행 안내

이 작업은 현재 컴퓨터에서 직접 실행됩니다.
실행 전 다음 사항을 확인해 주세요:

• Claude Code CLI가 설치되어 있어야 합니다
• 작업 폴더: /Users/wonmin/project/agent-control-room
• 새 브랜치가 생성됩니다: feat/T031-execution-manager
• 아래 허용된 파일만 수정됩니다
• 실행은 취소할 수 없습니다

위험도: 보통 ⚠
```

**Risk level colors:**
- `low` → green border, `Shield` icon
- `medium` → amber border, `AlertTriangle` icon
- `high` → red border + pulse ring, `ShieldAlert` icon, mandatory checkbox

**High-risk checkbox (only shown when risk = high):**
```
[ ] 이 실행이 중요 파일을 수정한다는 것을 이해했습니다.
```
The CTA button is disabled until this checkbox is checked.

---

### Section 4 — Approval Checklist

Same as Section 1 (Execution Readiness Gate). This is the combined view of readiness + acknowledgment, feeding directly into the CTA button state.

The final item `human_approved` is the checkbox the user must personally check:
```
[ ] 위 내용을 검토했으며 Claude Code 실행을 승인합니다.
```

This item becomes green only when:
1. The user checks the `human_approved` checkbox
2. All other required items are ready

---

### Section 5 — Runner Log Preview

**Purpose:** Real-time terminal output during execution. Secondary to the summary — not forced on the PM.

**Content:**
- Monospace font, dark background panel
- Auto-scrolls to newest line
- Error lines: red text
- Success lines: green text
- Standard output: gray/white text
- Timestamp prefix optional (collapsed for readability)

**Desktop:** Expanded in the right column, 60% width
**Mobile:** Collapsed accordion: "실행 로그 보기 (탭하여 열기)"

**UX Rules:**
- Default: collapsed on mobile, visible on desktop
- No syntax highlighting — raw output only
- PM should not need to read this to understand outcome (Result Summary does that)
- If log > 500 lines: show last 200 lines + "전체 로그 다운로드" link
- Never block or replace the Result Summary with the log

---

### Section 6 — Execution Result Summary

**Purpose:** After execution ends, give the PM a plain-language outcome — not a raw log dump.

**Content:**
```
┌──────────────────────────────────────────────────────┐
│  [Status Badge]  실행 결과                           │
│  ────────────────────────────────────────────────    │
│  📋 요약                                            │
│    Claude Code가 작업을 완료했습니다.                │
│    3개 파일이 수정되었으며 검증을 통과했습니다.      │
│  ────────────────────────────────────────────────    │
│  📁 변경된 파일  (3개)                              │
│    ✚ components/workbench/AgentCard.tsx  +87 -0      │
│    ✎ app/workbench/page.tsx              +24 -6       │
│    ✎ lib/types.ts                        +12 -0       │
│  ────────────────────────────────────────────────    │
│  ✅ 검증 결과: 통과                                 │
│    $ npm run typecheck && npm run lint               │
│  ────────────────────────────────────────────────    │
│  ➡ 다음 권장 작업                                  │
│    Codex QA에 전달하여 유닛 테스트를 추가하세요.    │
└──────────────────────────────────────────────────────┘
```

**UX Rules:**
- Status badge shown prominently at top
- Plain-language summary: 1–3 sentences, no jargon
- File list shows change type icons: ✚ (added) ✎ (modified) ✕ (deleted)
- Validation: show command + passed/failed badge
- "Mark Complete ✓" only enabled when validation has passed
- Partial completion: `partial` status badge, not `completed`
- Failed: show `failed` badge, do not auto-retry

**Component:** `ExecutionResultSummary` (see `docs/EXECUTION_UI_SPEC.md §3`)

---

### Section 7 — Next Action Panel

**Purpose:** After seeing the result, give the PM clear, single-click next steps.

**Content:**
```
다음 조치를 선택하세요:

[재시도 준비]              — 프롬프트를 수정하고 다시 실행합니다
[핸드오프 준비]            — 작업을 다른 에이전트에 전달합니다
[Codex QA로 전달]         — QA/테스트를 위해 Codex에 전달합니다
[Claude Code에 수정 요청]  — 실패한 항목을 수정하도록 요청합니다
[완료로 표시 ✓]           — 작업을 완료 상태로 저장합니다
```

**Button visibility rules:**

| Button | Shown when |
|---|---|
| 재시도 준비 | `needs_retry`, `failed`, `partial` |
| 핸드오프 준비 | `needs_handoff`, `partial`, any status |
| Codex QA로 전달 | Validation failed, or task type = QA |
| Claude Code에 수정 요청 | `failed` status, agent was `claude-code` |
| 완료로 표시 ✓ | `completed`, validation passed |

**UX Rules:**
- Never auto-advance — wait for PM to click
- "핸드오프 준비" shows handoff document preview before sending
- "재시도 준비" opens a prompt edit panel before re-running
- "완료로 표시" updates roadmap status only after PM confirms

---

### Section 8 — QA Handoff Panel (Conditional)

**Purpose:** When the result needs QA review or Codex attention, this panel surfaces the prepared handoff without launching it automatically.

**Shown when:**
- Validation has failed
- PM clicked "Codex QA로 전달" from Next Action Panel
- Task type has `qa_required: true`

**Content:**
```
┌──────────────────────────────────────────────────────┐
│  📋 QA 핸드오프 패킷                                 │
│  ────────────────────────────────────────────────    │
│  전달 대상: Codex (QA / 테스트 에이전트)             │
│  작업: T031 — Execution Manager MVP                  │
│                                                      │
│  변경된 파일:                                        │
│    • components/workbench/AgentCard.tsx              │
│    • app/workbench/page.tsx                          │
│                                                      │
│  Codex에 요청할 사항:                                │
│    실패한 검증 오류를 수정하고 유닛 테스트 추가      │
│                                                      │
│  [Markdown 복사]  [JSON 복사]  [닫기]               │
└──────────────────────────────────────────────────────┘
```

**UX Rules:**
- This panel is COPY-ONLY — no execution
- Copy buttons generate the handoff document draft
- The panel does not send anything automatically
- Label: "Codex QA로 전달" must not imply auto-execution

---

## 5. Copy Guidelines — Korean UI Text

All user-facing copy in the Workbench must be written for a **non-developer PM**. Use plain language, avoid technical jargon, and always explain what will happen and what the user should do next.

---

### 5.1 Local Execution Warning

> **로컬 실행 안내**
>
> 이 버튼을 클릭하면 현재 컴퓨터에서 Claude Code가 즉시 실행됩니다.
> 실행은 취소할 수 없습니다.
>
> • 작업 폴더: `{cwd}`
> • 새 브랜치: `feat/{taskId}`
> • 허용된 파일만 수정됩니다
>
> 아래 목록의 파일은 수정되어서는 안 됩니다. 에이전트가 해당 파일을 수정하려 하면 중단해야 합니다.

---

### 5.2 Unsupported Agent Warning

**For Codex:**
> **Codex는 직접 실행을 지원하지 않습니다**
>
> Codex는 현재 수동 작업 방식으로만 작동합니다.
> 아래 프롬프트를 복사하여 Codex에 직접 붙여넣기 해주세요.
> 완료되면 결과를 이 화면에 가져와 저장할 수 있습니다.

**For Antigravity:**
> **Antigravity는 시각적 UI 작업 도구입니다**
>
> Antigravity는 화면 프로토타입과 UI 코드 작업을 위한 수동 도구입니다.
> 현재 Agent Control Room에서 직접 실행할 수 없습니다.
> 아래 프롬프트를 Antigravity에 복사하여 작업을 시작하세요.

**For Hermes:**
> **Hermes는 백그라운드 워커입니다**
>
> Hermes는 요약 생성, 메모리 저장, Context Pack 생성에만 사용됩니다.
> 코드를 직접 수정하거나 실행하지 않습니다.
> 아래 패킷을 검토하고 필요한 항목을 복사하세요.

**For Vibe Kanban:**
> **Vibe Kanban은 실행 워크벤치입니다**
>
> Vibe Kanban은 이슈 관리, 워크스페이스, 세션, 차이점 검토를 위한 외부 도구입니다.
> Agent Control Room에서 직접 실행할 수 없습니다.
> 아래 작업을 Vibe Kanban으로 전달하려면 "이슈로 내보내기"를 클릭하세요.

---

### 5.3 Successful Run

> **✅ 실행이 완료되었습니다**
>
> Claude Code가 작업을 성공적으로 마쳤습니다.
> {N}개의 파일이 수정되었으며 모든 검증을 통과했습니다.
>
> 다음 단계를 선택하세요: 완료로 표시하거나 Codex QA에 전달할 수 있습니다.

---

### 5.4 Failed Run

> **❌ 실행 중 오류가 발생했습니다**
>
> Claude Code 실행이 완료되지 않았습니다.
> {N}개의 파일이 부분적으로 변경되었을 수 있습니다.
>
> 로그를 확인하고 재시도하거나 핸드오프를 준비하세요.
> 변경된 파일을 직접 확인한 후 다음 조치를 선택하세요.

---

### 5.5 Blocked Run

> **🚫 실행이 차단되었습니다**
>
> 다음 이유로 실행을 시작할 수 없습니다:
>
> • {block_reason_1}
> • {block_reason_2}
>
> 위 항목을 해결한 후 다시 시도해 주세요.

Common block reasons (localized):
- "커밋되지 않은 변경 사항이 있습니다. 커밋하거나 스태시하세요."
- "작업 폴더가 설정되지 않았습니다."
- "프롬프트가 준비되지 않았습니다. 프롬프트 컴파일러에서 프롬프트를 생성하세요."
- "허용된 파일 목록이 비어 있습니다."
- "승인 토큰이 만료되었습니다. 다시 승인해 주세요."
- "지원되지 않는 에이전트입니다. Claude Code를 사용해 주세요."

---

### 5.6 Send to Codex QA

Button label:
> **Codex QA로 전달**

Confirmation copy (shown after click, before handoff is sent):
> **Codex QA 핸드오프 패킷이 준비되었습니다**
>
> 아래 Markdown을 복사하여 Codex에 붙여넣으세요.
> Codex는 검증 오류를 수정하고 유닛 테스트를 추가할 것입니다.
> 완료되면 결과를 이 화면에 가져와 저장하세요.

---

### 5.7 Ask Claude Code to Fix

Button label:
> **Claude Code에 수정 요청**

Confirmation copy:
> **재시도 프롬프트가 준비되었습니다**
>
> 이전 실행에서 발생한 오류를 바탕으로 Claude Code에 수정을 요청합니다.
> 프롬프트를 검토한 후 다시 승인하고 실행하세요.

---

### 5.8 Manual Review Needed

Status banner (shown when validation failed but no auto-action is possible):
> **⚠ 수동 검토가 필요합니다**
>
> 실행이 완료되었지만 검증을 통과하지 못했습니다.
> 변경된 파일을 직접 검토하고 오류를 확인해 주세요.
> 준비되면 재시도 또는 핸드오프를 선택하세요.

---

## 6. Acceptance Criteria

The Workbench Local Runner UX is acceptable when the following conditions are met:

### 6.1 Non-Developer PM Readability

- [ ] A PM with no coding background can read the screen and understand: what will run, what risk exists, and what to do if it fails.
- [ ] No unexplained technical terms appear on the primary reading path (no "spawn", "stdin", "exit code", "TTY").
- [ ] All status labels are in Korean and match the approved label table in Section 2.
- [ ] The PM can determine the outcome (success / failure / blocked) within 5 seconds of the result appearing.

### 6.2 Agent Boundary Clarity

- [ ] Claude Code is the only agent with a local execution button (`승인 후 Claude Code 실행`).
- [ ] Codex, Antigravity, Hermes, and Vibe Kanban cards never show an execution button.
- [ ] Each non-executable agent shows its correct state badge and the appropriate warning copy from Section 5.2.
- [ ] The UI does not imply that Codex, Antigravity, Hermes, or Vibe Kanban can run locally.

### 6.3 Execution Risk Communication

- [ ] The local execution warning (Section 5.1) is always shown before the approval button.
- [ ] Blocked files are visible before approval and never collapsed.
- [ ] High-risk tasks require an explicit acknowledgment checkbox before the approval button activates.
- [ ] The approval button label includes the agent name: "승인 후 Claude Code 실행", not just "실행".

### 6.4 Approval Gate Integrity

- [ ] "승인 후 Claude Code 실행" is disabled until all required checklist items are green.
- [ ] A tooltip explains why the button is disabled when items are missing.
- [ ] The `human_approved` checkbox is required and must be checked by the user.
- [ ] The button does not auto-activate on page load or checklist completion.

### 6.5 Post-Execution Clarity

- [ ] Result summary appears after execution ends (success or failure).
- [ ] "완료로 표시 ✓" is only enabled when validation has passed.
- [ ] Partial completion shows `partial` badge, not `completed`.
- [ ] "Mark Complete" is never shown for failed or partial results.
- [ ] The next action panel always appears after the result summary.

### 6.6 Mobile Safety

- [ ] Blocked files are visible before approval on screens < 768px.
- [ ] "승인 후 Claude Code 실행" is sticky to the bottom on mobile.
- [ ] The approval button has tap debounce or requires deliberate interaction to prevent accidental execution.
- [ ] Result summary is scrollable and action buttons are reachable by touch.

---

## 7. What Claude Code Should Compare Against After Implementation

When Claude Code implements the Workbench UI, verify against this spec in the following order:

### 7.1 Agent State Check
- Open `/workbench` with each agent type (claude-code, codex, antigravity, hermes, vibe-kanban)
- Confirm each agent renders the correct badge state from Section 2
- Confirm non-executable agents have NO execution button
- Confirm Claude Code has the correct approval flow

### 7.2 User Flow Check
- Walk through Steps 1–7 from Section 3
- Confirm no step can be skipped (required checklist items block progression)
- Confirm approval token is requested before runner starts
- Confirm SSE stream updates the log panel in real time

### 7.3 Copy Audit
- Check all user-facing text against Section 5 copy guidelines
- Confirm no forbidden button labels from `docs/EXECUTION_UI_SPEC.md` appear
- Confirm Korean copy matches approved translations in Section 5

### 7.4 Mobile Layout Check
- Resize browser to 375px width
- Confirm blocked files are visible
- Confirm CTA is sticky bottom
- Confirm log panel is collapsed
- Confirm result summary is scrollable

### 7.5 Cross-Reference Docs
Compare against:
- `docs/EXECUTION_UI_SPEC.md` — component props and safety rules
- `docs/EXECUTION_CONTROL_TOWER_UX.md` — layout, button labels, mobile UX
- `docs/LOCAL_RUNNER_ARCHITECTURE.md` — adapter model, what is manual vs. automated
- `docs/QA_EXECUTION_MANAGER.md` — regression checks and failure scenarios

---

## 8. Files Created / Changed

| File | Action | Owner |
|---|---|---|
| `docs/WORKBENCH_RUNNER_UX_SPEC.md` | ✅ Created | Antigravity |

**Zero runtime files were modified.**
No components, API routes, runner logic, orchestration, or package config were touched.

---

*Design spec complete. Implementation is owned by Claude Code. QA coverage is owned by Codex.*
