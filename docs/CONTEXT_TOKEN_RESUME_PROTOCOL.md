# CONTEXT_TOKEN_RESUME_PROTOCOL.md — Agent Control Room

## Overview

This document defines how Agent Control Room handles **context reset, token exhaustion, and handoff to another agent** when a session becomes too long, token-heavy, or blocked.

Core principle: **Don't abandon work. Preserve context and hand off to a fresh agent.**

---

## When to Trigger Context Reset

A context reset is needed when:

1. **Token Limit Approaching**
   - Agent signals `token_limited` status
   - Session is >80% of model's token window
   - Agent reports "context too long" error

2. **Context Overload**
   - Agent signals `context_overloaded` status
   - Session has 3+ failed attempts at the same task
   - Agent's reasoning quality is degrading (can't track state)

3. **Session Timeout**
   - Work has been running >4 hours
   - Agent is repeating decisions or explanations
   - User requests reset for clarity

4. **Natural Handoff Point**
   - Completion milestone reached (e.g., feature implemented)
   - Task type is changing (e.g., implementation → QA)
   - Different agent specialization is needed
   - User wants to add new context or direction

5. **Blocker**
   - Agent can't proceed without user decision
   - Agent is waiting on external action
   - Agent has hit a limitation (e.g., can't deploy from CLI)

---

## Context Pack Generation

When context reset is triggered, generate a **Context Pack**.

A Context Pack is a structured Markdown document that summarizes work-in-progress and enables handoff to another agent without losing continuity.

### Context Pack Structure

```markdown
# Context Pack: [Project Name] / [Task Name]

## Goal
[What are we building? Why?]

## Completed Work
- [Completed item 1]
- [Completed item 2]
- [Completed acceptance criteria]

## Changed Files
- `file/path/a.ts`: [change description] (added/modified/deleted)
- `file/path/b.tsx`: [change description]
- [Include file sizes/line counts for impact assessment]

## Current State
[One paragraph: where are we in the task? What was the last action?]

## Key Decisions
- **Decision 1**: Why we chose X over Y (because of Z constraint)
- **Decision 2**: Why we implemented it this way
- [Include rationale so next agent doesn't revisit same decisions]

## Important Constraints
- [Don't delete this database column; it's used by migration script]
- [Keep auth middleware in place; compliance requirement]
- [Don't refactor this component; UI freeze until release]
- [This file is read-only; external service depends on it]

## Current Blockers
- **Blocker 1**: [Description]. What's needed to unblock: [action/decision]
- **Blocker 2**: [Description]. What's needed: [action/decision]

## Remaining Work
1. [Next sub-task]
2. [Sub-task after that]
3. [Final sub-task]

## Acceptance Criteria (for next agent)
- [ ] [Criterion 1]
- [ ] [Criterion 2]
- [ ] [Criterion 3]

## Files Allowed to Edit
- `app/api/route.ts`
- `lib/utils.ts`
- `components/Feature.tsx`

## Files BLOCKED from Editing
- `package.json` (dependency freeze)
- `lib/auth/middleware.ts` (compliance)
- `docs/DEPLOYMENT.md` (external reference)

## Do-Not-Do Rules
- Don't merge to main until tests pass
- Don't add new dependencies
- Don't delete migration scripts
- Don't refactor beyond the immediate task scope

## Next Prompt (for relay agent)
[Exact prompt that relay agent should use, derived from original direction but refined with learnings]

## Session History (Links)
- [Link to previous session report 1]
- [Link to previous session report 2]
- [Optional: inline key decisions/errors from previous sessions]

## Requested Agent
[Claude Code / Codex / Antigravity / User Decision]

## Reason for Relay
[token_limited / context_overloaded / specialization / natural_handoff / blocker]

## Token / Context Stats (Optional)
- Token used: [X] / [Y] (approx %)
- Context window filled: [X] / [Y] (approx %)
- Estimated tokens for next phase: [estimated Y tokens]
```

### Context Pack Example

```markdown
# Context Pack: Agent Control Room / T030 Agent Availability Manager

## Goal
Build a centralized agent availability manager to track and recommend agents based on token/context/status.

## Completed Work
- [x] TypeScript types for agent status (available, token_limited, context_overloaded, blocked, manual_only)
- [x] File `lib/agents/agent-availability-manager.ts` created
- [x] Function `getAgentStatus(agentName)` returns current status
- [x] Function `recommendFallback(primaryAgent, reason)` recommends alternative agent
- [x] `/api/agents/status` endpoint returns all agent statuses
- [x] Agent statuses wired into Senior Dev Prompt Compiler
- [x] UI component `AgentStatusPanel` shows all agents + statuses

## Changed Files
- `lib/agents/agent-availability-manager.ts`: [NEW] agent status tracking + recommendation logic (182 lines)
- `lib/types.ts`: [MODIFIED] added AgentStatus, AgentAvailability types (32 added lines)
- `lib/prompts/senior-dev-prompt-compiler.ts`: [MODIFIED] integrated agent availability checks (18 added lines)
- `components/agents/AgentStatusPanel.tsx`: [NEW] UI component showing agent statuses (145 lines)
- `app/api/agents/status/route.ts`: [NEW] API endpoint (24 lines)

## Current State
Claude Code has completed the agent availability manager core. All functions are written, tests pass locally, and the UI shows agent statuses correctly. The system now tracks which agents are available, which are token-limited, and recommends fallbacks automatically.

Ready for: UI polish (Antigravity) or comprehensive testing (Codex).

## Key Decisions
- **Status model**: Used enum-like string constants instead of full enum for flexibility (can add new statuses later without migration)
- **Recommendations**: Fallback algorithm prioritizes agent capability match first, then status health second (e.g., if Claude Code is token_limited, recommend Codex for tests, not Antigravity for UI)
- **API shape**: `/api/agents/status` returns flat object `{ agentName: status }` for simplicity; can extend later with detailed metadata

## Important Constraints
- Don't merge to main until Codex runs comprehensive tests
- Don't change AgentStatus enum without updating AGENT_STATE.md
- Status is manually set by user; no automatic token detection yet
- Hermes should never be the primary agent; always be fallback/background only

## Current Blockers
- **Blocker 1**: Need to decide if agent status should be persisted to database or stay in-memory. Currently in-memory only.
  - Needed: User decision on persistence strategy

## Remaining Work
1. Write comprehensive unit tests for `agent-availability-manager.ts`
2. Run type safety checks (`tsc --noEmit`)
3. Polish `AgentStatusPanel` UI (responsive design for mobile)
4. Update `/hermes-packets` UI to respect agent availability
5. Integration test: can the full flow (direction → agent recommendation) find a fallback?
6. Final review + merge to main

## Acceptance Criteria (for next agent)
- [ ] 100% of agent availability functions have unit tests with >80% coverage
- [ ] Type safety checks pass (`tsc --noEmit`)
- [ ] `AgentStatusPanel` looks polished on mobile + desktop
- [ ] All acceptance criteria from T029 are verified
- [ ] No regressions in existing `/plan` or prompt compiler functionality

## Files Allowed to Edit
- `lib/agents/agent-availability-manager.ts`
- `lib/types.ts` (only agent-related types)
- `components/agents/AgentStatusPanel.tsx`
- `app/api/agents/status/route.ts`
- Test files (`__tests__/*`)

## Files BLOCKED from Editing
- `lib/prompts/senior-dev-prompt-compiler.ts` (only read; do't refactor)
- `docs/CLAUDE.md` (immutable)
- `AGENTS.md` (only user can edit)

## Do-Not-Do Rules
- Don't add new agent types; stick to existing 4 (claude-code, codex, antigravity, hermes)
- Don't add automatic token usage tracking; only manual status
- Don't make Hermes a primary executor
- Don't merge without test coverage

## Next Prompt (for relay agent)
```
Context Pack: T030 Agent Availability Manager

Goal: Polish and test the agent availability manager (tests, UI, integration).

Current state:
- Core logic complete: agent-availability-manager.ts
- API endpoint complete: /api/agents/status
- UI component exists: AgentStatusPanel.tsx
- Ready for: testing + UI polish

Next steps:
1. Write comprehensive unit tests for `lib/agents/agent-availability-manager.ts` (target: >80% coverage, all agent fallback scenarios)
2. Run `tsc --noEmit` for type safety
3. Polish `AgentStatusPanel` UI for mobile + desktop responsiveness
4. Integration test: direction → roadmap → task → agent recommendation → fallback selection
5. No regressions in existing `/plan` or prompt compiler features

Acceptance criteria:
- All functions have unit tests
- Type safety passes
- UI looks polished
- Full integration flow works
- All tests from previous task pass

Files allowed: `lib/agents/`, `lib/types.ts`, `components/agents/`, `app/api/agents/`, `__tests__/`
Files blocked: `senior-dev-prompt-compiler.ts`, `AGENTS.md`, `CLAUDE.md`

Do-not-do: add new agent types, automatic token tracking, make Hermes primary, merge without tests.
```

## Session History (Links)
- Session 1: Claude Code built core types + availability manager logic
- Key decision: Manual status tracking, not automatic token measurement
- Key decision: Fallback prioritizes specialization first, then health

## Requested Agent
Codex (for comprehensive testing) or Antigravity (for UI polish) — user to choose.

## Reason for Relay
Claude Code context growing; tests + UI polish are better suited to Codex + Antigravity specialization.

## Token / Context Stats
- Token used: ~12,000 / 200,000 (6%)
- Context window filled: ~4,500 / 128,000 tokens (3.5%)
- Estimated tokens for testing phase: ~5,000 more
```

---

## Context Pack Generation Workflow

### Trigger Check (Orchestrator)

```typescript
const shouldGenerateContextPack = (session) => {
  return (
    session.agent_status === "token_limited" ||
    session.agent_status === "context_overloaded" ||
    session.duration_minutes > 240 || // 4 hours
    session.task_change_needed === true ||
    session.is_blocked === true
  );
};
```

### Generation (Orchestrator)

1. Get session state from agent (session report, changed files, logs)
2. Summarize completed work from logs/diffs
3. Extract key decisions from session transcript
4. List remaining work from task definition
5. Identify blockers from agent signals
6. Create file allowlist/blocklist from current task
7. Draft next prompt (refine original + incorporate learnings)
8. Select relay agent based on next task type
9. Format as Context Pack Markdown
10. Store in `data/context-packs.json`
11. Show to user for review (optional: user can edit before handoff)

### Storage

Store Context Packs in:
```
data/context-packs.json
{
  "packs": [
    {
      "id": "ctx-2026-05-21-t030-001",
      "task_name": "T030 Agent Availability Manager",
      "created_at": "2026-05-21T14:30:00Z",
      "source_agent": "claude-code",
      "relay_agent": "codex",
      "markdown": "[full context pack markdown]",
      "changed_files": ["file1.ts", "file2.tsx"],
      "blockers": ["blocker description"],
      "used": false,
      "used_at": null
    }
  ]
}
```

---

## Token Relay Flow

### Step 1: Agent Signals Token Limit

Agent outputs:
```
[CONTEXT PACK REQUEST]
Status: token_limited
Reason: Approaching token limit
Tokens used: ~140,000 / 200,000
Recommend relay to: codex
For task: testing
```

### Step 2: Orchestrator Generates Context Pack

1. Parse agent signal
2. Get session report
3. Analyze diffs
4. Summarize decisions + blockers
5. Generate Context Pack
6. Select relay agent
7. Create relay prompt

### Step 3: User Reviews + Approves Relay

Show in UI:
```
🔄 Context Reset Recommended

Current agent: Claude Code (token_limited)
Suggested relay: Codex (for testing)

Summary of work:
- [Summary of completed work]
- [Summary of blockers]
- [Summary of remaining work]

[APPROVE RELAY] [CONTINUE SAME AGENT] [MANUAL DECISION]
```

User clicks `[APPROVE RELAY]`.

### Step 4: Handoff to Relay Agent

1. Save Context Pack
2. Generate relay prompt from Context Pack
3. Show handoff summary to user
4. Execute relay agent (CLI / Workbench / Manual)

Relay prompt preamble:
```
# Relay from Claude Code to Codex

This is a token relay. Claude Code completed architectural work; 
your task is to test and verify.

## Context Summary
[Summarized context pack]

## Your Task
[Testing task]

## Acceptance Criteria
[From context pack]

## Files Allowed
[From context pack]
```

### Step 5: Relay Agent Executes

Relay agent (Codex) runs, following Context Pack constraints:
- Edits only allowed files
- Achieves acceptance criteria
- References key decisions + blockers
- Generates session report

### Step 6: Analyze Relay Result

1. Get relay agent's session report
2. Analyze diffs (did relay complete the task?)
3. Decide: are we done, or do we need another relay?
4. Decide: should original agent (Claude Code) come back for review/integration?

### Step 7: Optional — Bring Original Agent Back

If relay work needs final integration:

1. Generate new Context Pack with relay agent's results
2. Create integration prompt for original agent
3. Handoff to original agent (now with fresh context window)
4. Original agent reviews + integrates
5. Mark task complete

**When to do this:**
- Relay agent completed tests, but original agent should review
- Tests revealed issues; original architecture needs refinement
- Integration between two modules needs careful coordination

---

## Preventing Redundant Context Reset

**Don't reset context if:**
- Task is almost complete (estimate <15 min more work)
- No clear handoff point exists
- Both current agent and relay agent would need similar context
- User wants to stay with current agent

**Do reset context if:**
- Remaining work is substantial (>30 min)
- Relay agent specialization is clearly better
- Current agent explicitly requests reset
- Token usage makes further work inefficient

---

## Context Pack Metadata (for Next Agent)

Include clear metadata so relay agent can quickly understand scope:

```markdown
## Quick Reference (for relay agent)

**Do this first:**
1. Read the "Goal" section
2. Read "Current State"
3. Read "Remaining Work"

**Key files to inspect (read-only):**
- [file1.ts] — Why: [reason]
- [file2.tsx] — Why: [reason]

**Key files to edit (allowed):**
- [file3.ts]
- [file4.tsx]

**Key files to AVOID (blocked):**
- [file5.ts] — Why: [reason]

**If you get stuck on X:**
- Try Y (previous agent tried this)
- Or escalate to user with [specific question]

**When to call it done:**
All items in "Acceptance Criteria" are checked.
```

---

## Related Documents
- [[AGENT_SCHEDULING_POLICY.md]] — Execution modes and token relay mode details
- [[AGENT_RUN_POLICY.md]] — How agents are executed and monitored
- [[AGENTS.md]] — Agent roles and specializations
- [[AGENT_STATE.md]] — Current agent status and availability
- [[PROMPT_TEMPLATES.md]] — Relay prompt template

---

## Last Updated
2026-05-21 — Initial protocol definition
