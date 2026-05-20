# OPEN_SOURCE_ANALYSIS.md — Agent Control Room

## Current Candidate

### Vibe Kanban

Source:

```txt
external/vibe-kanban
https://github.com/BloopAI/vibe-kanban
```

Status:

```txt
Downloaded
Dependencies installed
Initial structure reviewed
Local dev server verified
```

Important note:

```txt
The upstream README says "Vibe Kanban is sunsetting." This does not immediately block local use, but it means Agent Control Room should treat Vibe Kanban as a strong local base/reference rather than assume long-term hosted product stability.
```

## Stack

```txt
Backend: Rust workspace
Frontend: React + TypeScript + Vite
Package manager: pnpm
Local app packages: packages/local-web, packages/web-core, packages/ui
Backend crates: crates/server, crates/db, crates/executors, crates/workspace-manager, crates/worktree-manager
CLI/MCP: npx-cli, crates/mcp
```

## Strong Fit Areas

```txt
Kanban issue board
Workspace creation
Git worktree based task isolation
Agent session execution
Multiple agent support including Claude Code and Codex
Diff/review workflow
Local MCP server for external clients
Issue to workspace flow
Session model for token/context resets
```

## Agent Control Room Fit

Vibe Kanban already provides the lower execution layer that the new PRD wants to avoid rebuilding:

```txt
issues = task cards
issue description = executable agent prompt
workspace = isolated execution environment
session = individual agent conversation/context window
MCP server = likely integration surface
```

Agent Control Room should focus on the layer above it:

```txt
product direction input
technical translation
task decomposition
agent routing
copy-ready prompt generation
handoff generation
session report interpretation
token/cooling_down decision support
```

## First Integration Candidates

### Option A: MCP-first integration

Use Vibe Kanban's local MCP server to create issues and start workspaces.

Relevant tools found in docs:

```txt
create_issue
list_issues
get_issue
start_workspace
create_session
run_session_prompt
get_execution
```

Why this is promising:

```txt
Does not require forking Vibe Kanban immediately
Keeps Agent Control Room as a separate orchestration layer
Matches the PRD goal of using open source base functionality
Allows generated tasks/prompts to become Vibe Kanban issues
```

### Option B: API/local route integration

Use Vibe Kanban local API routes directly.

Relevant backend routes found:

```txt
/api/workspaces
/api/workspaces/start
/api/remote/issues
```

Risk:

```txt
Some issue APIs appear routed through Vibe Kanban remote/cloud client paths. MCP may be safer than depending on internal route details.
```

### Option C: Fork/custom UI integration

Modify Vibe Kanban UI directly.

Risk:

```txt
Higher maintenance cost
Larger codebase surface
Rust + React monorepo complexity
Upstream sunsetting increases ownership burden
```

## Recommended Initial Direction

```txt
1. Keep Vibe Kanban source in external/vibe-kanban.
2. Do not fork UI immediately.
3. Build Agent Control Room as a companion orchestrator first.
4. Generate Vibe Kanban-ready issue descriptions from current prompt generator.
5. Use MCP or local API as the first bridge after dev server is verified.
6. Only modify Vibe Kanban source if MCP/API cannot support the needed flow.
```

## Local Verification

```txt
Frontend: http://localhost:3002/
Backend health: http://localhost:3003/api/health
Preview proxy: http://localhost:3004/
```

Verification results:

```txt
Frontend returned HTTP 200.
Backend health returned {"success":true,"data":"OK","error_data":null,"message":null}.
```
