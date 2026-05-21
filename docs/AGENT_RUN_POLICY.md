# AGENT_RUN_POLICY.md — Agent Control Room

## Overview

This document defines **how** agents are executed: where they run, how they're monitored, what approval is required, and how results are captured.

Agent Control Room coordinates multiple execution surfaces:
- **Claude Code CLI** — local terminal-based execution with git/file access
- **Vibe Kanban Workbench** — collaborative session workspace with diffs and previews
- **Manual/User** — user-driven execution and decision-making

---

## Execution Surfaces

### Claude Code CLI (Local Terminal)
**When to use:**
- Low-context, focused tasks (1-2 hour sessions)
- Git branch + diff analysis needed
- Direct file access required
- Real-time debugging or interaction needed
- Task requires immediate execution (not async)

**How it works:**
1. Orchestrator generates prompt + Context Pack
2. Handoff includes specific files to inspect/edit
3. User runs Claude Code CLI in terminal
4. Session runs locally with git branch creation
5. SSE log streaming shows progress in UI
6. Diff is analyzed and stored
7. Session report is generated and saved
8. Next task is recommended

**Approval Gates:**
- User must approve execution before starting
- High-risk work shows file blocklist/allowlist
- Long-running or risky operations may require mid-session confirmation

**Monitoring:**
- `/plan` shows real-time runner log
- Session state tracked in `ExecutionLog`
- Diff preview available before completion

**Handoff:**
- Session report saved to `data/session-reports.json`
- Changed files + context preserved
- Next agent or user can read session report as context

---

### Vibe Kanban Workbench
**When to use:**
- Multi-session or long-running work (>2 hours)
- Collaborative workspace with diffs/previews
- Work should be visible and pausable
- Terminal spawning is not available or undesired
- User prefers workbench-style UI to CLI

**How it works:**
1. Orchestrator generates prompt + Context Pack
2. Handoff creates Vibe Kanban issue card
3. Card is linked from `/plan` or sent to user
4. User opens workspace and activates session
5. Vibe Kanban spawns Claude Code/Codex/Antigravity session
6. Agent runs in workspace with full context
7. Diffs/previews available in real-time
8. Work can be paused/resumed across sessions
9. Results are pulled back to Orchestrator
10. Session report and diff stored
11. Next task is recommended

**Approval Gates:**
- Same as CLI (user must approve before starting)
- Additional gate: linking to Vibe Kanban workspace

**Monitoring:**
- Vibe Kanban UI shows workspace status
- Diffs/previews visible in workspace
- Control Room can poll status via bridge API

**Handoff:**
- Vibe Kanban workspace remains open
- Session is paused, not closed
- Next session can resume from workspace
- Or: session result is exported, new workspace created for next task

---

### Manual / User Execution
**When to use:**
- User prefers to run agent directly (Claude.ai, IDE extension, etc.)
- Control Room cannot spawn agents (permission/setup limitation)
- User wants to control execution timing
- User is debugging or experimenting

**How it works:**
1. Orchestrator generates prompt + Context Pack
2. User copies prompt to their preferred tool (Claude.ai, VS Code, etc.)
3. User runs agent manually
4. User pastes back session report or diff
5. Orchestrator analyzes result
6. Session stored and next task recommended

**Approval Gates:**
- Prompt must be approved before copying
- Session report must be manually entered (can't auto-analyze)

**Monitoring:**
- None (user is executing, not Orchestrator)
- Status is manually updated in UI

**Handoff:**
- User provides session report manually
- Diff/changed files entered by user
- Next agent recommends based on manual input

---

## Approval Gate Policy

### When Approval is Required

**Before** agent execution (ALL cases):
- HIGH or CRITICAL risk tasks
- Database/auth/deployment changes
- Package updates or dependency changes
- Breaking changes to APIs or data models
- Any task that deletes files or makes significant structural changes

**Mid-session** (user can request early stop):
- Long-running tasks (>1 hour)
- Tasks that are blocking other work
- Unexpected errors or warnings
- Agent requests clarification or decision

**After** completion (review before merge):
- Code review for high-risk changes
- Diff/impact analysis for medium-risk changes
- Test verification for feature work

### Approval Checklist

Before showing "Approve" button to user:
- [ ] Task is clearly scoped with acceptance criteria
- [ ] Risk level is identified (LOW/MEDIUM/HIGH/CRITICAL)
- [ ] Execution mode is shown (Single/Sequential/Parallel/Relay)
- [ ] Required approval gates are listed
- [ ] Files to inspect (read-only) are listed
- [ ] Files allowed to edit are listed
- [ ] Files blocked from editing are listed (if any)
- [ ] Responsible agent is named
- [ ] Expected outcome is clear
- [ ] Next task is planned

---

## Execution Flow

### Standard Execution Flow

```
User provides direction
    ↓
Orchestrator translates + generates roadmap
    ↓
Orchestrator decomposes into tasks
    ↓
Orchestrator routes to agent
    ↓
[APPROVAL GATE] User reviews + approves
    ↓
Orchestrator generates prompt + Context Pack
    ↓
Handoff to execution surface (CLI / Workbench / Manual)
    ↓
Agent executes
    ↓
[MID-SESSION] Any blockers? Ask user for decision
    ↓
Agent completes + submits session report
    ↓
[REVIEW GATE] User reviews diff/results (if HIGH/CRITICAL risk)
    ↓
Orchestrator analyzes result + diffs
    ↓
Orchestrator updates roadmap + generates Context Pack
    ↓
Orchestrator recommends next task
    ↓
Loop or Complete
```

### Token Relay Flow

```
Current agent hits token limit
    ↓
Agent signals status → `token_limited`
    ↓
Orchestrator generates Context Pack
    ↓
[GATE] User reviews relay plan
    ↓
Orchestrator selects relay agent
    ↓
Orchestrator generates relay prompt from Context Pack
    ↓
Handoff to relay agent
    ↓
Relay agent executes
    ↓
Relay agent completes + submits session report
    ↓
Orchestrator analyzes result
    ↓
[DECISION] Should we bring original agent back?
    ↓
If yes: handoff result to original agent for final integration/review
If no: continue with relay agent or mark complete
    ↓
Roadmap updated + next task recommended
```

### Parallel Execution Flow

```
Orchestrator identifies parallel-safe work streams
    ↓
[GATE] User reviews parallel plan + agents
    ↓
Orchestrator generates prompts for Agent A + Agent B
    ↓
Handoff to both agents in parallel
    ↓
Agent A runs (e.g., Claude Code on API)
Agent B runs in parallel (e.g., Antigravity on UI)
    ↓
[COORDINATION] If outputs must integrate:
    - Wait for Agent A to complete
    - Use Agent A's output as context for Agent B
    - Move to Sequential mode
    ↓
Both agents complete
    ↓
Orchestrator analyzes both results
    ↓
Orchestrator updates roadmap + recommends next task
    ↓
Loop or Complete
```

---

## Session Report Format

Every agent execution must produce a session report:

```markdown
# Session Report

## Summary
[1-2 sentence overview of what was accomplished]

## Changed Files
- `file/path.ts`: [description of changes]
- `another/file.tsx`: [description of changes]

## Tests Run
[List of tests run and results: PASS/FAIL]

## Completed
- [Completed task 1]
- [Completed task 2]
- [Completed acceptance criteria]

## Remaining Issues
[Any blockers, incomplete work, or errors]

## Recommended Next Task
[What should happen next?]

## Handoff Needed?
[Yes/No — if yes, which agent?]
```

---

## Error & Blocker Handling

### If Agent Errors

**Light error (e.g., typo, minor type issue):**
1. Show error in runner log
2. Ask user: "Retry?" or "Continue?"
3. If continue: move to Codex or another agent for fixes

**Serious error (e.g., logic issue, test failures):**
1. Stop execution
2. Generate Context Pack with error details
3. Ask user: "Fix with current agent?" or "Handoff for debugging?"
4. If handoff: hand to Codex for fix or Claude Code for analysis

**Critical error (e.g., deleted file, deploy failed):**
1. STOP — Block further execution
2. Generate alert + Context Pack
3. User must manually decide next step

### If Agent is Blocked

**Waiting for decision:**
1. Pause execution
2. Show blocking decision to user
3. User makes decision
4. Resume execution with decision context

**Waiting for external action:**
1. Pause execution
2. Ask user to complete action (e.g., run migration, deploy)
3. Resume when action is complete

**Permanent blocker (e.g., missing credential):**
1. Show blocker clearly
2. Provide instructions to fix
3. User must fix before continuing

---

## Result Analysis & Storage

After agent completion:

### Immediate (by Orchestrator):

1. **Capture session report** — Store in `data/session-reports.json`
2. **Analyze diff** — Extract changed files and line counts
3. **Test verification** — Check test results (if available)
4. **Impact assessment** — How many files? Which critical areas?
5. **Next task recommendation** — Based on what was completed
6. **Context pack** — If token relay or long work, generate for next session

### Long-term (stored in memory):

- Session report persists in `session-reports.json`
- Changed files documented in roadmap
- Decisions and blockers documented in session report
- Insights extracted for Obsidian-compatible memory

### Handoff to Next Task

Generate Context Pack with:
- Link to previous session report
- Summary of completed work
- Changed files + impact
- Important decisions made
- Any blockers or decisions needed for next task
- Acceptance criteria for next agent
- File allowlist/blocklist

---

## Monitoring & Logging

### What Gets Logged

- Agent status changes (available → token_limited, etc.)
- Task start/stop times
- Session reports
- Errors and blockers
- User approvals and decisions
- File changes and diffs
- Test results

### Where Logs Are Stored

- Session reports: `data/session-reports.json`
- Execution logs: `ExecutionLog` records in `/plan`
- Agent status: `lib/agents/agent-availability-manager.ts`
- Diffs: In git history + session report

### Monitoring in UI

- `/plan` shows real-time runner log for CLI tasks
- `/reports` page shows session report history
- `/agent-status` page shows current agent availability
- Each roadmap stage shows completion status + last session

---

## Safety Rules

### Do Not

- [ ] Don't execute without user approval (except read-only verification)
- [ ] Don't edit blocked files (even if agent can)
- [ ] Don't run agents in parallel on same files
- [ ] Don't skip approval gates for HIGH/CRITICAL risk
- [ ] Don't delete files without explicit user confirmation
- [ ] Don't merge to main without review (if MEDIUM/HIGH risk)
- [ ] Don't let Hermes be the primary executor (monitoring only)
- [ ] Don't assume token status; ask agent explicitly

### Do

- [ ] Always generate Context Pack for token relay
- [ ] Always capture session report after completion
- [ ] Always analyze diffs before recommending next task
- [ ] Always show file allowlist/blocklist to user
- [ ] Always let user review HIGH/CRITICAL risk changes
- [ ] Always recommend approval gates in prompts
- [ ] Always preserve session history for reference

---

## Integration with Vibe Kanban

### Sending Work to Vibe Kanban

When user chooses workbench execution:

1. Orchestrator generates prompt + Context Pack
2. Convert to Vibe Kanban issue format (via `lib/integrations/vibe-kanban.ts`)
3. Show issue card in `/plan` with link
4. User clicks link → opens Vibe Kanban workspace
5. Workspace spawns session with prompt
6. Agent executes in workbench

### Reading Results Back

When work returns from Vibe Kanban:

1. Poll workspace status (via Vibe Kanban API or manual input)
2. If complete: fetch session report + diffs
3. Import into `data/session-reports.json`
4. Analyze results
5. Update roadmap
6. Recommend next task

### Mock Vibe Kanban (Development)

If Vibe Kanban is offline:
- Use `MockVibeKanbanClient` for development
- Show issue card in UI (non-functional link)
- User can still use CLI execution as fallback

---

## Related Documents
- [[AGENT_SCHEDULING_POLICY.md]] — When to use which agents and execution modes
- [[CONTEXT_TOKEN_RESUME_PROTOCOL.md]] — Token relay and handoff flow
- [[AGENTS.md]] — Agent roles and capabilities
- [[AGENT_STATE.md]] — Current agent status and availability

---

## Last Updated
2026-05-21 — Initial policy definition
