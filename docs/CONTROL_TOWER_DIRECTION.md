# CONTROL_TOWER_DIRECTION.md — Agent Control Room

## Current Direction

Agent Control Room is an **AI Development Control Tower for non-developer PMs**.

The user should be able to give an idea or product direction, including from mobile, and rely on Agent Control Room to turn it into a visible development roadmap, implementation tasks, agent assignments, senior-developer-quality prompts, execution tracking, completion checks, handoffs, and reusable development memory.

Prompt and handoff generation remain important submodules, but they are not the whole product definition.

## Product Loop

```text
Idea or product direction
→ Senior developer translation
→ Product roadmap generation
→ Visual Development Roadmap Control Panel
→ Task decomposition
→ Agent routing
→ Senior Dev Prompt Compiler
→ Human approval
→ Agent execution or Vibe Kanban workbench handoff
→ Result/diff analysis
→ Roadmap status update
→ Obsidian-compatible insight memory
→ Next task, handoff, or Context Pack
```

The user should only be interrupted when product direction, approval, credentials, deployment, or risk acceptance is genuinely needed.

## `/plan` Direction

`/plan` should be a **Visual Development Roadmap Control Panel**, not only a kanban board.

It should show:
- full product development roadmap
- roadmap stages
- `completed`, `active`, `waiting`, `blocked`, and `user_input_required` states
- clear check marks for completed stages
- responsible agent per stage
- current task
- next action
- blocked reason
- user decision points
- acceptance criteria

Internal kanban-style elements may remain when useful, but the first impression should be "where are we in the product journey?" rather than "which column is this task in?"

## Senior Dev Prompt Compiler

The Senior Dev Prompt Compiler converts weak or broad non-developer requests into precise implementation prompts.

Each generated prompt should include:
- goal
- product context
- current implementation context
- scope
- non-goals
- files to inspect first
- files allowed to edit
- data model changes
- UI requirements
- do-not-do rules
- acceptance criteria
- test/check instructions
- handoff instructions

## Agent Availability Manager

Supported statuses:
- `available`
- `cooling_down`
- `token_limited`
- `blocked`
- `context_overloaded`
- `manual_only`
- `experimental`

Rules:
- If the preferred agent is `available`, recommend it.
- If it is `token_limited`, generate a handoff to another viable agent.
- If it is `context_overloaded`, generate a Context Pack.
- If it is `blocked`, ask the user only for the missing decision or action.
- If it is `manual_only` or `experimental`, keep execution copy-ready and require explicit approval.

## Context Reset Protocol

Do not depend on literal `/clear` automation. Use a documented reset workflow.

Context reset should:
1. summarize the current goal
2. summarize completed work
3. summarize changed files
4. preserve important decisions
5. list remaining work
6. identify blockers
7. generate a Context Pack
8. create the next session prompt
9. continue in a new session or another agent after approval

See [[CONTEXT_TOKEN_RESUME_PROTOCOL.md]] for full protocol.

## Agent Scheduling Policy

Agent Control Room does **not** run all agents simultaneously by default.

Use these execution modes:
- **Single Agent Mode**: One agent handles the full task (high-risk, tightly-coupled files)
- **Sequential Multi-Agent Mode**: Agents work in order (implementation → QA → integration)
- **Parallel Safe Mode**: Agents work in parallel with no file conflicts (separate routes/components)
- **Token Relay Mode**: Current agent hits token limit; handoff to another agent continues

**Key principle**: Multiple agents are used for task specialization and token distribution, not blind parallelization.

See [[AGENT_SCHEDULING_POLICY.md]] for detailed decision tree and file conflict rules.

## Agent Run Policy

Agents are executed on these surfaces:
- **Claude Code CLI** — local terminal for focused, low-context tasks
- **Vibe Kanban Workbench** — collaborative workspace for long-running work with diffs/previews
- **Manual/User** — user runs agent directly (Claude.ai, IDE extension, etc.)

See [[AGENT_RUN_POLICY.md]] for execution surfaces, approval gates, and error handling.

Context Pack format:

```md
# Context Pack

## Project Goal

## Current Product Direction

## Completed Work

## Changed Files

## Important Decisions

## Current Blockers

## Next Task

## Acceptance Criteria

## Do Not Do

## Prompt for Next Session
```

## Obsidian Knowledge Memory

Agent Control Room should be able to export durable development memory as Obsidian-compatible Markdown.

Store:
- development insights
- technical decisions
- failed attempts
- successful prompt patterns
- agent performance notes
- handoffs
- reusable checklists
- project-specific lessons

Suggested vault structure:

```text
Agent Control Room/
  Projects/
  Insights/
  Decisions/
  Handoffs/
  Prompt Patterns/
  Agent Performance/
  Checklists/
```

## Hermes Positioning

Hermes may be introduced as an optional background worker. It is not the main coding brain.

Hermes is suitable for:
- long-running monitoring
- memory-backed task tracking
- recurring project summaries
- Obsidian note generation
- development log summarization
- retry candidate discovery

Hermes should not perform high-risk autonomous code changes, DB migrations, deployment, auto-merge, or security-sensitive edits without explicit user approval.

## Vibe Kanban Boundary

Agent Control Room is the orchestration brain / control tower.

Vibe Kanban is the execution workbench.

Agent Control Room owns:
- product intent
- requirement translation
- roadmap generation
- task decomposition
- agent routing
- prompt compilation
- approval gates
- result interpretation
- insight memory
- handoff context

Vibe Kanban owns or inspires:
- issue cards
- workspaces
- git worktrees
- Claude/Codex sessions
- diffs/reviews
- previews

Do not clone Vibe Kanban's full board/session/diff UI inside Agent Control Room.

## Non-Negotiables

- Human approval remains required before risky execution.
- Do not add auto-merge.
- Do not add uncontrolled deployment automation.
- Do not add unsafe autonomous DB migration.
- Do not remove existing implemented features.
- Do not mark planned features as implemented.
