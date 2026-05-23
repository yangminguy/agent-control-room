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
- Codex auto-run is DISABLED (QA-focused, requires supervision).
- Antigravity auto-run is DISABLED (UI designer, not CLI agent).
- Telegram full bot, Obsidian filesystem sync, Supabase durable storage, GitHub PR automation, production deployment automation, and Discord Webhook are backlog.

## Phase 2 Implementation Summary (Completed 2026-05-23)

Agent Control Room now includes full multi-agent orchestration:

- **Next Task Recommendation Engine**: Decision-to-task mapping (pass → next task, fail → fix, qa_needed → QA, etc.)
- **Agent Router**: Claude Code (arch/reasoning), Codex (QA-only, auto-run disabled), Antigravity (UI-only, manual)
- **Parallel Safety Decision Engine**: Conflict detection prevents multi-agent file collisions
- **Hermes Insight Recorder**: Captures execution patterns, file boundary violations, and errors
- **Orchestration Decision Panel**: PM-friendly recommendations in Korean UI
- **Agent Capability List**: Explains why each agent was selected and auto-run restrictions
- **E2E Smoke Test Runner**: Automated validation of main flow (planning → execution → status update)

Safety is preserved through intentional restrictions, not missing features. All restrictions are documented.

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

## Phase Final Build Implementation Summary (Completed 2026-05-23)

Multi-Agent Multi-Model Runtime is now complete:

- **Agent Runtime Registry**: Tracks agent availability, capabilities, status with 10 status types
- **Model Registry**: Seed models for Claude Code (3), Codex (3), Antigravity (7), Hermes
- **Agent × Model Router**: Routes tasks with risk-based decisions (auto/manual/release_gate/waiting)
- **Quota/Rate Limit Parser**: Extracts retry times from Codex, Claude, Antigravity errors
- **Antigravity Model Detection**: Detects capability (currently falls back to Claude instead of manual switching)
- **Handoff Engine**: Automatic fallback when agents unavailable (Codex → Claude, no model switch requests)
- **Recovery Scheduler**: Dry-run worker monitors waiting tasks and proposes recovery
- **Release Gate**: Scaffolding for dangerous operations (git push, deploy, DB migration)
- **OMC/OMX**: Optional runtime adapter scaffolding (not installed by default)
- **Comprehensive Tests**: 39 focused tests covering all components (all passing)

**Critical Design Rule Implemented**: User is NEVER asked to manually switch Antigravity models. System falls back automatically.

## Recommended Next Handoff

**Phase Pending: UI Integration & E2E Verification**

Next session: Codex for final documentation consistency and E2E test validation

```txt
Read:
- AGENTS.md, CLAUDE.md, docs/CONTROL_TOWER_DIRECTION.md, docs/PRD.md
- docs/ARCHITECTURE.md, docs/TASKS.md, docs/LOCAL_RUNNER_ARCHITECTURE.md
- docs/HERMES_BACKGROUND_WORKER.md
- docs/PHASE_2_COMPLETION_REPORT.md (multi-agent orchestration context)

Verify:
1. Main flow documented as: planning → roadmap → multi-agent task routing → 
   risk assessment → approval gate → local CLI execution → Hermes supervision → 
   packet generation → roadmap/kanban status update → next task recommendation

2. Roadmap is main surface, Kanban is detail, Hermes is supervisor, 
   approval gates block high/critical work, auto-run restrictions are intentional safety

3. E2E smoke test runner validates the complete main loop:
   npm run smoke:e2e:dry

4. No contradictions between TASKS.md, AGENT_STATE.md, HANDOFF.md, ARCHITECTURE.md, README.md

Suggested tasks:
- [ ] Run E2E smoke tests and collect logs
- [ ] Verify Hermes packet generation on sample execution
- [ ] Check multi-agent routing works with approval gates
- [ ] Verify Codex auto-run disable message appears correctly
```
