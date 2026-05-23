# HANDOFF.md — Agent Control Room

## Current Handoff Status

Agent Control Room has been realigned as a **roadmap-driven local AI development automation control tower**.

Handoff is no longer the main product loop. It is a support mechanism used when:
- work moves to another agent
- a session is token/context limited
- a task goes to Vibe Kanban for detailed workbench execution
- execution fails and another agent should verify or repair
- the user pauses and later resumes

The main loop remains:

```text
planning → roadmap → local CLI execution → Hermes supervision → result analysis → roadmap update
```

## Current Direction Summary

- Roadmap is the main control surface.
- Kanban is detailed task inspection.
- Local CLI automation is core when adapters are verified and approval rules pass.
- Hermes is a Background Execution Supervisor, not a coding agent.
- Vibe Kanban is a detailed execution workbench, not the product brain.
- High/critical risk work requires user approval.
- Telegram full bot, Obsidian filesystem sync, Supabase durable storage, GitHub PR automation, production deployment automation, Discord Webhook, unverified Codex CLI, and unverified Antigravity automation are backlog.

## Required Handoff Contents

Every handoff or Context Pack must include:

- project goal
- current roadmap phase
- completed work
- changed files
- important decisions
- blockers
- next task
- assigned agent
- risk level
- files to inspect
- files allowed to edit
- files not allowed to edit
- acceptance criteria
- checks to run
- remaining work
- next prompt

## Session Report Format

```md
# Session Report

## Summary

## Roadmap Phase

## Assigned Agent

## Changed Files

## Checks Run
- typecheck:
- lint:
- test:
- build:

## Acceptance Criteria Result

## Completion Judgment

## Remaining Issues

## Recommended Next Task

## Handoff Needed?
```

## Context Pack Format

```md
# Context Pack

## Project Goal

## Current Product Direction

## Roadmap Phase

## Completed Work

## Changed Files

## Important Decisions

## Current Blockers

## Next Task

## Assigned Agent

## Risk Level

## Acceptance Criteria

## Files To Inspect

## Editable Files

## Do Not Touch

## Checks

## Prompt for Next Session
```

## Hermes Packet Formats

### Phase Completion Packet

```md
# Phase Completion Packet

## Phase
## Assigned Agent
## Completed Work
## Changed Files
## Checks
- typecheck:
- lint:
- test:
- build:

## Acceptance Criteria Result
## Remaining Risks
## Recommended Next Task
```

### Failure Packet

```md
# Failure Packet

## Failed Task
## Assigned Agent
## Failure Summary
## Error Logs
## Affected Files
## Likely Cause
## Recommended Fix Agent
## Retry Recommendation
```

### Drift Detection Packet

```md
# Drift Detection Packet

## Original Direction
## Actual Change
## Drift Summary
## Risk
## Recommended Re-orchestration
## Should Pause Automation?
```

### Approval Request Packet

```md
# Approval Request Packet

## Requested Action
## Risk Level
## Why Approval Is Needed
## What Will Happen If Approved
## What Will Happen If Rejected
## Recommended Decision
```

### Re-orchestration Packet

```md
# Re-orchestration Packet

## Trigger
## Current Roadmap State
## Evidence
## Drift Or Failure Summary
## Proposed New Plan
## Agent Recommendation
## Approval Needed?
## Next Prompt
```

## Handoff Safety Rules

- Do not hide uncertainty.
- Do not make Hermes a coding agent.
- Do not hand high/critical work to parallel agents.
- Do not omit changed files or acceptance criteria.
- Do not present copy-paste as the primary workflow when local automation is available and safe.
- Do not treat Telegram, Discord, GitHub PRs, production deploys, DB migrations, or dependency changes as automatic.

## Recommended Next Handoff

Next useful handoff is to Codex for bounded verification:

```txt
Read AGENTS.md, CLAUDE.md, docs/CONTROL_TOWER_DIRECTION.md, docs/PRD.md,
docs/ARCHITECTURE.md, docs/TASKS.md, docs/LOCAL_RUNNER_ARCHITECTURE.md,
and docs/HERMES_BACKGROUND_WORKER.md.

Verify that the main flow is consistently documented as:
planning → roadmap → local CLI execution → Hermes supervision → result analysis → roadmap update.

Check that Roadmap is main, Kanban is detail, Hermes is supervisor, and high/critical risk work is approval-gated.
```
