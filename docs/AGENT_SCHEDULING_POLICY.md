# AGENT_SCHEDULING_POLICY.md — Agent Control Room

## Overview

Agent Control Room does **not** run all agents simultaneously by default.

The Orchestrator evaluates each task and chooses an execution mode based on risk, file conflict, token status, and completion criteria.

This document defines how to decide between:
1. **Single Agent Mode** — One agent handles the full task
2. **Sequential Multi-Agent Mode** — Agents work in order
3. **Parallel Safe Mode** — Agents work in parallel with no file conflicts
4. **Token Relay Mode** — Current agent hits token limit; handoff to another agent continues

---

## Core Principle

**Agents are tools for task specialization and token distribution, not parallelization by default.**

Multiple agents are used to:
- Distribute token/context load across multiple model instances
- Specialize work by agent capability (e.g., Codex for tests, Antigravity for UI)
- Keep critical path clear (e.g., QA in parallel with next implementation)

Multiple agents are **never** used to:
- Blindly parallelize all work
- Edit the same files simultaneously
- create ambiguity about who owns a piece of logic
- bypass approval gates or safety checks

---

## Decision Tree

### Step 1: Identify Task Type & Risk Level

| Task Type | Risk | Primary Agent | Notes |
|---|---|---|---|
| Architecture, design, integration | HIGH | Claude Code | Context-heavy, blocks other work |
| Implementation (feature/fix) | MEDIUM | Codex | Bounded scope, clear acceptance criteria |
| UI/visual iteration | MEDIUM | Antigravity | File conflict risk with layout/styling |
| Testing, QA, regression | LOW | Codex | Read-mostly, verification of existing work |
| Docs, templates, static data | LOW | — | Can be parallel; no execution risk |
| Monitoring, summary, memory | LOW | Hermes | Background only; no primary coding role |
| DB/auth/deployment/package | CRITICAL | Claude Code | Approval-gated, single owner |

### Step 2: Identify File Conflict Risk

**High conflict risk (files may overlap):**
- Same route or API endpoint
- Same React component or shared layout
- Same data model or type definition
- Same runner, approval, or security logic
- package.json, env config, deployment scripts

**Low conflict risk (files are separate):**
- Isolated UI components (not shared layouts)
- Test files (if implementation is complete)
- Docs or static templates
- Separate API routes (non-overlapping paths)
- Read-only verification tasks

### Step 3: Check Agent Availability Status

| Status | Action |
|---|---|
| `available` | Use the agent |
| `token_limited` | Generate Context Pack → Handoff to another agent |
| `context_overloaded` | Generate Context Pack → Pause or Relay |
| `cooling_down` | Wait or use fallback agent |
| `blocked` | Ask for missing decision only |
| `manual_only` | Generate prompt, require explicit approval |
| `experimental` | Require explicit approval + fallback plan |

---

## Execution Modes

### Single Agent Mode

Use when:
- Task has HIGH risk
- Files overlap significantly
- Execution requires one coherent vision
- Agent is primary for this work type
- Safety/approval gating is critical

**Examples:**
- Runner logic, approval token system
- DB migrations, auth changes
- Large refactoring with many dependencies
- Package/env/deployment changes
- Security-critical code

**Flow:**
1. Select primary agent
2. Generate prompt + Context Pack
3. Handoff to agent (Claude Code, Codex, or Antigravity)
4. Wait for completion
5. Analyze diff/result
6. Recommend next task

---

### Sequential Multi-Agent Mode

Use when:
- Implementation and verification should happen in order
- One agent builds, next agent verifies
- Handoff happens after clear completion point
- File overlap is possible but managed by stage

**Examples:**
- Claude Code implements → Codex tests → Claude Code fixes issues
- Claude Code adds API → Codex writes tests → Antigravity builds UI → Codex verifies
- Antigravity builds UI → Codex checks accessibility → Antigravity polishes

**Flow:**
1. Select primary agent (Claude Code or Codex)
2. Generate prompt with clear acceptance criteria
3. Handoff to primary agent
4. Wait for completion signal
5. Analyze result/diff
6. Generate Context Pack for next agent
7. Handoff Context Pack + next prompt to next agent
8. Wait for verification/completion
9. If issues found, repeat step 6-8 with previous agent
10. Mark task complete

**Handoff Points (when to transfer):**
- Feature branch is created and pushed
- Implementation is merged to main
- Tests are written and passing
- UI is visually complete
- Acceptance criteria are met

---

### Parallel Safe Mode

Use **only when** all conditions are met:
- Files are completely separate
- No shared dependencies or data models
- One task is read-only (verification, QA)
- One task is docs/templates (no execution)
- Hermes is only summarizing (no primary execution)
- Clear separation of concern between agents

**Examples:**
- Claude Code implements API → Antigravity builds UI components (separate routes/components)
- Claude Code updates architecture docs → Codex reviews and adds test notes (read/write split)
- Codex writes tests → Hermes monitors for failures (read-only monitor)

**Allowed Parallel Combinations:**
| Agent A | Agent B | Conditions |
|---|---|---|
| Claude Code | Antigravity | Separate routes/components, no shared hooks/state |
| Claude Code | Codex | Claude Code on implementation, Codex on isolated tests |
| Codex | Antigravity | Codex on tests, Antigravity on UI-only components |
| Any Agent | Hermes | Hermes is read-only monitor/summarizer only |
| Any Agent | Manual/User | User provides input/decision while agent works |

**Forbidden Parallel Combinations:**
- Two agents editing the same file
- Two agents modifying the same route/component
- Two agents changing the data model
- Two agents touching runner/approval/security logic
- Implementation + refactoring on same files
- Feature A + Feature B on same shared component

**Flow:**
1. Identify separate work streams
2. Generate separate prompts for each agent
3. Handoff to Agent A and Agent B in parallel
4. Monitor both for completion
5. Analyze results/diffs (order may matter for integration)
6. If one task unblocks the next, handoff result as context
7. Mark as complete when both agents finish

**Integration Point:**
If one agent's output becomes input for another:
- Move to Sequential mode after parallel work completes
- Generate Context Pack with Agent A's result
- Handoff to Agent B with merged context

---

### Token Relay Mode

Use when:
- Current agent hits token limit (`token_limited` status)
- Current agent's context is overloaded (`context_overloaded`)
- Remaining task is smaller and suited to another agent
- Continuation is more efficient than full restart

**Flow:**
1. Current agent requests or signals token limit/context overload
2. Generate Context Pack with:
   - Current goal
   - Completed work + changed files
   - Important decisions made
   - Blockers or decisions needed
   - Next sub-task
   - Acceptance criteria for next agent
   - Do-not-do rules
3. Select relay agent:
   - If current is Claude Code → relay to Codex (for tests/fixes) or Antigravity (for UI)
   - If current is Codex → relay to Antigravity (for UI) or ask user (for big decisions)
   - If current is Antigravity → relay to Codex (for tests) or Claude Code (for refactoring)
4. Generate next prompt from Context Pack
5. Handoff Context Pack + next prompt to relay agent
6. Relay agent continues with full context
7. After relay agent completes, consider bringing original agent back for final integration/review

**Context Pack Contents (required):**
- **Goal:** What are we building?
- **Completed:** What has this agent finished?
- **Changed Files:** Exact list of files modified
- **Key Decisions:** Why did we choose X over Y?
- **Blockers:** What's blocking progress?
- **Next Task:** Precise next step
- **Acceptance Criteria:** How to verify completion
- **Do-Not-Do:** What to avoid (e.g., "don't refactor auth")
- **File Allowlist:** Which files can the next agent edit?
- **File Blocklist:** Which files are off-limits?

---

## Risk Classification

Use risk level to inform execution mode choice:

### LOW RISK
- Docs, templates, static data
- Read-only verification, QA checks
- Isolated new components (no shared imports)
- Tests (if implementation is complete)
- Hermes background summaries

**Execution:** Can run in parallel or sequential. Approval not critical.

### MEDIUM RISK
- Clear feature implementation (well-scoped)
- Shared UI/component updates (not breaking changes)
- Data model enhancements (backwards-compatible)
- Isolated API endpoints
- Config changes (non-critical)

**Execution:** Sequential preferred. Codex should verify before merge. Approval gate recommended.

### HIGH RISK
- Large refactoring (affects many files)
- Auth/security logic changes
- DB migrations, schema changes
- Package version updates
- Deployment/CI-CD changes
- Runner or approval token logic
- Breaking API changes
- File deletions or major restructuring

**Execution:** Single agent only. Human approval required. Staged rollout/testing mandatory.

### CRITICAL RISK
- Autonomous execution without human approval
- DB migrations on production data
- Deployment to production
- Token/credential management
- Security hardening without review
- Any production data deletion or modification

**Execution:** BLOCKED. Manual user action required. Do not automate.

---

## Agent Role Boundaries

### Claude Code
**Specialization:** Architecture, integration, complex reasoning, document review

**Use for:**
- System design and planning
- Large refactoring with dependencies
- Integration between subsystems
- Context-heavy decision-making
- Reading and summarizing docs
- Analyzing existing code patterns

**Don't use for:**
- Single isolated bug fixes (use Codex)
- Visual UI tweaks (use Antigravity)
- Background monitoring (use Hermes)

---

### Codex
**Specialization:** Clear implementation, bug fixing, tests, type errors

**Use for:**
- Bounded feature implementation
- Writing and fixing tests
- Type system fixes
- Isolated bug patches
- QA and verification
- Regression checks

**Don't use for:**
- Architecture decisions (use Claude Code)
- Large refactoring (use Claude Code)
- Visual polish (use Antigravity)

---

### Antigravity
**Specialization:** UI prototype, visual iteration, responsive design, multi-file screen work

**Use for:**
- Building UI components
- Visual iteration and polish
- Responsive design fixes
- Cross-component styling consistency
- Screen-level feature work
- Design system implementation

**Don't use for:**
- Logic/business code (use Claude Code or Codex)
- Backend/data model (use Claude Code)
- Background tasks (use Hermes)

---

### Hermes
**Specialization:** Monitoring, summarization, context packs, memory extraction

**Use for:**
- Session summaries and reports
- Context Pack generation
- Handoff documentation
- Obsidian-compatible memory notes
- Repeated failure detection
- Progress tracking and status updates

**Don't use for:**
- Primary coding (use Claude Code, Codex, Antigravity)
- Execution decisions (use the primary agent)
- Approval gates (user only)

---

### Manual/User
**Specialization:** Product direction, risk acceptance, approval

**Use for:**
- Product direction and feedback
- Risk acceptance decisions
- High-risk approvals
- Credential/deployment choices
- Tiebreaker decisions
- Final product acceptance

---

## File Conflict Matrix

| File | Claude Code | Codex | Antigravity | Hermes | Notes |
|---|---|---|---|---|---|
| API route | ✅ (edit) | ✅ (edit) | ❌ | ❌ | Can work sequentially on different routes |
| React component | ✅ (edit) | ⚠️ (test) | ✅ (edit) | ❌ | Antigravity for styling, Codex for tests |
| Data model | ✅ (edit) | ⚠️ (test) | ❌ | ❌ | Single owner for model changes |
| runner logic | ✅ (edit) | ❌ | ❌ | ❌ | Claude Code only |
| approval token | ✅ (edit) | ❌ | ❌ | ❌ | Claude Code only |
| package.json | ✅ (edit) | ❌ | ❌ | ❌ | Claude Code only |
| Test file | ⚠️ (verify) | ✅ (write) | ❌ | ❌ | Codex writes, others review |
| Docs | ✅ (edit) | ⚠️ (add notes) | ❌ | ✅ (read) | Claude Code owns; others append |
| Static data | ✅ (edit) | ✅ (edit) | ✅ (edit) | ✅ (read) | Low conflict; coordinate if scripted |

---

## Decision Checklist

When planning multi-agent work:

- [ ] Is the task high-risk? → Single Agent Mode
- [ ] Do the agents edit the same files? → Sequential Mode
- [ ] Are the files completely separate? → Parallel Safe Mode possible
- [ ] Is one agent read-only? → Parallel Safe Mode possible
- [ ] Is the primary agent token-limited? → Token Relay Mode
- [ ] Are approval gates needed? → Include in handoff
- [ ] Has Hermes been assigned a coding role? → Remove it; use for monitoring only
- [ ] Are all agents available? → Check AGENT_STATE.md for status
- [ ] Have unclear acceptance criteria? → Clarify before handoff

---

## Implementation Notes

### For the Orchestrator
1. Read task description and risk level
2. Run File Conflict Matrix check
3. Check Agent Statuses from `lib/agents/agent-availability-manager.ts`
4. Select execution mode
5. Generate prompts/Context Packs per mode
6. Display execution plan to user for approval (for MEDIUM/HIGH risk)
7. Execute and monitor
8. Update agent status after completion

### For the User Interface
- Show which execution mode is planned (Single / Sequential / Parallel / Relay)
- Show which agents are involved
- Show file conflict warnings (if any)
- Show approval gates (if needed)
- Allow user to override mode choice

### For Prompts
- Always include execution mode in preamble
- For Sequential: include "Your work will be passed to [Next Agent] for [Next Task]"
- For Parallel: include "Working in parallel with [Other Agent] on [Other Task]; coordinate if files overlap"
- For Relay: include "If you hit token limit, handoff to [Relay Agent] with this Context Pack"

---

## Related Documents
- [[AGENT_STATE.md]] — Current agent availability status
- [[AGENT_RUN_POLICY.md]] — How to execute agents (local, remote, workbench)
- [[CONTEXT_TOKEN_RESUME_PROTOCOL.md]] — Token reset and handoff flow
- [[AGENTS.md]] — Agent roles and routing rules
- [[PROMPT_TEMPLATES.md]] — Prompt structure for each agent

---

## Last Updated
2026-05-21 — Initial policy definition
