# T018_AGENT_EXECUTION_RUNNER_SPIKE.md — Agent Execution Runner Design

## Task: T018 — Agent Execution Runner
Recommended agent: Claude Code  
Priority: P2 (Phase 3 — after T016 and T017 are done)
Status: Implemented

> Previously researched as "CLI Runner Research (T016)" — now renamed and repositioned as T018 after architecture alignment.

---

## What This Is

T018 is **not just a run button**. It is the execution adapter layer that:
1. Takes a `PlanTask` with a generated prompt and assigned agent.
2. Creates a dedicated git branch for safe execution.
3. Invokes the agent via CLI.
4. Streams real-time logs to the UI.
5. Captures the exit code.
6. Hands off to T019 (Diff & Outcome Analyzer) on completion.

---

## CLI Invocation Research

### Claude Code
- **Available modes**: Interactive REPL or prompt-mode via flag.
- **Non-interactive invocation**: `claude -p "prompt text"` or `cat prompt.txt | claude`
- **Verification**: ✅ Confirmed. Claude Code 2.1.145 supports `-p/--print` flag.
  - Command: `claude --help` shows `-p, --print: Print response and exit (useful for pipes)`
  - Works in non-interactive mode: stdout streams, stderr captured
  - Workspace trust dialog skipped when using `-p` flag
- **Output**: Streams to stdout. Errors go to stderr.

### Codex
- **Non-interactive invocation**: N/A (not installed in current environment)
- **Status**: `codex` command not found. CLI runner will only support `claude-code` for MVP.
- **Fallback**: For Codex support, user must copy prompt to Codex UI manually (Antigravity-style).

### Antigravity
- **Status**: No confirmed CLI interface. Runs via IDE/UI integration.
- **MVP approach**: Generate a copy-ready prompt with a clear "Run in Antigravity" instruction. No automatic invocation.

---

## Node.js Execution Wrapper

```typescript
// lib/runner/spawn-runner.ts
import { spawn } from "child_process";

export async function spawnAgent(options: {
  agent: "claude-code" | "codex";
  prompt: string;
  cwd: string;
  onLog: (line: string) => void;
  onComplete: (exitCode: number) => void;
}) {
  const [cmd, ...args] = buildCommand(options.agent, options.prompt);
  const child = spawn(cmd, args, { cwd: options.cwd, shell: true });

  child.stdout.on("data", (data) => options.onLog(data.toString()));
  child.stderr.on("data", (data) => options.onLog(`[stderr] ${data.toString()}`));
  child.on("close", options.onComplete);
}

function buildCommand(agent: string, prompt: string): string[] {
  if (agent === "claude-code") return ["claude", "-p", prompt];
  if (agent === "codex") return ["codex", "run", "--prompt", prompt];
  throw new Error(`Unsupported agent for CLI: ${agent}`);
}
```

---

## Log Streaming Architecture (SSE)

```typescript
// app/api/runner/route.ts
export async function POST(request: Request) {
  const { planTaskId, prompt, cwd } = await request.json();

  const stream = new ReadableStream({
    start(controller) {
      const encode = (text: string) =>
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ log: text })}\n\n`));

      spawnAgent({
        agent: "claude-code",
        prompt,
        cwd,
        onLog: encode,
        onComplete: (code) => {
          encode(`[DONE] Exit code: ${code}`);
          controller.close();
        },
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
    },
  });
}
```

---

## Git Safety Mechanism

**Execution pre-flight sequence:**

```text
1. Run: git status --porcelain
   → If uncommitted changes exist: warn user and offer to stash.

2. Generate branch name:
   acr/{taskId}-{YYYYMMDD}-{HHMM}

3. Run: git checkout -b acr/t018-runner-20260520-1800

4. Spawn agent with the generated prompt and cwd = project path.

5. On completion:
   → Capture: git diff --name-only and git diff
   → Hand off to T019 (Diff & Outcome Analyzer)

6. User reviews diff and chooses: merge / discard / continue
```

---

## Phase-by-Phase Implementation

| Step | What | Priority |
|---|---|---|
| T018-A | Confirm Claude Code / Codex CLI flags with a real test | Done |
| T018-B | Git pre-flight + branch creation utility | Done |
| T018-C | `child_process.spawn` runner module | Done |
| T018-D | SSE API route (`/api/runner`) | Done |
| T018-E | `RunnerLogView` UI component | Done |
| T018-F | Task status update on completion | Done |

---

## Acceptance Criteria

- User can click "Execute" on a `PlanTask` with status `ready`.
- A new git branch is automatically created before execution.
- If uncommitted changes exist, the user is warned.
- Log lines stream to the UI in real time.
- On completion, `PlanTask` status updates to `running → done` or `running → failed`.
- Exit code is stored in `ExecutionLog`.
- T019 is the next follow-up after completion.

## Implementation Status

Implemented files:
- `lib/runner/git-utils.ts`
- `lib/runner/spawn-runner.ts`
- `app/api/runner/route.ts`
- `lib/storage/execution-log-store.ts`
- `components/runner/RunnerLogView.tsx`
- `data/execution-logs.json`

Notes:
- The runner currently supports Claude Code CLI execution. Codex and Antigravity remain manual prompt handoff paths.
- Non-zero exits update the plan task to `blocked`, matching the current `PlanTaskStatus` model.
- T019 is the next task for automatic diff capture, completion judgment, session report draft generation, and next-prompt generation.
- `RunnerLogView` is implemented but should be wired directly into the `/plan` task card flow in the next polish pass.
