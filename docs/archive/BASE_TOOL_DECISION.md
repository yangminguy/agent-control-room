# BASE_TOOL_DECISION.md — Agent Control Room

## Decision

Use **Vibe Kanban** as the first open-source base to evaluate and build against.

Decision status:

```txt
Provisional selection
```

## Why Vibe Kanban First

```txt
It has a web-based kanban board.
It supports Claude Code and Codex.
It models issues as task cards.
It creates isolated workspaces with git worktrees.
It has agent sessions, which map well to token/context management.
It exposes a local MCP server for external orchestration.
```

## Caveat

The upstream project currently says it is sunsetting.

This changes the strategy:

```txt
Use it as a local-first base/reference.
Avoid deep fork changes at the beginning.
Prefer MCP/API integration over editing its core UI.
Keep Agent Control Room's orchestration layer independent enough to switch bases later.
```

## Current Setup

```txt
Source path: external/vibe-kanban
Node: installed on machine
pnpm: used through npx pnpm@10.13.1
Rust: installed through rustup and repo nightly toolchain
Dependencies: installed with npx pnpm@10.13.1 install
```

## Next Decision Gate

Before committing to a fork/custom UI, finish the remaining bridge checks:

```txt
Done:
- Can Vibe Kanban run locally on this machine?
- Can Agent Control Room create a local Vibe Kanban issue draft from a generated task?
- Can a generated prompt become the issue draft description?

Remaining:
Can Agent Control Room create a real Vibe Kanban issue through MCP or local HTTP API?
Can Vibe Kanban start a Codex or Claude Code workspace from that issue?
Can execution results be read back enough to create a session report?
```
