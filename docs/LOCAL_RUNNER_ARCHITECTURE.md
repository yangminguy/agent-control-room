# LOCAL_RUNNER_ARCHITECTURE.md — Local Terminal & IDE Automation

## Overview

Agent Control Room is a **local AI development control tower**.

It does NOT call external paid AI APIs by default.

Instead, it automates the user's **already-authenticated local tools**:
- Claude Code CLI (terminal-based execution)
- Codex (local app or manual handoff)
- Antigravity IDE (visual QA or IDE automation)
- Hermes (optional background summaries)
- Vibe Kanban (execution workbench surface)

## Problem We Solve

Today, the user manually:
1. Writes a prompt in Agent Control Room
2. Copies the prompt into Claude Code / Codex / Antigravity
3. Runs the agent locally
4. Copies the result back into Agent Control Room
5. Analyzes the diff manually
6. Moves to the next task

**Agent Control Room's Local Runner Bridge automates steps 2, 3, 4, and partly 5.**

## Local Runner Bridge

The **Local Runner Bridge** is the integration layer between Agent Control Room and already-authenticated local tools.

```text
Agent Control Room
    ↓
    approval gate + context binding
    ↓
Local Runner Bridge
    ↓
    adapter routing
    ↓
┌───────────────────────────────────┐
│ Claude Code Adapter               │ ← runs claude -p "..." locally
├───────────────────────────────────┤
│ Codex Adapter                     │ ← manual handoff or CLI if available
├───────────────────────────────────┤
│ Antigravity Adapter               │ ← manual handoff or IDE automation
├───────────────────────────────────┤
│ Vibe Kanban Bridge                │ ← issue export + result import
├───────────────────────────────────┤
│ Hermes Background Worker          │ ← status summaries, context packs
└───────────────────────────────────┘
    ↓
    local project execution
    ↓
    logs + stdout/stderr capture
    ↓
    return to Agent Control Room
```

### Execution Path for Claude Code (MVP)

```text
1. User completes approval checklist in /workbench
2. /workbench requests approval token from /api/workbench/approval
3. Token is server-issued, context-bound, 5-min TTL, one-time use
4. RunnerLogView renders with token
5. User clicks "승인 후 에이전트 실행"
6. fetch("/api/runner", { approvalToken, planId, taskId, agent, cwd, prompt })
7. /api/runner validates token, cwd, agent allowlist
8. /api/runner spawns: child_process.spawn("claude", ["-p", prompt], { cwd })
9. stdout/stderr stream back to UI as SSE
10. Exit code captured
11. Git diff analyzed automatically
12. Task status updated
13. Next prompt suggested
```

**No external paid API is called in this flow.**

### Execution Path for Codex (Future)

For now, Codex is a manual handoff.

Eventually:
```text
1. Agent Control Room generates copy-ready prompt
2. User copies prompt to Codex manually
3. User runs Codex locally
4. User copies result back
5. Agent Control Room imports result and analyzes

OR (if CLI verified):
1-5. Same as Claude Code, but spawn: child_process.spawn("codex", [...])
```

### Execution Path for Antigravity (Future)

Antigravity is a visual IDE tool for UI-heavy tasks.

For now:
```text
1. Agent Control Room generates copy-ready prompt
2. User opens Antigravity
3. User manually opens the prepared handoff packet
4. Antigravity generates screen prototypes or code
5. User exports or imports result back to Agent Control Room
```

If IDE automation is safe and verified, future versions may:
- Open Antigravity workspace links directly
- Embed Antigravity preview UI in Agent Control Room
- Capture Antigravity result exports programmatically

### Execution Path for Hermes (Optional)

Hermes is a background worker for monitoring and memory.

```text
1. After each execution, optionally invoke Hermes to summarize
2. Generate Obsidian-compatible insight notes
3. Create Context Pack for token/context reset
4. Monitor retry candidates and blockers
5. Do NOT use Hermes for primary code changes
```

## Agent Adapter Model

Each adapter defines how Agent Control Room bridges to a local tool.

### Claude Code Adapter

**Status in MVP**: ✅ Fully automated

| Property | Value |
|---|---|
| **Tool** | Claude Code CLI (terminal) |
| **Executable** | ✅ Yes, via `child_process.spawn` |
| **Endpoint** | `/api/runner` (internal local runner) |
| **Approval Required** | ✅ Yes (workbench gate + token) |
| **Authentication** | User's existing Claude Code session |
| **Output Handling** | SSE stream to UI |
| **Diff Capture** | ✅ Auto git diff analysis |
| **Default for** | Architecture, reasoning, document review |

**Files**:
- `lib/runner/spawn-runner.ts` — Claude CLI spawn logic
- `app/api/runner/route.ts` — Internal local runner endpoint
- `components/runner/RunnerLogView.tsx` — Log streaming UI
- `components/workbench/ExecutionReadinessGate.tsx` — Approval gate

### Codex Adapter

**Status in MVP**: 📋 Manual handoff only

| Property | Value |
|---|---|
| **Tool** | Codex (local app) |
| **Executable** | ❓ CLI unknown / not verified |
| **Endpoint** | Manual copy-paste for now |
| **Approval Required** | ✅ Yes (workbench gate) |
| **Authentication** | User's existing Codex session |
| **Output Handling** | Manual result import |
| **Diff Capture** | Manual or import-based |
| **Default for** | Bounded implementation, tests, type errors |

**Future work**:
- Verify if Codex has a stable CLI
- If yes, implement `codex` spawn adapter similar to Claude Code
- If no, keep manual handoff mode with copy-ready prompt

### Antigravity Adapter

**Status in MVP**: 📋 Manual handoff only

| Property | Value |
|---|---|
| **Tool** | Antigravity IDE |
| **Executable** | ❓ IDE automation not verified |
| **Endpoint** | Manual handoff or IDE automation (future) |
| **Approval Required** | ✅ Yes (workbench gate) |
| **Authentication** | User's existing Antigravity IDE session |
| **Output Handling** | Manual export or IDE result capture (future) |
| **Diff Capture** | Manual or event-based (future) |
| **Default for** | UI prototype, visual iteration, screen-level changes |

**Future work**:
- Research Antigravity IDE plugin/automation API
- Design safe IDE automation boundary
- If safe, implement Antigravity workspace open links
- If safe, implement Antigravity result export capture

**Safety Rule**: Do not directly automate Antigravity IDE UI without explicit design and user approval.

### Hermes Adapter

**Status in MVP**: 🔄 Optional background worker

| Property | Value |
|---|---|
| **Tool** | Hermes (background monitoring/summaries) |
| **Executable** | ✅ Summary generation only |
| **Endpoint** | Not applicable (no execution) |
| **Approval Required** | ✅ Yes (view/approve before sending) |
| **Output Handling** | Markdown exports (Obsidian notes, Context Packs) |
| **Default for** | Long-running monitoring, recurring summaries, memory notes |
| **Primary Coding** | ❌ NO (background worker only) |

**Responsibilities**:
- Session summaries and analysis
- Context Pack generation for token/context reset
- Obsidian-compatible insight memory export
- Retry candidate monitoring
- Blocker tracking and recommendations

**What Hermes Does NOT Do**:
- Execute code changes
- Deploy or push to main
- Auto-merge
- Run DB migrations
- Make decisions without user approval

## Safety Boundary: Local Execution Only

### What Is Allowed

✅ Local terminal command execution (Claude Code, Codex via CLI)
✅ Local git branch creation and management
✅ Local diff capture and analysis
✅ Manual result import and session reporting
✅ Local file inspection and metadata capture
✅ Structured prompt generation and copy-paste
✅ Optional background summaries (Hermes)
✅ Vibe Kanban workbench integration (issue export / result import)

### What Is NOT Allowed (MVP)

❌ External paid model API calls (OpenAI, Anthropic, etc.)
❌ Automatic deployment or git push
❌ Automatic merge or PR creation
❌ Database migration execution
❌ Slack alerts or external service calls
❌ Multi-user collaboration or permissions
❌ Uncontrolled autonomous execution without approval
❌ Direct Antigravity IDE UI automation (pending design)
❌ Codex CLI automation (pending verification)

## Internal Endpoint: `/api/runner`

`/api/runner` is **NOT a paid AI API endpoint**.

It is an **internal local runner endpoint** that:
- Receives approved execution packets from `/workbench`
- Validates the server-issued approval token
- Validates the project path safety
- Spawns a local terminal command (e.g. `claude -p "..."`)
- Captures stdout/stderr as SSE stream
- Returns logs to the UI in real time
- Does NOT call external paid APIs by default

### `/api/runner` Safety Rules

1. **Approval Token Required** ✅
   - Server-issued tokens only
   - Client cannot forge tokens
   - Tokens are context-bound (planId, taskId, agent, cwd)
   - Tokens expire after 5 minutes
   - Tokens are one-time use

2. **Path Validation** ✅
   - CWD must be within project root
   - No path traversal allowed
   - No symlink escapes

3. **Agent Allowlist** ✅
   - Only `claude-code` in MVP
   - Explicit allow-list enforcement
   - New agents require separate security review

4. **Uncommitted Changes Block** ✅
   - Must commit or stash changes first
   - Prevents confusion about what changed

5. **Branch Creation** ✅
   - Safe git branch created before execution
   - Named from taskId and timestamp
   - Isolated from main development

6. **Validation Commands Required** ✅
   - After execution: `npm run typecheck && npm run lint && npm run test && npm run build`
   - Prevents silent regressions
   - User must review and approve results

## What Is Still Manual

| Work | Status | How |
|---|---|---|
| Prompt generation | 🤖 Auto | `/prompt-compiler` generates copy-ready prompts |
| Handoff creation | 🤖 Auto | Structured handoff packets generated |
| Diff analysis | 🤖 Auto | `/api/analyzer` inspects git diff |
| Task decomposition | 🤖 Auto | Orchestrator breaks down features |
| Agent routing | 🤖 Auto | Router recommends best agent |
| Session reports | 🤖 Partial | Auto diff analysis + manual result review |
| Codex execution | 📋 Manual | Copy prompt to Codex, run, copy result back |
| Antigravity execution | 📋 Manual | Copy prompt to Antigravity, create screens, copy result back |
| Vibe Kanban export | 🤖 Auto | Auto send prepared tasks as issues |
| Vibe Kanban import | 📋 Manual | User manually imports result from Vibe Kanban |
| Approval gate | 👤 User | User must check boxes and approve execution |
| Deployment | 👤 User | User manually deploys after approval |
| Git push/merge | 👤 User | User decides when to push and merge |

## What Can Be Automated First

Priority order for future work:

1. **Claude Code Local Runner** ✅ DONE
   - Terminal spawn, log capture, diff analysis

2. **Codex Adapter** (if CLI available)
   - Verify Codex has a stable CLI
   - If yes, implement spawn adapter like Claude Code

3. **Vibe Kanban Result Import**
   - Capture issue/workspace completion status
   - Import diff/outcome back to Agent Control Room

4. **Antigravity IDE Research**
   - Investigate IDE plugin/automation API
   - Design safe boundaries for IDE automation

5. **Obsidian Memory Export**
   - Generate Markdown notes for Obsidian
   - Preserve decisions, patterns, handoff context

6. **Context Pack Workflow**
   - Auto generate reset/handoff packets for token/context limits
   - Preserve session state for new agent/session

## Remaining Risks

- **Codex CLI Unknown**: We don't know if Codex has a stable executable CLI. Requires investigation.
- **Antigravity IDE Automation Unknown**: Safe IDE automation boundaries need design and approval before implementation.
- **Vibe Kanban Result Import**: Currently one-way (issue export only). Bidirectional sync is Phase 10 work.
- **Token Store In-Memory**: MVP uses in-memory token storage. For production, should migrate to Redis/Postgres.
- **No Multi-User Auth**: Current MVP assumes single user. No authentication system.
- **Hermes Not Installed**: Hermes background worker is planned but not yet integrated.

## Recommended Next Step

Verify this Local Runner Architecture by:
1. ✅ Reading this document
2. ✅ Confirming all docs are updated consistently
3. ✅ Running validation: `npm run typecheck && npm run lint && npm run test && npm run build`
4. ✅ Confirming `/api/runner` is clearly marked as internal local runner
5. ✅ Confirming `/workbench` safety copy reflects local execution

Then proceed with Phase L2: Codex Adapter Investigation (verify CLI availability and design execution path).
