# Execution Manager QA Plan

This plan protects Agent Control Room's Execution Manager from drifting into unsafe or unclear execution paths. It is written for Claude Code, Codex, Antigravity, and future manual QA sessions.

## Scope

The Execution Manager may prepare, gate, run, analyze, retry, hand off, and update roadmap state only through controlled execution surfaces. `/plan` remains the roadmap control panel. Prompt compiler and Hermes packet flows remain draft/copy-ready unless a separate approved task changes that boundary.

## Pages To Test

- `/plan`: roadmap overview, agent status, prompt review, handoff/readiness, result summary, and no loose execution controls.
- `/prompt-compiler`: safe prompt draft generation, risk display, allowed files, do-not-touch files, validation commands, approval warnings.
- `/hermes-packets`: packet draft generation only, clear Hermes non-execution copy, Markdown/JSON copy actions.
- `/reports`: manual session result storage remains available.
- `/agent-status`: manual agent availability and fallback/handoff recommendations.
- `/execution`: if present, controlled execution area with approval, risk, allowed files, validation, result review, retry/handoff, and roadmap update flow.
- `/api/runner`: backend route exists only for supported runner execution and rejects unsafe requests.
- `/api/analyzer`: result/diff analyzer remains review-focused.
- `/api/loop-continue`: prepares next task only; does not auto-run execution.

## Core User Flows

1. Roadmap review from `/plan`
   - Open `/plan`.
   - Confirm roadmap and agent status are visible before task details.
   - Expand a task.
   - Confirm normal flow offers prompt copy/review, not loose execution.
   - Expected result: user understands what is next and what requires approval.

2. Prompt compilation
   - Open `/prompt-compiler`.
   - Enter a low-risk UI or test task.
   - Generate a prompt draft.
   - Confirm output includes goal, context, scope, allowed files, do-not-touch files, acceptance criteria, validation, and handoff sections.
   - Expected result: prompt is copy-ready and does not execute anything.

3. High-risk prompt compilation
   - Enter deployment, database migration, auth/security, package install, or git push work.
   - Confirm risk is high or approval required.
   - Confirm dangerous action warnings are visible.
   - Expected result: no run/deploy/merge action is offered.

4. Hermes packet draft
   - Open `/hermes-packets`.
   - View Markdown and JSON for a packet.
   - Copy a packet.
   - Expected result: page states Hermes is not executed and offers copy/review actions only.

5. Controlled execution area
   - If `/execution` exists, open it directly and through the intended navigation path.
   - Confirm the user must review task, agent, cwd/workspace, risk, allowed files, do-not-touch files, and validation commands before execution.
   - Confirm execution cannot start without explicit approval.
   - Expected result: execution is intentional, gated, and auditable.

6. Result review
   - Complete or simulate an execution result.
   - Confirm changed files, diff summary, completion judgment, logs, next prompt, and roadmap status are shown.
   - Expected result: completed status is based on result review, not process exit alone.

## Unsafe Button Labels To Avoid

These labels should not appear in normal `/plan`, prompt compiler, or Hermes draft flows:

- `Execute`
- `Run`
- `Run Agent`
- `Auto Run`
- `Auto Execute`
- `Continue Automatically`
- `Deploy`
- `Push`
- `Merge`
- `Auto Merge`
- `Delete`
- `Reset`
- `Migrate`
- `Install`

If one of these appears in a controlled execution area, it must be directly paired with approval and risk copy.

## Expected Safe Button Labels

Prefer these labels outside the controlled execution area:

- `Generate Prompt Draft`
- `Copy Prompt`
- `Review Prompt`
- `Copy Markdown`
- `Copy JSON`
- `Prepare Execution`
- `Review Execution`
- `Approve and Start`
- `Send to Workbench`
- `Generate Handoff Pack Draft`
- `Generate Context Pack Draft`
- `Prepare Next Task`
- `Save Result`

## Execution Lifecycle Scenarios

- Planned task becomes ready after roadmap/user decision requirements are met.
- Ready task shows agent recommendation, file boundaries, acceptance criteria, validation commands, and approval gate.
- User approves controlled execution.
- Runner creates an isolated branch/workspace before invoking an agent.
- Runner streams logs and records execution status.
- Analyzer reviews changed files and diff summary.
- User reviews completed, partial, failed, or pending judgment.
- System prepares retry, handoff, Context Pack, or next task.
- Roadmap updates only after review.

## Failure Scenarios

- Missing project path: execution is blocked with clear copy.
- Missing prompt: execution is blocked with clear copy.
- Unsupported agent: backend rejects and UI suggests manual prompt or workbench handoff.
- Dirty working tree: runner blocks execution and asks user to commit, stash, or discard.
- Path traversal or cwd outside project scope: API returns an error.
- Branch creation failure: execution stops and logs the error.
- Agent process failure: execution log is saved, task becomes blocked/failed, retry/handoff path appears.
- Analyzer failure: user can retry analysis without re-running execution.
- Partial completion: roadmap is not marked complete; next prompt is generated.
- Token-limited or context-overloaded agent: fallback/handoff/Context Pack is suggested.
- Vibe Kanban offline: mock/draft fallback remains available.

## Regression Checks

- `/plan` has safety copy and does not import or render direct runner controls in the normal roadmap flow.
- Runner backend route still exists and keeps a narrow supported-agent allowlist.
- Runner backend rejects unsupported agents with manual-execution guidance.
- Runner backend validates cwd safety.
- Runner backend checks for uncommitted changes before execution.
- `/api/loop-continue` prepares the next task only.
- Prompt compiler still includes safety notice, approval warning, do-not-touch files, validation commands, and copy prompt action.
- Hermes packet page still states Hermes is not executed.
- Hermes packet components do not call runner, spawn, CLI, cron, or API execution paths.
- Vibe Kanban bridge copy frames Vibe Kanban as workbench, not product brain.
- New execution pages include approval, risk, file boundaries, validation, result review, retry/handoff, and roadmap update copy.

## Mobile Checks

- `/plan` header, safety notice, roadmap, agent cards, and task cards stack without overlap at 375 px width.
- Prompt review and copy controls remain reachable by touch.
- Risk and approval copy remain visible before any execution action.
- Long file paths and validation commands wrap or scroll without pushing controls off-screen.
- Hermes packet Markdown/JSON previews are scrollable and copy buttons stay usable.
- Controlled execution area, if present, keeps approval and risk copy above the execution action on mobile.

## Pending Automation Targets

- Add browser-level route tests when a stable app test harness exists.
- Add component render tests if Jest is configured for React/JSX.
- Add API route unit tests for `/api/runner` with mocked git/spawn/storage dependencies.
- Add visual regression snapshots for `/plan`, `/prompt-compiler`, `/hermes-packets`, and `/execution` once the UI stabilizes.
