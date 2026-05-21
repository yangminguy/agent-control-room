# Execution Safety Checklist

Use this checklist before merging any Execution Manager, runner, roadmap, prompt compiler, Hermes packet, or Vibe Kanban handoff change.

## 1. Approval Gate

- [ ] Every execution entry point requires an explicit user action immediately before execution.
- [ ] Continuing after a result analysis prepares the next task only; it does not auto-run the next task.
- [ ] High-risk tasks show that user approval is required before execution.
- [ ] Approval language is visible near the action, not hidden in documentation only.
- [ ] The UI distinguishes draft/preparation actions from real execution actions.

## 2. Risk Display

- [ ] Risk level is shown for compiled prompts or execution packets.
- [ ] High-risk actions are listed in plain language.
- [ ] The user can see why the selected agent or workbench is recommended.
- [ ] The user can see fallback or handoff guidance when an agent is unavailable.
- [ ] The UI warns before deployment, database migration, auth/security changes, package installation, destructive file changes, git push, merge, or cleanup commands.

## 3. Allowed Files

- [ ] Each execution prompt includes files allowed to edit.
- [ ] Allowed files are narrow and task-specific.
- [ ] Generated prompts do not grant broad repository access unless the task truly requires it.
- [ ] Vibe Kanban or external-agent handoffs preserve allowed-file boundaries.
- [ ] Result review compares changed files against allowed files.

## 4. Do-Not-Touch Files

- [ ] Each execution prompt includes do-not-touch files when relevant.
- [ ] Source areas outside the task scope are explicitly protected.
- [ ] Runner, API, database, env, package, migration, and deployment files are protected unless the task specifically targets them.
- [ ] Handoffs preserve do-not-touch files.
- [ ] Result review flags edits outside do-not-touch boundaries.

## 5. Validation Commands

- [ ] Prompts list validation commands appropriate for the task.
- [ ] Default validation includes `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` when the task can affect application behavior.
- [ ] Commands are displayed as checks to run after the work, not as hidden automation.
- [ ] Validation failures block completion or create a clear follow-up/handoff.
- [ ] Test additions cover the specific safety boundary being changed.

## 6. Dangerous Operation Warnings

- [ ] Deployment requires explicit warning and approval.
- [ ] Database schema or migration work requires explicit warning and approval.
- [ ] Auth, secrets, encryption, and permission changes require explicit warning and approval.
- [ ] Git push, merge, reset, force push, branch deletion, and auto-merge are not exposed as normal execution buttons.
- [ ] Package installation and lockfile changes require an explicit task scope and approval.
- [ ] Shell commands that can delete, overwrite, or move broad file sets are blocked or require a separate approval step.

## 7. API Route Exposure

- [ ] Execution APIs reject unsupported agents.
- [ ] Execution APIs validate working directories and reject path traversal.
- [ ] Execution APIs do not run when required task, plan, prompt, or cwd data is missing.
- [ ] Execution APIs create an isolated branch/workspace before agent execution.
- [ ] Execution APIs block or warn on dirty working trees before execution.
- [ ] Public route copy does not imply that unsupported Codex, Antigravity, Hermes, deployment, migration, or auto-merge execution is available.

## 8. Runner UI Exposure

- [ ] `/plan` remains a Visual Development Roadmap Control Panel, not a loose execution console.
- [ ] `/plan` exposes roadmap, readiness, prompts, handoffs, and review state before any execution surface.
- [ ] Direct runner controls are only visible in the controlled execution area.
- [ ] Unsafe button labels such as `Execute`, `Run Agent`, `Auto Run`, `Deploy`, `Merge`, `Delete`, `Push`, or `Migrate` do not appear in normal `/plan` flow.
- [ ] Safe labels such as `Generate Prompt Draft`, `Copy Prompt`, `Review Prompt`, `Prepare Handoff`, `Generate Context Pack Draft`, and `Send to Workbench` are preferred.

## 9. Result Review

- [ ] Execution results show changed files.
- [ ] Execution results show diff summary or outcome summary.
- [ ] Completion judgment is conservative: completed, partial, not completed, or pending.
- [ ] Review checks acceptance criteria before marking roadmap progress complete.
- [ ] Failures preserve logs and next-step context.

## 10. Retry And Handoff

- [ ] Retry buttons do not bypass approval or execute a different task silently.
- [ ] Failed or partial results generate a next prompt, handoff, or Context Pack.
- [ ] Token-limited, cooling-down, blocked, manual-only, experimental, or overloaded agents trigger fallback guidance.
- [ ] Hermes remains a background/status/memory worker unless a future approved task explicitly changes that boundary.
- [ ] Vibe Kanban remains the execution workbench, not the product brain.

## 11. Roadmap Update

- [ ] Roadmap updates happen after result review, not before execution.
- [ ] Partial or failed work does not mark a roadmap stage complete.
- [ ] Blockers and user decisions remain visible.
- [ ] Next task recommendations preserve context, acceptance criteria, validation commands, and file boundaries.
- [ ] Session reports or execution logs preserve changed files, remaining work, and next prompt.

## 12. Regression Guardrails

- [ ] Runner backend files still exist when execution is supported.
- [ ] Prompt compiler still generates copy-ready prompts with safety sections.
- [ ] Hermes packet flows still render as drafts and do not execute Hermes.
- [ ] `/plan` safety copy still states that automatic execution/file modification does not happen from normal roadmap review.
- [ ] New execution pages, if added, include approval, risk, allowed files, do-not-touch files, validation, result review, retry/handoff, and roadmap update copy.
