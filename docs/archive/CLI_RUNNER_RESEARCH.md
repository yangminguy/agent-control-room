# CLI Runner Research Spike (T016)

This document outlines the research and architectural design for executing external AI coding tools (Claude Code, Codex, Antigravity) programmatically via CLI within the Agent Control Room (Phase 3). 

Currently, all execution relies on the user copying generated prompts and manually pasting them into their terminal. The goal of the CLI Runner is to achieve **semi-automation**, allowing the user to initiate the execution from the UI and view the logs in real-time.

## 1. CLI Invocation Interfaces

To automate execution, we need to interact with the respective tools' Command Line Interfaces.

### 1.1 Claude Code
Claude Code (by Anthropic) can be invoked via `npx` or a globally installed `claude` binary.
- **Interactive Mode**: Running `claude` opens an interactive REPL.
- **Programmatic/Prompt Mode**: 
  - Using flags: `claude -p "Implement the ProjectStatusCard component..."`
  - Using stdin (piping): `cat prompt.txt | claude`
- **Output**: Claude Code streams stdout to the terminal. We will need to capture stdout/stderr to stream it to the UI.

### 1.2 Codex
"Codex" in this context refers to a standard AI execution runner (like an open-source alternative or a custom CLI wrapper).
- **Assumption**: It exposes a non-interactive run mode.
- **Usage**: `codex run --prompt "..."` or passing a file `codex run --file prompt.txt`
- **Output**: Standard stdout and stderr streams.

### 1.3 Antigravity
Antigravity may run via an MCP, an IDE plugin, or a CLI. If CLI is supported:
- **Usage**: `antigravity --task "..."`

## 2. Node.js Execution Wrapper

To trigger these CLIs from a Next.js App Router environment, we will use Node.js `child_process`.

### `spawn` vs `exec`
- We MUST use `child_process.spawn`. `exec` buffers output and waits until the process exits, which would cause timeouts and provide no real-time feedback.
- `spawn` provides streams (`stdout`, `stderr`) that can be pushed to the client immediately.

```typescript
import { spawn } from "child_process";

const child = spawn("npx", ["@anthropic-ai/claude-code", "-p", generatedPrompt], {
  cwd: projectPath, // Run inside the target project directory
  shell: true,
});

child.stdout.on("data", (data) => {
  // Push data to client
});

child.on("close", (code) => {
  // Finalize session report
});
```

## 3. Log Streaming Architecture

Next.js App Router provides two main ways to stream data to the frontend in real-time: Server-Sent Events (SSE) and WebSockets.

### Recommended: Server-Sent Events (SSE)
Since execution runs are unidirectional (Server -> Client logs), SSE is the most lightweight and native approach.
- **Backend (`app/api/runner/route.ts`)**: Return a `ReadableStream` that yields chunks as the CLI process outputs data.
- **Frontend (`components/RunnerLogView.tsx`)**: Use the standard `EventSource` API or read the response stream directly.

```typescript
// Next.js API Route example
const stream = new ReadableStream({
  start(controller) {
    child.stdout.on('data', (chunk) => {
      controller.enqueue(`data: ${chunk.toString()}\n\n`);
    });
    child.on('close', () => controller.close());
  }
});
return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } });
```

## 4. Pre-run Safety Mechanisms (Git Worktrees / Branches)

Before executing any AI runner, we must ensure the workspace is safe to mutate. AI agents can make destructive changes.

**Workflow:**
1. **Status Check**: Run `git status --porcelain`. If there are uncommitted changes, prompt the user to commit or stash.
2. **Branching**: Generate a unique branch name based on the task ID, e.g., `agent/T015-advisor-mode`.
3. **Checkout**: `git checkout -b agent/T015-advisor-mode`.
4. **Execute**: Spawn the CLI runner.
5. **Review**: The user reviews the changes (T017 Git Diff) before deciding to merge or discard.

## 5. Phased Implementation Plan

- **Step 1**: Implement the Git status and branch creation utilities.
- **Step 2**: Create a dummy SSE endpoint that streams fake logs to build the UI (`RunnerLogView`).
- **Step 3**: Connect the SSE endpoint to `child_process.spawn` using a safe, simple command (e.g., `ls` or `ping`) to verify stream stability.
- **Step 4**: Implement the actual `claude -p` invocation.
