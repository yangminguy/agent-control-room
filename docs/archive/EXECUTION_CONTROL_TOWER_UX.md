# Execution Control Tower UX — Non-Developer PM Design Guide

**Author:** Antigravity (UI/UX Agent)  
**Status:** Active Design Direction  
**Last Updated:** 2026-05-21  

---

## 1. Current UX Diagnosis

### What Exists Today
The current `/plan` page shows task cards with a Kanban layout. The `RunnerLogView` shows raw terminal-style logs. There are execution-related API routes and runner infrastructure, but **no dedicated PM-facing execution control surface**.

### Gaps for a Non-Developer PM

| Gap | Impact |
|---|---|
| No pre-execution safety review | PM may approve without knowing what files will change |
| No plain-language risk rating | Raw terminal output is unreadable for non-engineers |
| No clear "what happens next" guidance | After execution, PM doesn't know if they should retry, hand off, or celebrate |
| No blocked file list visible before approval | PM could accidentally approve risky scope |
| No status progression visible | PM can't tell the difference between "thinking" and "failed" |
| Button labels are too technical | "Execute", "Run", "Start" feel alarming or vague |
| No mobile-safe approval flow | PM reviewing on phone can accidentally tap Approve |

---

## 2. Proposed Execution Control Layout

### Desktop Layout (`/execution` or embedded in `/plan`)

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER: [Task Title] · [Agent Badge] · [ExecutionStatusBadge]      │
├─────────────────────────────┬──────────────────────────────────────┤
│                             │                                      │
│  COLUMN LEFT (40%)          │  COLUMN RIGHT (60%)                  │
│  ─────────────────          │  ──────────────────                  │
│  ExecutionReadiness         │  ExecutionStatusTimeline             │
│  Checklist                  │  (vertical, newest on top)           │
│                             │                                      │
│  ExecutionRiskPanel         │  RunnerLogView (collapsed)           │
│  [Low/Med/High]             │  [tap to expand full log]            │
│                             │                                      │
│  ─────────────────          │                                      │
│  [Cancel]                   │                                      │
│  [Approve & Run Agent] ←CTA │                                      │
│                             │                                      │
├─────────────────────────────┴──────────────────────────────────────┤
│  POST-EXECUTION: ExecutionResultSummary (full width, appears after) │
│  [Prepare Retry]  [Prepare Handoff]          [Mark Complete ✓]     │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout (< 768px)

```
┌─────────────────────────────┐
│ [Task] · [Agent] · [Status] │  ← always visible
├─────────────────────────────┤
│ ▶ Review Execution          │  ← collapsible section
│   Readiness (tap to open)   │
├─────────────────────────────┤
│ ▶ Risk: MEDIUM (tap)        │  ← collapsible
├─────────────────────────────┤
│ ▶ Execution Log (tap)       │  ← collapsed by default
├─────────────────────────────┤
│ [Cancel]                    │
│ [Approve & Run Agent]  ←CTA │  ← sticky bottom, full-width
└─────────────────────────────┘
```

---

## 3. Information Hierarchy — What a PM Must See

The following is the ordered reading path for a non-developer PM.  
Design must guide the eye in this sequence:

### Pre-Execution View

1. **What task is this?**  
   → Task ID + title in large header (e.g., "T031 — Execution Manager MVP")

2. **Which agent will do it?**  
   → Agent badge with color coding (purple = claude-code, blue = codex, amber = antigravity)

3. **Is it ready?**  
   → `ExecutionReadinessChecklist` — green checkmarks = ready, red = blocked

4. **How risky is it?**  
   → `ExecutionRiskPanel` — Low / Medium / High with plain-text explanation

5. **What files will change?**  
   → Allowed files list (inside ReadinessChecklist or RiskPanel)

6. **What must NOT be touched?**  
   → Blocked files — always visible, never collapsed before approval

7. **What happens when I approve?**  
   → One-line plain English: "Clicking Approve will immediately start claude-code on branch feat/T031. You cannot undo this."

8. **Primary CTA**  
   → "Approve & Run Agent" — large, pink, only enabled when all required checks are green

### During Execution View

9. **What is happening right now?**  
   → `ExecutionStatusBadge` with animation (running pulse, analysis scan)

10. **Where in the process are we?**  
    → `ExecutionStatusTimeline` showing history

11. **Can I read the raw log?**  
    → `RunnerLogView` collapsed (tap to expand) — not forced on PM

### Post-Execution View

12. **Did it succeed or fail?**  
    → `ExecutionResultSummary` top — large status badge + plain summary

13. **What changed?**  
    → Changed files list with +/- line counts

14. **Did validation pass?**  
    → Validation result (passed/failed) with command shown

15. **What should I do next?**  
    → Next recommendation in plain text

16. **Action buttons**  
    → "Prepare Retry" / "Prepare Handoff" / "Mark Complete"

---

## 4. Component Recommendations

### New (Antigravity owns — safe to implement now)

| Component | Priority | Description |
|---|---|---|
| `ExecutionStatusBadge` | P0 | Reusable status indicator with 11 states |
| `ExecutionReadinessChecklist` | P0 | Pre-flight safety check panel |
| `ExecutionResultSummary` | P0 | Post-execution result + action panel |

### Spec Only (Claude Code implements)

| Component | Priority | Description |
|---|---|---|
| `ExecutionStatusTimeline` | P1 | Vertical event timeline |
| `ExecutionRiskPanel` | P1 | Risk level + explanation + do-not list |
| `ExecutionApprovalGate` | P0 | Combined approval flow |

### Modify Carefully (Claude Code owns)

| Component | File | Touch? |
|---|---|---|
| RunnerLogView | `components/runner/RunnerLogView.tsx` | Add collapse prop only |
| Plan page | `app/plan/page.tsx` | Do not touch |
| Execution page | `app/execution/page.tsx` | Claude Code owns |

---

## 5. Button and Copy Recommendations

### Primary Actions

| Action | Approved Label | Size | Color |
|---|---|---|---|
| Open checklist | Review Execution Readiness | md | outline/secondary |
| Approve and run | Approve & Run Agent | lg | pink-primary (CTA) |
| Run already-approved | Start Approved Execution | lg | pink-primary |
| View results | Analyze Result | md | secondary |
| Retry with changes | Prepare Retry | md | warning amber |
| Transfer to agent | Prepare Handoff | md | secondary |
| Archive task | Mark Complete | md | success green |

### Forbidden Labels
- ❌ Execute → "Approve & Run Agent"
- ❌ Run → "Start Approved Execution"  
- ❌ Start Agent → "Approve & Run Agent"
- ❌ Auto-run → never use
- ❌ Deploy → not applicable in this context
- ❌ Push → "Prepare Handoff" instead
- ❌ Merge → not applicable
- ❌ Submit → too generic
- ❌ Launch → alarming for non-devs

### Supporting Copy Templates

**Approval confirmation (inline text, not modal):**  
> "Clicking Approve will immediately start [agent-name] on branch [branch-name]. This cannot be undone."

**Blocked items explanation:**  
> "These files must not be changed during this execution. If the agent attempts to edit them, it should be stopped."

**Result success:**  
> "[Agent] completed the task. [N] files were changed. Validation passed."

**Result failure:**  
> "[Agent] encountered an issue. [N] files may have partial changes. Review the log before deciding to retry."

**Retry prompt:**  
> "Preparing a retry will let you edit the prompt, update allowed files, and re-run the agent on the same branch."

---

## 6. Mobile UX Recommendations

### Critical Path Only
On screens < 768px, a PM should be able to:
1. See what status the execution is in
2. See the risk level
3. Open the checklist
4. Tap "Approve & Run Agent" (sticky bottom)
5. See the result summary

### Sticky Bottom CTA
The primary action button must be:
- Full-width on mobile
- Sticky to bottom of viewport
- Above keyboard (use CSS `env(safe-area-inset-bottom)`)
- Disabled and grayed out if not all required checks pass

### Collapsible Sections (Mobile)
All secondary panels should collapse:
- "Review Execution Readiness" → tap to expand
- "Risk Level" → shows level, tap for reasons
- "Execution Log" → collapsed by default on mobile (tap to expand)
- "Changed Files" → shows count, tap to expand list

### No Double-Tap Risk
On mobile, "Approve & Run Agent" should have a 300ms debounce or require a deliberate press (not just tap) to prevent accidental activation.

---

## 7. Safety UX Recommendations

### Pre-Execution Gates
1. **Require all required checklist items green** before enabling "Approve & Run Agent"
2. **Show blocked files list** always — never collapse it before approval
3. **Show agent name explicitly** in the CTA: "Approve & Run Agent" → "Approve & Run claude-code"
4. **Show branch name** on approve button hover/tooltip
5. **High-risk executions** require explicit checkbox: "I understand this will modify production-critical files"

### During Execution
6. **Status badge visible at all times** — sticky header or floating indicator
7. **No "cancel mid-execution" button** unless explicitly implemented — don't promise what isn't built
8. **Show elapsed time** — PM panics if it's silent for 3+ minutes

### Post-Execution
9. **Never auto-proceed** — always wait for PM to click next action
10. **Failed ≠ auto-retry** — require explicit "Prepare Retry" tap
11. **Partial completion shown clearly** — don't show "Complete" badge for partial results
12. **Handoff preview** — clicking "Prepare Handoff" shows the handoff document before it's sent

### Trust-Building Patterns
- Use "✓ Ready" not just checkmarks — label what the check confirms
- Show file counts: "3 files may be changed" not just "files: allowed"
- Show who approved: timestamp + "Approved by you at 14:19"
- Show agent trust level: "claude-code · Trusted · Last used T028 (success)"

---

## 8. Files Modified

| File | Action | Owner |
|---|---|---|
| `docs/EXECUTION_UI_SPEC.md` | Created | Antigravity |
| `docs/EXECUTION_CONTROL_TOWER_UX.md` | Created | Antigravity |
| `components/execution/ExecutionStatusBadge.tsx` | Created | Antigravity |
| `components/execution/ExecutionReadinessChecklist.tsx` | Created | Antigravity |
| `components/execution/ExecutionResultSummary.tsx` | Created | Antigravity |

**Zero conflicts with Claude Code.** No existing files were modified.

---

## 9. Next Step for Claude Code

Claude Code owns the execution logic and the approval gate wiring. Use these specs to implement:

### Priority 1 — Wire to Approval Gate
```
components/execution/ExecutionApprovalGate.tsx  [NEW]
- Combines ExecutionReadinessChecklist + ExecutionRiskPanel
- Controls "Approve & Run Agent" button state
- Calls existing /api/execution/approve endpoint (or creates it)
- Props: taskId, agentId, allowedFiles, blockedFiles, riskLevel
```

### Priority 2 — Timeline
```
components/execution/ExecutionStatusTimeline.tsx  [NEW]
- Reads ExecutionLog[] from /api/execution/[id]/logs
- Maps to TimelineEvent[] using the status map in EXECUTION_UI_SPEC.md
- Collapse at > 6 events
```

### Priority 3 — Compose the Execution Page
```
app/execution/[id]/page.tsx  [MODIFY or NEW]
- Left col: ExecutionReadinessChecklist + ExecutionRiskPanel + ApprovalGate
- Right col: ExecutionStatusTimeline + RunnerLogView (collapsed)
- Bottom (post-execution): ExecutionResultSummary
- Import all components from components/execution/
```

### Key Integration Points
- `ExecutionStatusBadge` status prop maps to `ExecutionLog.status` field
- `ExecutionReadinessChecklist` items derive from task metadata + git state
- `ExecutionResultSummary.changedFiles` comes from git diff output
- All components accept mock props — implement real data wiring separately

---

## 10. Next Step for Codex

Codex owns execution safety QA and regression coverage. Based on these specs:

### Test Coverage Priority

```
__tests__/components/execution/
  ExecutionStatusBadge.test.tsx
    - Renders all 11 status variants
    - Correct color class for each status
    - Animation class present for running/analyzing
    - No animation for static statuses

  ExecutionReadinessChecklist.test.tsx
    - Approve button disabled when required item missing
    - Approve button enabled when all required items ready
    - Warning items do not block approval
    - Renders all 8 standard checklist items

  ExecutionResultSummary.test.tsx
    - Renders changed files with correct change type icons
    - Shows retry button when status is needs_retry
    - Shows handoff button when status is needs_handoff
    - Mark Complete button only visible on completed/partial status
    - Validation passed/failed renders correctly
```

### Safety Regression Tests
```
  ExecutionApprovalGate.test.tsx (after Claude Code implements)
    - Cannot submit if any required item is not ready
    - High-risk execution requires checkbox acknowledgment
    - Blocked files list is always visible before Approve
    - Debounce prevents double-approval on mobile
```

### Accessibility Tests
```
  - All status badges have aria-label with status name
  - Checklist items are role="listitem" with aria-label
  - Approve button has aria-disabled when disabled
  - Focus trap inside approval gate modal (if used)
```
