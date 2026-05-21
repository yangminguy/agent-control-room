# AGENT_EXECUTION_SUMMARY.md — Agent Control Room

## Status: ✅ Agent Scheduling Policy Complete

Agent Control Room now defines a clear, strategic approach to multi-agent execution.

---

## What Changed

Agent Control Room previously had no documented strategy for when/how to run multiple agents.

**Result:** The system could appear to run "all agents all the time," which is inefficient and risky.

Now, we have:

1. **Four execution modes** with clear decision criteria
2. **File conflict rules** to prevent simultaneous edits
3. **Token relay protocol** for context exhaustion
4. **Approval gates** for risky operations
5. **Clear role boundaries** for each agent

---

## Core Documents

### 1. AGENT_SCHEDULING_POLICY.md
**Answer: When do we run agents, and how many?**

- Single Agent Mode: High-risk, tightly-coupled work
- Sequential Multi-Agent Mode: Implementation → QA → Integration
- Parallel Safe Mode: Completely separate files (e.g., API + UI)
- Token Relay Mode: Current agent hits token limit; handoff to another agent

Includes:
- Decision tree for mode selection
- File conflict matrix (which agents can edit which files together)
- Risk classification (LOW/MEDIUM/HIGH/CRITICAL)
- Agent role boundaries

### 2. AGENT_RUN_POLICY.md
**Answer: How are agents executed, and what approval is needed?**

- Claude Code CLI: Local terminal for focused, low-context tasks
- Vibe Kanban Workbench: Collaborative workspace for long-running work
- Manual/User: User runs agent directly in their preferred tool

Includes:
- Standard execution flow (approval → handoff → execution → analysis)
- Token relay flow (detecting limit → Context Pack → relay handoff)
- Parallel execution flow (coordinate multiple agents)
- Session report format
- Error & blocker handling
- Safety rules (do's and don'ts)

### 3. CONTEXT_TOKEN_RESUME_PROTOCOL.md
**Answer: What happens when context/tokens run out?**

Workflow:
1. Agent signals token_limited or context_overloaded
2. Orchestrator generates Context Pack (comprehensive handoff document)
3. User reviews and approves relay
4. Handoff to relay agent with Context Pack + relay prompt
5. Relay agent executes with fresh context
6. Optionally bring original agent back for final integration

Includes:
- Context Pack structure and example
- Context Pack generation workflow
- Preventing redundant resets
- Metadata for relay agent

---

## Key Changes to Existing Docs

### AGENTS.md
Added "Multi-Agent Execution Strategy" section:
- Links to three new execution policy docs
- Execution mode decision matrix
- File conflict principles

### AGENT_STATE.md
Added fields:
- `agent_execution_policy` — how agents are scheduled
- `key_constraints` — Hermes, file conflicts, approval gates

### CONTROL_TOWER_DIRECTION.md
Added sections:
- Agent Scheduling Policy (four modes)
- Agent Run Policy (execution surfaces)

### PROMPT_TEMPLATES.md
Added templates:
- Token Relay Prompt (for relay agent)
- Parallel Execution Prompt Preamble (coordination rules)

### ROADMAP.md
Updated Strategic Direction:
- Link to three new execution policy docs
- Emphasis: "Multiple agents for specialization + token distribution, not blind parallelization"

### docs/README.md
Added "Agent Execution & Scheduling" section:
- Lists three new active docs
- Marked as **NEW**

---

## Validation Checklist

- [x] "항상 모든 에이전트를 돌린다"는 표현이 사라졌는가?
  - ✅ AGENT_SCHEDULING_POLICY.md: "Agent Control Room does **not** run all agents simultaneously"

- [x] Single / Sequential / Parallel Safe / Token Relay 모드가 생겼는가?
  - ✅ All four modes clearly defined in AGENT_SCHEDULING_POLICY.md
  - ✅ Decision tree provided
  - ✅ Examples for each mode

- [x] 파일 충돌 판단 기준이 명확한가?
  - ✅ File Conflict Matrix in AGENT_SCHEDULING_POLICY.md
  - ✅ "High conflict risk" vs "Low conflict risk" defined
  - ✅ Forbidden parallel combinations listed

- [x] 토큰 부족 시 다른 에이전트로 넘기는 방식이 정의됐는가?
  - ✅ CONTEXT_TOKEN_RESUME_PROTOCOL.md: Complete token relay flow
  - ✅ Context Pack generation + relay prompt template
  - ✅ Handoff metadata included
  - ✅ Optional original-agent-review phase included

- [x] Hermes가 실행자가 아니라 감시자/기록자로 정의됐는가?
  - ✅ AGENT_SCHEDULING_POLICY.md: "Hermes" section
  - ✅ "Specialization: Monitoring, summarization, context packs, memory extraction"
  - ✅ "Don't use for: Primary coding"
  - ✅ CONTEXT_TOKEN_RESUME_PROTOCOL.md: Hermes only in read-only monitor mode

- [x] 고위험 작업은 여전히 승인 게이트가 있는가?
  - ✅ AGENT_RUN_POLICY.md: "Approval Gate Policy" section
  - ✅ HIGH/CRITICAL risk requires explicit approval
  - ✅ File allowlist/blocklist shown to user
  - ✅ "Do not" rules prevent autonomous execution

- [x] 비개발자인 사용자가 봐도 왜 이 에이전트를 쓰는지 이해되는가?
  - ✅ Every section has clear, non-technical explanations
  - ✅ Tables with "Reason" columns
  - ✅ Examples use recognizable scenarios
  - ✅ Context Pack template is simple and visual

---

## For Non-Developer Users

### In Plain English

**Agent Control Room does NOT automatically run all agents at once.**

Instead, the system is smart about choosing agents:

1. **If the task is risky** (database change, security code) → Only one agent handles it, and you approve first.
2. **If one agent finishes and the next agent needs to verify** → They work in order, one after the other.
3. **If two agents are working on completely separate things** (one on the API, one on the UI design) → They can work at the same time without interfering.
4. **If an agent runs out of context** (the session gets too long) → The system writes a summary (Context Pack), shows it to you, and hands off to a fresh agent who continues from where the first left off.

**Hermes is not an agent that writes code.** Hermes watches, summarizes, and keeps notes. The real coding agents are Claude Code, Codex, and Antigravity.

---

## Implementation Notes

These policies are **documentation only**. They define the decision rules and constraints.

The next implementation phase should:
1. Build the decision logic into the Orchestrator (which mode to use for a given task)
2. Add UI warnings for file conflicts
3. Add approval gates for HIGH/CRITICAL risk
4. Implement Context Pack generation (MVP: Markdown template)
5. Implement token relay flow (detect limit → show Context Pack → handoff)

See `docs/TASKS.md` for implementation roadmap.

---

## Related Documents

- [[AGENT_SCHEDULING_POLICY.md]] — Decision tree and execution modes
- [[AGENT_RUN_POLICY.md]] — How agents are executed and monitored
- [[CONTEXT_TOKEN_RESUME_PROTOCOL.md]] — Token limit handoff and Context Pack
- [[AGENTS.md]] — Agent roles and routing rules
- [[AGENT_STATE.md]] — Current agent status tracking
- [[CONTROL_TOWER_DIRECTION.md]] — Strategic direction
- [[PROMPT_TEMPLATES.md]] — Reusable prompt templates

---

## Last Updated
2026-05-21 — Complete definition of agent scheduling policy
