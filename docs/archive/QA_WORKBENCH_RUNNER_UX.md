# Workbench Local Runner UX QA Plan

Use this immediately after Claude Code finishes the Local Runner Result UX and Manual Agent Boundary work.

This is a read-only QA plan. Do not modify runtime files while performing this review unless a separate follow-up task explicitly asks for fixes.

## Scope

Review the Workbench local runner UX, result display, and manual-agent boundaries for Agent Control Room.

Agent Control Room is a local AI Development Control Tower for a non-developer PM. The Workbench may prepare and display local execution only through the existing human-approved runner path.

Critical boundary:
- `claude-code` is the only executable local runner agent.
- `codex`, `antigravity`, `hermes`, and `vibe-kanban` must remain manual, background, or workbench-handoff targets only.
- The runner must not call paid OpenAI or Anthropic APIs by default; it invokes already-authenticated local tooling.

## Files To Inspect

Inspect these files first:

- `components/workbench/WorkbenchRunPanel.tsx`
- `components/workbench/ExecutionReadinessGate.tsx`
- `components/runner/RunnerLogView.tsx`
- `app/workbench/page.tsx`
- `app/api/runner/route.ts`
- `lib/runner/spawn-runner.ts`
- `app/api/workbench/approval/route.ts`

Inspect related tests and safety coverage:

- `__tests__/api/runner-route.test.ts`
- `__tests__/api/workbench-approval-route.test.ts`
- `__tests__/runner/spawn-runner.test.ts`
- Any new or changed test files under `__tests__`, `tests`, or colocated `*.test.ts` / `*.test.tsx` files that mention runner, workbench, approval, forged approval, blocked commands, unsupported agents, or git safety.

Also inspect the change set:

```sh
git status --short
git diff --name-only
git diff -- package.json package-lock.json pnpm-lock.yaml yarn.lock
```

## Safety Checks

### Agent Execution Boundary

- [ ] UI only offers local execution for `claude-code`.
- [ ] API route rejects `codex`, `antigravity`, `hermes`, `vibe-kanban`, `manual`, missing agents, and unknown agent IDs.
- [ ] Unsupported agents show manual/background/workbench guidance instead of an execution button.
- [ ] Vibe Kanban is described as a workbench/handoff surface, not an executable runner agent inside Agent Control Room.
- [ ] Hermes is described as background/status/memory only, not a coding runner.

### Approval Boundary

- [ ] Execution still requires a server-issued approval token.
- [ ] Approval token is context-bound to the intended task, agent, prompt, and working directory.
- [ ] Approval token remains one-time-use or otherwise cannot be replayed for a different run.
- [ ] Direct forged approval requests remain blocked.
- [ ] Approval copy is visible near the execution action.
- [ ] Retry, continue, rerun, or result actions do not bypass approval.
- [ ] `app/api/workbench/approval/route.ts` was not weakened while adding UX improvements.

### Runner Command Safety

- [ ] Runner still blocks deployment commands.
- [ ] Runner still blocks database migration commands.
- [ ] Runner still blocks `git push`.
- [ ] Runner still blocks merge and auto-merge flows.
- [ ] Runner still blocks broad destructive shell actions when covered by existing safety rules.
- [ ] Git status still fails closed when status cannot be determined.
- [ ] cwd realpath and symlink escape checks still prevent execution outside the approved project path.
- [ ] Git branch creation still avoids shell interpolation.

### Change Scope Safety

- [ ] No new package dependency was added.
- [ ] No database schema or migration file was changed.
- [ ] No auth, secrets, environment, deployment, or CI config was changed.
- [ ] No automatic Codex, Antigravity, Hermes, Vibe Kanban, deployment, migration, push, merge, or auto-merge path was introduced.
- [ ] Runtime changes are limited to the Workbench runner UX, result UX, and manual boundary messaging needed for the task.

## UX Checks

Review the Workbench as a non-developer PM.

### Before Execution

- [ ] Workbench clearly says local execution may modify files.
- [ ] Workbench clearly says the user must already be logged in locally to the relevant CLI/tool.
- [ ] Workbench clearly says the runner does not call paid OpenAI or Anthropic APIs by default.
- [ ] Workbench clearly distinguishes executable `claude-code` from manual/background agents.
- [ ] Unsupported agents have copy-ready/manual next steps, not disabled mystery states.
- [ ] The user can see the selected task, agent, cwd/workspace, prompt summary, risk, and approval requirement before execution.

### During Execution

- [ ] Logs are readable and labeled in plain language.
- [ ] Loading/running state is clear.
- [ ] The user can tell that execution is local and file-modifying.
- [ ] UI does not imply that unsupported agents are running in the background.

### After Execution

- [ ] Result summary is understandable to a non-developer PM.
- [ ] Changed files are shown or linked clearly when available.
- [ ] Success, partial, failed, and blocked states are visually distinct.
- [ ] Failed or blocked states give a concrete next action.
- [ ] Result copy avoids overstating completion when only the process exited.
- [ ] Any next prompt, handoff, or retry path preserves approval and manual-agent boundaries.

### Mobile / Small Viewport

- [ ] Approval copy remains visible before execution controls.
- [ ] Long paths, logs, and command text wrap or scroll without overlapping controls.
- [ ] Result summary and next action remain readable.
- [ ] Manual-agent guidance is not hidden behind hover-only UI.

## Regression Tests

Run these after Claude Code finishes:

```sh
npm run typecheck
npm run lint
npm run test
npm run build
```

If any command fails, record the exact command, failure summary, and whether the failure appears related to the Workbench runner changes.

## Manual API Probe Ideas

Use these only as read-only/manual verification notes unless a later task asks for automated tests.

- Try to start a run with `agent: "claude-code"` and a valid approval token; expected: accepted only when all safety inputs are valid.
- Try to start a run with `agent: "codex"`; expected: rejected with manual guidance.
- Try to start a run with `agent: "antigravity"`; expected: rejected with manual guidance.
- Try to start a run with `agent: "hermes"`; expected: rejected with background/manual guidance.
- Try to start a run with `agent: "vibe-kanban"`; expected: rejected or treated as handoff/workbench only.
- Try to reuse or forge an approval token; expected: rejected.
- Try cwd traversal or symlink escape input; expected: rejected.
- Try prompts containing deploy, migration, git push, merge, or auto-merge intent; expected: blocked or requires separate non-runner approval according to existing safety rules.

## Severity Rubric

### Blocker

Mark the QA result as Blocker if any of these are true:

- Any non-`claude-code` agent can execute through the local runner.
- Approval token semantics are weakened, replayable for another context, or bypassable.
- Direct forged approval is accepted.
- Runner allows deploy, DB migration, git push, merge, or auto-merge through the normal Workbench flow.
- cwd validation can escape the approved project path.
- Git safety fails open.
- New dependency, DB schema, auth, deployment, or CI changes were introduced without explicit scope.
- UX tells the user an unsupported agent is running or executable.

### Needs Minor Fix

Mark the QA result as Needs Minor Fix when the execution boundary is safe, but the experience needs correction:

- Safety copy is present but vague or too far from the action.
- Unsupported agents are blocked but the manual next step is unclear.
- Result summary is technically correct but hard for a non-developer PM to understand.
- Failed or blocked state lacks a concrete next action.
- Mobile layout has wrapping, spacing, or readability issues without hiding safety controls.
- Tests pass, but a narrow regression test should be added later.

### Pass

Mark the QA result as Pass only when:

- `claude-code` is the only executable local runner agent.
- Unsupported agents are blocked and clearly framed as manual/background/workbench-only.
- Approval, forged-token, cwd, git, and dangerous-command protections remain intact.
- No out-of-scope dependency, DB, auth, deployment, or CI changes were made.
- Workbench copy is clear for a non-developer PM before, during, and after execution.
- Typecheck, lint, test, and build all pass.

## Final QA Report Template

```md
# Workbench Local Runner UX QA Report

## Verdict
Pass / Needs Minor Fix / Blocker

## Files Inspected
- 

## Safety Issues
- 

## UX Issues
- 

## Tests Run
- `npm run typecheck` — pass/fail/not run
- `npm run lint` — pass/fail/not run
- `npm run test` — pass/fail/not run
- `npm run build` — pass/fail/not run

## Recommended Next Action
- 
```

## Recommended QA Scope

Use a two-pass review:

1. Safety pass: inspect the runner API, approval route, spawn runner, execution tests, changed package files, and dangerous-command/cwd/git protections.
2. UX pass: inspect the Workbench page and components as a non-developer PM, including unsupported-agent states, result summaries, failed/blocked next actions, and mobile readability.

Do not implement fixes during this QA pass. Record findings with file paths, line numbers, severity, and the smallest recommended follow-up.
