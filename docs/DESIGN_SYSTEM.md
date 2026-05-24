# Design System — Agent Control Tower Brightline

Source reference: `/Users/wonminyang/Downloads/Agent Control Tower UI Redesign.zip`

## Product UI Direction

Agent Control Tower uses the **Brightline** direction:

```text
Bright shell.
Black structure.
Pink decision.
```

The product should feel like a minimal agent command dashboard for non-developer PMs. It is not a dark terminal, a prompt gallery, or a decorative pink SaaS landing page.

## Core UX Promise

Every primary screen must answer these questions within five seconds:

- What is the current overall state?
- Which phase is active?
- Which agent is doing what?
- What is blocked, risky, or waiting for approval?
- What decision does the PM need to make now?
- What happens if the PM clicks the primary action?

If a screen cannot answer those questions quickly, reduce visual noise before adding new UI.

## Visual Principles

### 1. Bright Shell

Use a light app shell and calm white surfaces.

- Page background: `#FAFAFA`
- Primary surface: `#FFFFFF`
- Subtle/inset surface: `#F4F4F5` or `#F7F7F8`
- Hairline borders: `#ECECEE` / `#D7D7DB`

Do not make the main product feel like dark mode. Black is for structure and key commands, not for entire page sections.

### 2. Black Structure

Use black and near-black for:

- Primary text
- Important headings
- Primary command buttons
- Dense structural anchors when needed

Do not use black as the default card background. Avoid large black panels except for genuine terminal/log details hidden behind advanced views.

### 3. Pink Decision

Pink is a scarce signal. Use it for:

- Primary PM decision CTA
- Approval required
- Current selection
- Important active alert
- Small brand mark

Do not use pink for generic decoration, every hover state, broad gradients, secondary buttons, or non-action labels.

Pink budget guideline: the screen should not read as pink. Pink should occupy roughly **7% or less** of the visible UI.

## Color Tokens

```css
:root {
  --background: #fafafa;
  --surface: #ffffff;
  --surface-2: #f4f4f5;
  --surface-inset: #f7f7f8;
  --border: #ececee;
  --border-strong: #d7d7db;

  --text-primary: #111114;
  --text-secondary: #4b4b55;
  --text-tertiary: #8b8b95;

  --pink-primary: #ff2e7e;
  --pink-soft: #ffe3ee;
  --pink-muted: #e5176e;

  --success: #15a45f;
  --success-bg: #e8f6ee;
  --warning: #b66a0a;
  --warning-bg: #fbf1df;
  --danger: #c8362e;
  --danger-bg: #fbe7e5;
  --info: #2c5be0;
  --info-bg: #e7edfb;
}
```

## Layout Model

Use five information zones. Do not duplicate the same information in multiple zones.

| Zone | Purpose |
|---|---|
| Left navigation | Stable app map and route switching. |
| Top status | Overall system state, active phase, and one primary command. |
| Center work stream | Active phase, planning flow, roadmap/timeline, or selected content. |
| Right decision queue | Approval, risk, blockers, Hermes recovery suggestions, and agent pulse. |
| Bottom memory/log | Recent events, QA summaries, insight history, raw logs only when needed. |

## Route Expectations

### `/`

Main Control Room.

- Show current plan/phase/readiness first.
- Show planning stream as a work surface, not a black chat terminal.
- Show Hermes as a supervision summary, not a raw system event log.
- Keep execution CTA black and explicit.

### `/plan`

Main roadmap control panel.

- Roadmap is the source of truth.
- Current phase must be visually distinct.
- User decisions and approval needs must appear before detailed task lists.
- Vibe Kanban is a detail/workbench entry point, not the main product.

### `/orchestration`

Execution command and decision flow.

- Natural language request -> phase decomposition -> agent assignment should be understandable.
- Dev/mock tools must be clearly labeled and tucked away.
- External tool status must read as system readiness, not fake live integration.

### `/agent-status`

Agent pulse.

- First show Claude / Codex / Antigravity / Hermes status and next action.
- State-changing controls are secondary.
- Blocked, limited, cooling down, and approval-required states must be impossible to miss.

### `/hermes-packets`

PM-readable supervision and recovery.

- First show PM summary, root cause, risk, and recommended recovery.
- Raw Markdown/JSON is secondary and collapsible.
- Hermes must never look like a coding agent.

### `/result-review`

PM decision after execution.

- First show verdict: pass / conditional pass / fail / blocked.
- Show remaining risk and recommended next agent/action.
- Changed files and raw output are supporting details, not the top-level experience.

## Component Rules

- Prefer list rows and section bands over many floating cards.
- Cards are for repeated items, modals, and framed tools only.
- Use 8px radius or less by default; 12px is allowed for major panels.
- Use icons for familiar actions and keep labels for destructive/high-risk actions.
- Keep command buttons explicit: `실제 실행 시작`, `승인하고 계속 진행`, `Codex QA로 전달`.
- PM-facing copy must avoid raw developer terms unless paired with explanation.

## Forbidden UI Patterns

- Dark mode as default product theme.
- Neon pink gradients or pink-washed screens.
- Large black panels for ordinary content.
- Raw terminal logs as first-level PM content.
- Mock/dev buttons styled like production actions.
- Duplicate status cards that compete with the decision queue.
- Hero/marketing layout on operational routes.

## QA Checklist For Future UI Work

- The route is bright at first glance.
- Pink is limited to current selection, approval/decision, or primary CTA.
- The PM can identify the next action in five seconds.
- Approval/risk/blocker states are above the fold.
- Agent status and phase status are distinct.
- Hermes content starts with PM summary, not raw Markdown/JSON.
- Result review starts with verdict, risk, and next recommendation.
- No horizontal overflow at 390px and 1280px.
- `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` pass.
