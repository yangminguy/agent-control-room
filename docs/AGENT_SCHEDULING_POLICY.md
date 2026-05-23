# AGENT_SCHEDULING_POLICY.md — Agent Control Room

## Overview

Agent Control Room chooses an execution approach based on risk, file conflicts, agent availability, and completion criteria.

Scheduling is a system recommendation. A non-developer PM should see a clear explanation, not be forced to solve agent coordination manually.

## Execution Modes

| Mode | Use When | Notes |
|---|---|---|
| Single Agent | High-risk or tightly-coupled files | One owner. Required for runner, approval, auth, DB, package, deployment, and security work. |
| Sequential | One agent should build and another should verify | Example: Claude Code implements, Codex tests. |
| Parallel Safe | Files are separate and no shared state/conflict exists | Never use when agents edit the same files. |
| Token Relay | Current agent is token-limited or context-overloaded | Generate Context Pack and continue with a suitable agent. |

## Risk Levels

### Safe / Low

Examples:
- docs
- static templates
- read-only verification
- isolated tests
- Hermes summaries and safe checks

Allowed:
- may run with lightweight approval or documented policy
- may run parallel if files do not conflict

### Medium

Examples:
- bounded feature implementation
- isolated API route
- isolated UI component
- backwards-compatible data model addition

Allowed:
- approval recommended
- sequential mode preferred if verification is needed

### High

Examples:
- large refactor
- shared data model
- auth/security
- runner or approval logic
- package/config changes
- file deletion

Allowed:
- explicit approval required
- single agent or tightly controlled sequential mode

### Critical

Examples:
- production deployment
- DB migration on real data
- secrets/credential changes
- git push/merge/rebase/reset/clean
- production data deletion

Allowed:
- manual by default
- future automation requires dedicated policy, approval, audit, and rollback design

## File Conflict Rules

Forbidden parallel cases:
- two agents editing the same file
- two agents editing the same route/component
- two agents changing shared types or data models
- two agents touching runner/approval/security logic
- package/env/deployment changes in parallel

Parallel-safe cases:
- separate routes/components with no shared hooks/state
- one implementation task and one read-only verification task
- docs or static data separated by ownership
- Hermes monitoring while another agent works, as long as Hermes is read-only

## Agent Boundaries

| Agent | Primary Use | Scheduling Notes |
|---|---|---|
| Claude Code | Architecture, complex implementation, runner/security/integration work | Single owner for high-risk work. |
| Codex | Tests, QA, bounded fixes, type errors | Sequential verification after implementation. CLI automation remains backlog until verified. |
| Antigravity | UI/UX visual work | Use for separate UI surfaces. IDE automation remains backlog until verified. |
| Hermes | Monitoring, checks, packets, reports | Can run parallel only as read-only supervisor. |
| Vibe Kanban | Detailed workbench sessions | Workbench surface, not orchestration decision-maker. |

## Scheduling Explanation Examples

Sequential:

```text
Recommended execution approach: Sequential

Reason:
Claude Code should change the structure first. Codex should verify tests after that.
Running both at the same time could touch the same files.
```

Parallel Safe:

```text
Recommended execution approach: Parallel Safe

Reason:
Claude Code will edit the API route while Antigravity works on a separate UI component.
The file boundaries do not overlap.
```

Single Agent:

```text
Recommended execution approach: Single Agent

Reason:
This task touches runner or approval logic. One agent should own the change and the user must approve it.
```

## Decision Checklist

- Is risk high or critical? Use Single Agent and require approval.
- Do files overlap? Use Sequential.
- Is one task read-only? Parallel Safe may be allowed.
- Is the current agent token-limited? Generate Context Pack and use Token Relay.
- Is Hermes assigned to edit code? Stop and reassign.
- Is Codex CLI or Antigravity automation assumed without verification? Move to manual/backlog.

## Related Documents

- `docs/AGENT_RUN_POLICY.md`
- `docs/LOCAL_RUNNER_ARCHITECTURE.md`
- `docs/HERMES_BACKGROUND_WORKER.md`
- `docs/TASKS.md`
