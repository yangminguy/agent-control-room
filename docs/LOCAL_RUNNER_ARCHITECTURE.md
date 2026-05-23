# LOCAL_RUNNER_ARCHITECTURE.md — Local CLI Automation

## Overview

Agent Control Room is a **local AI development automation control tower**.

It automates already-authenticated local tools where execution is verified and approval policy allows it.

Supported/target execution surfaces:
- Claude Code CLI
- Codex CLI if verified stable
- Antigravity IDE automation if verified safe
- Vibe Kanban workbench for detailed cards/sessions/diffs/previews
- Hermes as supervisor only

## Local Runner Bridge

The Local Runner Bridge connects Agent Control Room to local execution.

**Current Flow:**
```text
roadmap task
→ risk classification
→ scheduling recommendation
→ approval gate
→ local runner token/context binding (POST /api/workbench/approval)
→ agent adapter (spawn local CLI)
→ local CLI process (/api/runner)
→ ExecutionLog created & persisted
→ logs streamed as SSE
→ exit status recorded
→ git diff + boundary check recorded
→ ExecutionLog status: "done", "failed", or "boundary_violation"
→ Result normalization: normalizeExecutionResult() → ExecutionResultSummary
→ Decision classification: classifyExecutionDecision() → DecisionClassification
→ Status update: updateRoadmapAndKanbanStatus()
→ (Phase F) Packet generation: buildHermesPacket() [currently on-demand only]
→ roadmap & kanban status update
```

**Endpoints:**
- `POST /api/runner` — Main execution endpoint, SSE-streamed logs
- `GET /api/runner/result-summary?planId=...&taskId=...` — Normalized result lookup
- `POST /api/workbench/approval` — Request approval token
- `POST /api/orchestration/queue` — Queue task
- `POST /api/orchestration/dispatch` — Dispatch to runner

## Runner Requirements

The runner must:
- validate project path safety
- validate agent allowlist
- require approval tokens for risky execution
- bind approvals to plan/task/agent/cwd
- prevent token reuse
- stream logs in a user-friendly way
- capture exit code
- capture git diff
- capture typecheck/lint/test/build results where available
- return a result packet to the orchestration loop

## Approval Boundary

Low-risk supported tasks may run after the appropriate runner approval flow.

High/critical risk tasks must pause for explicit approval before execution.

Critical production actions remain manual unless a future phase adds a dedicated approval, rollback, and audit design.

## Adapter Status

| Adapter | Current Policy |
|---|---|
| Claude Code CLI | Primary local CLI execution target when configured and approved. |
| Codex | Backlog for automatic CLI execution until executable and safety behavior are verified. Use for QA/fixes through manual or result-import flow meanwhile. |
| Antigravity | Backlog for automatic IDE automation until a safe API/workspace flow is verified. Use for UI/UX through manual/workbench flow meanwhile. |
| Hermes | Supervisor only. May run safe checks and generate packets. Must not edit code. |
| Vibe Kanban | Detailed workbench bridge. Not the orchestration brain. |

## Execution Evidence (Phase E Implementation)

Each run produces:

**ExecutionLog (Persisted):**
- planTaskId
- agent
- branchName
- startedAt / completedAt
- logLines (array of strings)
- status: "running" | "done" | "failed" | "boundary_violation" | "needs_review"
- exitCode

**File:** `lib/storage/execution-log-store.ts`

**ExecutionResultSummary (Normalized):**
- planId
- taskId
- assignedAgent
- status (from ExecutionLog)
- logSummary (first 200 chars)
- changedFiles (reconstructed from [BOUNDARY] log lines)
- checksRun: { typecheck, lint, test, build: "pass" | "fail" | "not_run" }
- failureReason (if status !== "done")
- recommendedNextAction: "continue" | "manual_review" | "retry_same_agent" | "handoff_to_agent"

**File:** `lib/runner/execution-result-normalizer.ts`

**Retrieval:**
- `GET /api/runner/result-summary?planId=...&taskId=...` returns ExecutionResultSummary
- normalizeExecutionResult() is pure (no shell commands, no I/O)

## Result Normalization (Phase E)

**File:** `lib/runner/execution-result-normalizer.ts`

**Function:** `normalizeExecutionResult(log: ExecutionLog, planId: string, changedFiles: string[]): ExecutionResultSummary`

**What it does:**
- Derives execution status from ExecutionLog.status
- Scans log lines for typecheck/lint/test/build markers
- Extracts failure reason from [ERROR]/[BOUNDARY]/[REVIEW_BLOCKED] lines
- Determines recommended next action based on status and check results
- Returns PM-friendly summary with no shell execution

**What it does NOT do:**
- Does not re-run any commands
- Does not call shell or git
- Does not call external APIs
- Uses log analysis only (best-effort)

**Note on changedFiles:**
- changedFiles are collected by the runner during boundary checking
- Best-effort reconstruction from [BOUNDARY] log lines in result-summary endpoint
- Runner does not persist changedFiles directly on ExecutionLog (future improvement)

## Forbidden Without Future Policy

The runner and Hermes must not automatically run:

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

Also forbidden:
- production deployment
- database migration
- dependency changes
- secret or `.env` edits
- uncontrolled file deletion
- bypassing approval gates

## UI Connections

| UI | Runner Role |
|---|---|
| `/plan` | Shows task readiness, risk, status, and next action. |
| `/workbench` | Shows approval checklist, scheduling explanation, runner launch, and logs. |
| `/orchestration` | Shows queue, approval state, validation results, and re-orchestration. |
| Kanban detail | Shows task status, agent, acceptance criteria, logs, and result summary. |
| Hermes panel | Shows verification packets and drift/failure analysis. |

## Status Persistence (Phase E)

**In-Session Persistence:**
- ExecutionLog stored in JSON file: `data/execution-logs.json`
- Roadmap and PlanTask status updated in: `data/feature-plans.json`
- Status persists across page refreshes during same session

**Durable Persistence (Future):**
- Supabase integration is backlog until explicit requirements
- Current MVP uses local JSON storage
- No automatic sync to external databases

**Files Modified After Execution:**
- `lib/storage/execution-log-store.ts` — addExecutionLog, updateExecutionLog
- `lib/storage/feature-plan-store.ts` — updatePlanTaskStatus
- `lib/orchestration/status-updater.ts` — updateRoadmapAndKanbanStatus

## Decision Classification (Phase E)

**File:** `lib/orchestration/decision-classifier.ts`

**Function:** `classifyExecutionDecision(summary: HermesExecutionInput): DecisionClassification`

**Decision Logic (8 rules, no LLM):**
1. If status === "boundary_violation" → "drift_detected"
2. If status !== "done" → "blocked"
3. If any check failed → "qa_needed"
4. If all checks passed and status === "done" → "pass"
5. Risk-based gating (future phase)

**Output:** DecisionClassification with decision, reason, confidence 0-100, nextAction

## Phase F Stabilization Work

- **Wire packet generation** to /api/runner completion callback
- **Verify decision classification** accuracy on sample executions
- **Verify Hermes packet display** in `/orchestration` and kanban views
- **Test end-to-end flow:** plan → execution → result → status → next task
- **Keep Codex and Antigravity** automatic execution in backlog until verified
- **Update documentation** to reflect Phase E/F reality
