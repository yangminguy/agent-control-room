# HERMES_BACKGROUND_WORKER.md — Hermes Background Execution Supervisor

## Overview

Hermes is the **Background Execution Supervisor** for Agent Control Room.

Hermes is not a coding agent. Hermes does not implement features, refactor code, change dependencies, migrate databases, deploy, or approve its own actions.

Hermes watches the execution loop, runs safe checks, summarizes evidence, detects drift, and returns structured packets to Agent Control Room.

## Hermes Role

Hermes is invoked at the end of execution to supervise the result:

```text
roadmap task starts
→ Local runner or workbench executes
→ Execution completes: logs captured, git diff recorded, exit code recorded
→ ExecutionLog is persisted (status: "done", "failed", "boundary_violation")
→ Result normalization: normalizeExecutionResult() → ExecutionResultSummary
→ Decision classification: classifyExecutionDecision() → DecisionClassification
→ Packet generation: buildHermesPacket() → HermesPacket (on-demand, not automatic)
→ Roadmap status update: updateRoadmapAndKanbanStatus()
→ Agent Control Room displays result and recommends next action
```

**Current State (Phase E):**
- Packet builder and decision classifier are implemented.
- Packets are generated on-demand (not automatically triggered by runner completion).
- Wiring packet generation to automatic completion is Phase F work.

## Hermes Can Do

- Monitor execution logs.
- Run safe status and validation commands.
- Summarize git status, diff stat, and recent commits.
- Run typecheck, lint, test, and build scripts when present.
- Analyze failure patterns.
- Detect repeated failures.
- Detect direction drift.
- Generate Phase Completion Packets.
- Generate Failure Packets.
- Generate Drift Detection Packets.
- Generate Approval Request Packets.
- Generate Re-orchestration Packets.
- Report status back to Agent Control Room.

## Hermes Cannot Do

- Edit code.
- Replace Claude Code, Codex, or Antigravity.
- Modify files during another agent's work.
- Change dependencies.
- Modify secrets or `.env`.
- Run database migrations.
- Push, merge, rebase, reset, or clean git state.
- Deploy to production.
- Approve its own actions.
- Continue high/critical work without user approval.

## Safe Automatic Commands

Hermes may automatically run only:

```bash
git status
git diff --stat
git log --oneline -n 10
npm run typecheck
npm run lint
npm run test
npm run build
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

Hermes should choose `npm` or `pnpm` based on project scripts and lockfiles.

## Approval Required / Blocked Commands

Hermes must not automatically run:

```bash
git push
git merge
git rebase
git reset --hard
git clean -fd
npm install
pnpm add
pnpm remove
vercel --prod
prisma migrate deploy
```

Production deploys, database migrations, dependency changes, and secret changes are high/critical risk and require explicit future policy plus user approval.

## Packet Types (Implemented)

Hermes packet builder (`lib/hermes/packet-builder.ts`) produces the following packet types:

### Phase Success Packet (PhaseSuccessPacket)

Generated when execution completes cleanly (exit code 0, no file boundary violations, checks passed).

```typescript
{
  packet_type: "phase_success_packet",
  source: "hermes",
  packet_id: string,
  task_id: string,
  phase_id: string,
  plan_id: string,
  assigned_agent: string,
  execution_status: "success",
  log_summary: string (truncated to 200 chars),
  changed_files: string[],
  checks_result: { typecheck, lint, test, build: "pass" | "fail" | "skipped" },
  risk_level: "safe" | "low" | "medium" | "high" | "critical",
  pm_summary: string (PM-friendly sentence),
  recommended_next_action: string,
  created_at: ISO8601
}
```

### Phase Failure Packet (PhaseFailurePacket)

Generated when execution fails (non-zero exit code, boundary violation, or other failure).

```typescript
{
  packet_type: "phase_failure_packet",
  source: "hermes",
  packet_id: string,
  task_id: string,
  phase_id: string,
  plan_id: string,
  assigned_agent: string,
  execution_status: "failure",
  log_summary: string,
  changed_files: string[],
  checks_result: { typecheck, lint, test, build },
  failure_reason: string,
  risk_level: string,
  pm_summary: string,
  recommended_next_action: string,
  created_at: ISO8601
}
```

### Drift Detection Packet (DriftDetectionPacket)

Generated when execution modified files outside the allowed boundary.

```typescript
{
  packet_type: "drift_detection_packet",
  source: "hermes",
  packet_id: string,
  task_id: string,
  phase_id: string,
  plan_id: string,
  assigned_agent: string,
  execution_status: "drift",
  log_summary: string,
  changed_files: string[],
  drift_files: string[] (unexpected files touched),
  checks_result: { typecheck, lint, test, build },
  risk_level: string,
  pm_summary: string,
  recommended_next_action: string,
  created_at: ISO8601
}
```

### Approval Request Packet (HermesApprovalRequestPacket)

Generated when execution requires user approval before continuing.

```typescript
{
  packet_type: "approval_request_packet",
  source: "hermes",
  packet_id: string,
  task_id: string,
  phase_id: string,
  plan_id: string,
  assigned_agent: string,
  execution_status: "needs_approval",
  log_summary: string,
  changed_files: string[],
  checks_result: { typecheck, lint, test, build },
  approval_reason: string,
  risk_level: string,
  pm_summary: string,
  recommended_next_action: string,
  created_at: ISO8601
}
```

**Note:** Approval Request Packets are typed but not currently generated by the Phase E implementation. The approval gate happens pre-execution, not post-execution.

## Packet Generation (Phase E Implementation)

**File:** `lib/hermes/packet-builder.ts`

**Public API:**
```typescript
export function buildHermesPacket(input: HermesExecutionInput): HermesPacket
```

**Input Type:**
```typescript
type HermesExecutionInput = {
  executionStatus: "success" | "failure" | "drift" | "needs_approval",
  taskId: string,
  phaseId: string,
  planId: string,
  assignedAgent: string,
  logSummary: string,
  changedFiles: string[],
  driftFiles?: string[],
  checksResult: { typecheck, lint, test, build: CheckResult },
  failureReason?: string,
  approvalReason?: string,
  riskLevel: RiskLevel,
}
```

**Current State:**
- Packet builder is fully implemented and exported from `lib/hermes/index.ts`.
- Packets are NOT automatically generated on runner completion (Phase F work).
- Packets CAN be generated on-demand by calling `buildHermesPacket()`.
- Decision classification (`classifyExecutionDecision()`) derives next action independently.

## UI Locations (Target)

Hermes results will appear in:
- `/orchestration` dispatch/validation areas (when wired)
- Kanban task detail (when wired)
- Runner result summary (when wired)

**Status:** Currently implemented in components but not receiving packets from automatic runner completion.

## Decision Classification (Phase E Implementation)

**File:** `lib/orchestration/decision-classifier.ts`

**Public API:**
```typescript
export function classifyExecutionDecision(
  summary: HermesExecutionInput
): DecisionClassification
```

**Decision Values:** "pass" | "fail" | "qa_needed" | "retry_needed" | "blocked" | "drift_detected" | "manual_review"

**Output Type:**
```typescript
type DecisionClassification = {
  decision: DecisionLabel,
  reason: string,
  confidence: 0-100,
  nextAction: string,
}
```

**Current State:**
- Decision classification is fully implemented and used by status updater.
- Status updates (roadmap + kanban) happen based on classification results.
- No LLM involved; rules-based with no external dependencies.

## Status Updater (Phase E Implementation)

**File:** `lib/orchestration/status-updater.ts`

**Public API:**
```typescript
export async function updateRoadmapAndKanbanStatus(
  planId: string,
  taskId: string,
  decision: DecisionClassification,
  summary: ExecutionResultSummary
): Promise<void>
```

**Status Mapping:**
- "pass" → PlanTask status "done"
- "fail" → PlanTask status "blocked"
- "qa_needed" → PlanTask status "needs_review"
- "retry_needed" → PlanTask status "ready"
- "blocked" → PlanTask status "blocked"
- "drift_detected" → PlanTask status "needs_review"

**Safety Gates:**
- Rejects marking complete if checks failed or exitCode non-zero.
- Prevents auto-marking as "done" when test/lint/typecheck failed.

## Backlog

- **Telegram full approval bot integration** — Later phase. Packets can be sent to Telegram when integration exists.
- **Obsidian filesystem sync** — Later phase. Packet export to Obsidian notes can be added post-integration.
- **Automatic packet generation on runner completion** — Phase F work.
- **Packet display in UI** — Phase F work (wire packets to `/orchestration` and kanban views).
