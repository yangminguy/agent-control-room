# AGENT_RUN_POLICY.md — Agent Control Room

## Overview

This document defines how Agent Control Room executes and monitors work.

The product loop is:

```text
planning → roadmap → risk/scheduling → approval → local runner/workbench → Hermes supervision → result analysis → roadmap update
```

## Execution Surfaces

### Local CLI Runner

Use for supported, verified local agent execution.

Current primary target:
- Claude Code CLI

Backlog until verified:
- Codex CLI automation
- Antigravity IDE automation

Requirements:
- approved task packet
- risk classification
- scheduling recommendation
- context-bound approval token where required
- path validation
- agent allowlist
- log streaming
- diff and check capture
- result returned to roadmap/task state

### Vibe Kanban Workbench

Use for detailed workbench execution:
- issue cards
- workspaces
- sessions
- diffs
- previews

Vibe Kanban is not the roadmap brain. Agent Control Room still owns product direction, task decomposition, risk, approval, and result interpretation.

### Manual/User

Use only when:
- local automation is unavailable
- an agent adapter is unverified
- credentials or product decisions are needed
- high/critical risk work must be performed manually

Manual copy-paste is a fallback, not the main product direction.

### Hermes Supervisor

Hermes watches and verifies. Hermes does not code.

Hermes can run safe checks, summarize logs, detect drift, and generate packets. It cannot edit files or execute risky commands.

## Approval Gate Policy

Approval is required before:
- high/critical risk execution
- database/auth/deployment/package changes
- destructive file operations
- runner, approval-token, security, or infrastructure changes
- any action that could affect production, secrets, or git history

Approval UI must show:
- task scope
- risk level
- why approval is needed
- responsible agent
- execution mode
- files to inspect
- files allowed to edit
- files blocked from editing
- expected outcome
- what happens if approved or rejected

## Execution Flow

```text
User provides direction
→ roadmap and tasks are generated
→ task receives agent, risk, and scheduling recommendation
→ approval gate blocks risky work
→ local runner/workbench starts after approval
→ logs stream to UI
→ diff and checks are captured
→ Hermes generates packet
→ result classifier suggests Pass / Fail / QA / Retry / Blocked / Drift
→ roadmap and kanban status update
→ next task, retry, QA, pause, or re-orchestration
```

## Result States

Use these user-facing states:
- Pass
- Fail
- QA Needed
- Retry Needed
- Blocked
- Drift Detected

Auto-decision panels may suggest a result, but should not silently execute high/critical next steps.

## Session Report Format

```md
# Session Report

## Summary

## Roadmap Phase

## Assigned Agent

## Changed Files

## Checks Run

## Acceptance Criteria Result

## Completion Judgment

## Remaining Issues

## Recommended Next Task

## Handoff Needed?
```

## Safety Rules

- Do not execute high/critical risk work without approval.
- Do not let Hermes edit code.
- Do not let two agents edit the same files in parallel.
- Do not run production deploys, DB migrations, dependency changes, push, merge, rebase, reset, or clean automatically.
- Do not assume Codex CLI or Antigravity automation is available until verified.
- Do not make Manual/User copy-paste the main flow when safe local automation exists.

## UI Terms For Non-Developers

- dispatch → execution task
- token → one-time approval pass
- stdout/stderr → execution logs
- execution mode → execution approach
- diff → changed files/content
- parallel safe → safe to run at the same time
- risk level → risk
- approval gate → approval check
- runner → local executor

## Related Documents

- `docs/CONTROL_TOWER_DIRECTION.md`
- `docs/LOCAL_RUNNER_ARCHITECTURE.md`
- `docs/HERMES_BACKGROUND_WORKER.md`
- `docs/AGENT_SCHEDULING_POLICY.md`
- `docs/TASKS.md`
