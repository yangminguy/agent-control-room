# Execution UI Specification — Agent Control Room

**Author:** Antigravity (UI/UX Agent)  
**Status:** Approved for Implementation  
**Last Updated:** 2026-05-21  
**Target Audience:** Claude Code (Execution Manager), Codex (QA/Safety)

---

## Overview

This document specifies the visual and interactive design of the **Execution Control Tower UI** — the interface a non-developer PM uses to approve, monitor, and review AI agent execution. All components live under `components/execution/`.

Design system tokens from `docs/DESIGN_SYSTEM.md` apply throughout.

---

## Component Index

| Component | File | Status | Owner |
|---|---|---|---|
| `ExecutionStatusBadge` | `components/execution/ExecutionStatusBadge.tsx` | ✅ Implemented | Antigravity |
| `ExecutionReadinessChecklist` | `components/execution/ExecutionReadinessChecklist.tsx` | ✅ Implemented | Antigravity |
| `ExecutionResultSummary` | `components/execution/ExecutionResultSummary.tsx` | ✅ Implemented | Antigravity |
| `ExecutionStatusTimeline` | `components/execution/ExecutionStatusTimeline.tsx` | 📋 Spec Only | Claude Code |
| `ExecutionRiskPanel` | `components/execution/ExecutionRiskPanel.tsx` | 📋 Spec Only | Claude Code |
| `ExecutionApprovalGate` | `components/execution/ExecutionApprovalGate.tsx` | 📋 Spec Only | Claude Code |

---

## 1. `ExecutionStatusBadge` — Implemented

### Purpose
Communicates the current execution phase to a non-developer PM in a single, scannable element. Used inline in cards, timelines, and headers.

### Props
```typescript
type ExecutionStatus =
  | 'planned'
  | 'ready'
  | 'approval_required'
  | 'approved'
  | 'running'
  | 'analyzing'
  | 'needs_retry'
  | 'needs_handoff'
  | 'completed'
  | 'blocked'
  | 'failed';

interface ExecutionStatusBadgeProps {
  status: ExecutionStatus;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;   // default: true
  animate?: boolean;     // default: true (pulse on running/analyzing)
}
```

### Status Visual Map

| Status | Label | Color | Icon | Pulse |
|---|---|---|---|---|
| `planned` | 계획됨 | `text-secondary` / gray | `Circle` | No |
| `ready` | 실행 준비 완료 | `pink-primary` | `CheckCircle2` | No |
| `approval_required` | 승인 필요 | `warning` amber | `ShieldAlert` | Yes |
| `approved` | 승인됨 | `pink-soft` | `ShieldCheck` | No |
| `running` | 실행 중 | `blue-400` | `Loader2` spin | Yes |
| `analyzing` | 결과 분석 중 | `purple-400` | `ScanLine` | Yes |
| `needs_retry` | 재시도 필요 | `warning` | `RefreshCw` | No |
| `needs_handoff` | 핸드오프 필요 | `pink-primary` | `ArrowRightLeft` | No |
| `completed` | 완료 | `success` green | `CheckCircle2` | No |
| `blocked` | 차단됨 | `error` red | `Ban` | No |
| `failed` | 실패 | `error` red | `XCircle` | No |

---

## 2. `ExecutionReadinessChecklist` — Implemented

### Purpose
Before a PM clicks "Approve & Run Agent," they see a structured checklist that confirms everything is ready. This is the primary safety gate.

### Props
```typescript
interface ReadinessItem {
  id: string;
  label: string;          // Human-readable item name
  status: 'ready' | 'warning' | 'missing' | 'checking';
  detail?: string;        // Optional explanation
  required: boolean;      // Blocks execution if missing
}

interface ExecutionReadinessChecklistProps {
  items: ReadinessItem[];
  onApprove?: () => void;
  onCancel?: () => void;
  isAllReady?: boolean;   // Computed from items
}
```

### Checklist Items (Standard)

| Item | Required | Description |
|---|---|---|
| agent_selected | ✅ | Which AI agent will run this task |
| prompt_ready | ✅ | Senior Dev Prompt is compiled and copy-ready |
| project_path | ✅ | Project directory is set |
| allowed_files | ✅ | List of files the agent may edit |
| blocked_files | ✅ | Files the agent must NOT touch |
| branch_ready | ⚠️ | Git branch exists (warns but doesn't block) |
| validation_cmd | ⚠️ | Test/lint command to run after execution |
| human_approved | ✅ | User has explicitly clicked Approve |

### UX Rules
- **All required items green → "Approve & Run Agent" button activates**
- **Any required item missing → button disabled, reason shown**
- **Warning items → yellow, show tooltip explaining risk**
- **"Checking" state → shows spinner for async validation**

---

## 3. `ExecutionResultSummary` — Implemented

### Purpose
After execution completes (or fails), this panel gives the PM a plain-language summary of what happened, what changed, and what to do next.

### Props
```typescript
interface ChangedFile {
  path: string;
  changeType: 'added' | 'modified' | 'deleted';
  linesAdded?: number;
  linesRemoved?: number;
}

interface ExecutionResultSummaryProps {
  status: 'completed' | 'partial' | 'failed' | 'needs_retry' | 'needs_handoff';
  summary: string;              // Plain-language result description
  changedFiles: ChangedFile[];
  validationResult?: {
    passed: boolean;
    command: string;
    output?: string;
  };
  nextRecommendation: string;   // What to do next (plain text)
  onRetry?: () => void;
  onHandoff?: () => void;
  onMarkComplete?: () => void;
}
```

### Layout Structure
```
┌─────────────────────────────────────────┐
│ [Status Badge]  Execution Result        │
│ ─────────────────────────────────────── │
│ 📋 Summary                              │
│   [Plain text summary of what happened] │
│ ─────────────────────────────────────── │
│ 📁 Changed Files  (N files)             │
│   ✚ path/to/new-file.ts  +45 -0        │
│   ✎ path/to/edited.ts    +12 -3        │
│   ✕ path/to/removed.ts                 │
│ ─────────────────────────────────────── │
│ ✅ Validation  [passed / failed]        │
│   $ npm run test:unit                   │
│ ─────────────────────────────────────── │
│ ➡ Next Recommendation                  │
│   [Plain text next action]              │
│ ─────────────────────────────────────── │
│ [Prepare Retry]  [Prepare Handoff]      │
│                        [Mark Complete ✓]│
└─────────────────────────────────────────┘
```

---

## 4. `ExecutionStatusTimeline` — Spec for Claude Code

### Purpose
A vertical timeline that shows all statuses this execution has passed through, with timestamps. Helps the PM understand history at a glance.

### Props (Spec)
```typescript
interface TimelineEvent {
  status: ExecutionStatus;
  timestamp: string;      // ISO 8601
  note?: string;          // Optional: what happened
  actor?: string;         // 'claude-code' | 'user' | 'system'
}

interface ExecutionStatusTimelineProps {
  events: TimelineEvent[];
  currentStatus: ExecutionStatus;
}
```

### Layout (Spec)
```
[✅ 완료]              ← Current (highlighted)
  └─ 2026-05-21 14:32

[🔬 결과 분석 중]
  └─ 2026-05-21 14:28

[▶ 실행 중]
  └─ 2026-05-21 14:20 · claude-code

[✓ 승인됨]
  └─ 2026-05-21 14:19 · User approved

[⚠ 승인 필요]
  └─ 2026-05-21 14:18
```

### Implementation Notes (for Claude Code)
- Newest event at the top, oldest at the bottom
- Current status has a glowing ring indicator
- User-action events (approval) shown with user icon
- Collapsible if > 6 events

---

## 5. `ExecutionRiskPanel` — Spec for Claude Code

### Purpose
Before approving, the PM sees a clear risk assessment: Low / Medium / High, why it's risky, what they're approving, and what they must NOT do.

### Props (Spec)
```typescript
type RiskLevel = 'low' | 'medium' | 'high';

interface ExecutionRiskPanelProps {
  riskLevel: RiskLevel;
  riskReasons: string[];        // Bullet points explaining risk
  approvalRequired: string[];   // What the user is explicitly approving
  doNotList: string[];          // "Do NOT do" rules during this execution
  blockedFiles: string[];       // Files that must not be touched
}
```

### Layout (Spec)
```
┌──────────────────────────────────────────┐
│ ⚠ Risk Level: MEDIUM                    │
│ ─────────────────────────────────────── │
│ Why this is medium risk:                │
│ • Modifies 3 existing files             │
│ • Runs database migration               │
│ • No rollback defined                   │
│                                         │
│ You are approving:                      │
│ • Run claude-code on branch feat/T031   │
│ • Edit: app/plan/page.tsx               │
│                                         │
│ DO NOT during this execution:           │
│ 🚫 Do not modify lib/storage/           │
│ 🚫 Do not run npm install               │
│ 🚫 Do not deploy to production          │
│ ─────────────────────────────────────── │
│ I understand the risk  [checkbox]       │
└──────────────────────────────────────────┘
```

### Risk Level Colors
- `low` → `success` green border, Shield icon
- `medium` → `warning` amber border, AlertTriangle icon  
- `high` → `error` red border + pulsing ring, ShieldAlert icon

### UX Rules (for Claude Code)
- High risk: requires explicit checkbox "I understand" before Approve button activates
- Medium risk: shows warning, Approve button available immediately
- Low risk: minimal panel, collapsed by default

---

## 6. `ExecutionApprovalGate` — Spec for Claude Code

### Purpose
The final gate before execution. Combines ReadinessChecklist + RiskPanel into one approval flow with a clear, unambiguous primary action.

### Layout (Spec)
```
┌──────────────────────────────────────────┐
│ 🛡 Execution Approval Required           │
│ ─────────────────────────────────────── │
│ Task: T031 — Execution Manager MVP       │
│ Agent: claude-code                       │
│ Branch: feat/execution-manager           │
│                                         │
│ [ExecutionReadinessChecklist]           │
│                                         │
│ [ExecutionRiskPanel]                    │
│                                         │
│           [Cancel]  [Approve & Run Agent]│
└──────────────────────────────────────────┘
```

---

## Button Language Reference

### ✅ Approved Labels
| Action | Label |
|---|---|
| Open pre-flight checklist | Review Execution Readiness |
| User approves and triggers execution | Approve & Run Agent |
| Trigger an already-approved execution | Start Approved Execution |
| Review completed execution output | Analyze Result |
| Prepare a retry with edits | Prepare Retry |
| Transfer to another agent | Prepare Handoff |
| Close and archive | Mark Complete |
| Cancel before approval | Cancel |

### 🚫 Avoid These Labels
- Execute / Run / Start Agent / Auto-run / Deploy / Push / Merge
- Launch / Fire / Trigger (too technical or alarming)
- Submit / Send (too generic)

---

## Mobile UX Rules

### Screen sizes
- Primary: Desktop ≥ 1024px
- Tablet: 768–1024px (panels stack vertically)
- Mobile: < 768px (critical path only, collapsible panels)

### Mobile priorities
1. `ExecutionStatusBadge` — always visible, top of screen
2. `ExecutionReadinessChecklist` — collapsible, expands on tap
3. Primary CTA button — full-width, sticky bottom on mobile
4. `ExecutionResultSummary` — scrollable, collapsed file list

### Mobile anti-patterns to avoid
- Do not put "Approve & Run Agent" above the fold without checklist visible
- Do not hide blocked files on mobile — always show this list
- Do not auto-submit on mobile tap — require deliberate tap + confirmation

---

## Safety UX Rules

These rules apply to ALL execution UI regardless of component:

1. **No silent execution** — Every execution must have a visible `approval_required` state visible to the user.
2. **Blocked files always visible** — The "DO NOT TOUCH" file list must appear before the Approve button.
3. **Disabled ≠ hidden** — If Approve is disabled, show it grayed out with a tooltip explaining why.
4. **Status always current** — The `ExecutionStatusBadge` must update in real time (SSE/polling).
5. **Undo is not possible** — UI should communicate this clearly: "Once approved, the agent will begin immediately."
6. **Failed ≠ retry automatically** — Failed state must require explicit "Prepare Retry" action from the user.
7. **Handoff is deliberate** — "Prepare Handoff" shows a preview of the handoff doc before sending.
