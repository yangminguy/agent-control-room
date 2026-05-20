# DECISIONS.md — Agent Control Room

## Decision 001 — MVP is prompt-first, not autonomy-first
Status: Amended by Decision 013

### Decision
MVP 1 started with technical translations, task breakdowns, agent recommendations, prompts, handoffs, and session reports. It should not execute Claude Code, Codex, or Antigravity without an explicit user action.

### Reason
The PRD identifies context loss, task decomposition, prompt quality, and handoff quality as the core problems. Fully automatic execution adds risk and complexity before the core workflow is validated.

### Consequence
The user can manually copy prompts into external tools. A limited Claude Code runner is allowed only behind explicit user approval.

---

## Decision 002 — Use manual agent status in MVP
Status: Accepted

### Decision
Agent status will be manually set as `available`, `limited`, `cooling_down`, `blocked`, or `manual_only`.

### Reason
Automatic token/usage detection is unreliable and out of scope for MVP 1.

### Consequence
Routing logic can still account for token limits without requiring deep integrations.

---

## Decision 003 — Start with simple storage
Status: Accepted

### Decision
Use local JSON, mock repository functions, or SQLite for MVP. Supabase is a later option.

### Reason
The product must validate the orchestration workflow before database/auth complexity.

### Consequence
Data model should be typed and migration-friendly.

---

## Decision 004 — Claude Code, Codex, and Antigravity are external agents
Status: Accepted

### Decision
The app recommends and prepares prompts for external tools rather than embedding them directly.

### Reason
The user's actual workflow depends on switching between multiple AI coding tools. The product should support this reality rather than hide it.

### Consequence
Prompt generation and handoff generation are first-class product features.

---

## Decision 005 — Every task must include acceptance criteria
Status: Accepted

### Decision
Generated and manually created tasks must include acceptance criteria.

### Reason
The user needs to judge whether an AI tool actually completed the work.

### Consequence
Task decomposition cannot output vague work items.

---

## Decision 006 — No multi-user/team features in MVP
Status: Accepted

### Decision
MVP is personal-use only.

### Reason
The 1차 사용자 is a PM/non-developer operating personal AI coding workflows.

### Consequence
Authentication, roles, permissions, and collaboration features are not required in MVP 1.

---

## Decision 007 — Direction to Prompt is the first MVP screen
Status: Accepted

### Decision
The first MVP success experience is `Direction to Prompt`: manual project context, product direction input, technical translation, task decomposition, agent recommendation, and editable copy-ready prompt generation.

### Reason
This directly validates the product's core promise before building a broader dashboard.

### Consequence
The dashboard becomes secondary until the prompt generation flow is useful and stable.

---

## Decision 008 — Use OpenAI structured output for orchestration generation
Status: Accepted

### Decision
Use OpenAI Responses API structured JSON output for technical translation, task decomposition, agent recommendation, and prompt generation. Keep a deterministic local fallback for API failure or missing credentials.

### Reason
Structured output gives the app a typed result shape while preserving the strong recommendation behavior expected from the product.

### Consequence
The app needs `OPENAI_API_KEY` for the primary generation path, but can still return a basic local fallback result if the API call fails.

---

## Decision 009 — Use Vibe Kanban as the first open-source base
Status: Accepted

### Decision
Use Vibe Kanban as the first open-source execution/work-board base to evaluate and integrate with Agent Control Room.

### Reason
Vibe Kanban already provides issue cards, workspaces, git worktrees, agent sessions, diff/review workflows, and support for Claude Code and Codex. These are exactly the lower-level execution features the new PRD says Agent Control Room should avoid rebuilding first.

### Consequence
Agent Control Room should focus on the orchestration layer: product-direction translation, task decomposition, routing, prompt generation, handoff generation, and session reporting.

---

## Decision 010 — Keep Vibe Kanban integration MCP/API-first
Status: Accepted

### Decision
Do not deeply fork or redesign the Vibe Kanban UI at the beginning. Prefer MCP or local API integration for the first bridge.

### Reason
The upstream README says Vibe Kanban is sunsetting, and the repo is a large Rust + React monorepo. A deep fork would create high ownership cost before the product fit of the bridge is validated.

### Consequence
The first integration target is converting Agent Control Room generated tasks into Vibe Kanban issue drafts, then creating issues through MCP or local API if viable.

---

## Decision 011 — Antigravity remains manual in Vibe Kanban bridge
Status: Accepted

### Decision
Map Claude Code and Codex to Vibe Kanban native executors. Treat Antigravity as a manual handoff target until a native or reliable integration path exists.

### Reason
Vibe Kanban supports Claude Code and Codex, but Antigravity is not currently a native executor in the inspected supported executor list.

### Consequence
Generated Vibe Kanban issue drafts for Antigravity tasks should include a manual executor note rather than pretending execution can be automated.

---

## Decision 012 — Keep the first Vibe Kanban bridge draft-first until issue creation is validated
Status: Accepted

### Decision
The first bridge implementation should preserve a local, inspectable `VibeKanbanIssueDraft` conversion layer before adding MCP or local HTTP issue creation.

### Reason
The current code already converts generated Agent Control Room tasks into Vibe Kanban-ready drafts. Issue creation still depends on confirming the most stable local integration surface. Keeping the draft layer separate prevents core orchestration from depending on Vibe Kanban internals too early.

### Consequence
The next implementation should add a small isolated MCP or local HTTP client/route around the existing draft helper, not rewrite the prompt generator, task model, or Direction to Prompt flow.

---

## Decision 013 — Keep execution human-approved
Status: Accepted

### Decision
The app may support narrow execution helpers, starting with the Claude Code runner, but every run and every continuation must be user-approved. Codex and Antigravity remain manual/copy-ready unless explicitly implemented later.

### Reason
The product has moved beyond prompt-only planning, but the user still needs control over context, risk, and tool choice.

### Consequence
Runner, analyzer, and loop features should prepare the next step and ask the user to continue instead of creating a fully autonomous coding loop.
