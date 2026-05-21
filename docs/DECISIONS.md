# DECISIONS.md — Agent Control Room

## Decision 001 — MVP is prompt-first, not autonomy-first
Status: Amended by Decisions 013 and 015

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
Agent status will be manually set. Current Control Tower statuses are `available`, `cooling_down`, `token_limited`, `blocked`, `context_overloaded`, `manual_only`, and `experimental`.

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
Status: Amended by Decision 014

### Decision
Use Vibe Kanban as the first open-source execution/work-board base to evaluate and integrate with Agent Control Room.

### Reason
Vibe Kanban already provides issue cards, workspaces, git worktrees, agent sessions, diff/review workflows, and support for Claude Code and Codex. These are exactly the lower-level execution features the new PRD says Agent Control Room should avoid rebuilding first.

### Consequence
Agent Control Room should focus on the orchestration layer: product-direction translation, task decomposition, routing, prompt generation, handoff generation, and session reporting.

---

## Decision 010 — Keep Vibe Kanban integration MCP/API-first
Status: Amended by Decision 014

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

---

## Decision 016 — Vibe Kanban result import remains review-only in Control Tower
Status: New (2026-05-22, Phase 11)

### Decision
When a Vibe Kanban result is imported back into Agent Control Room's `/result-review`, it is classified and analyzed locally, but never automatically executed or applied to the roadmap. The user reviews the result and manually decides next steps (Continue/Stop/Retry).

### Reason
Maintaining human-in-the-loop control and preventing unintended automation of result handling. Vibe Kanban is the *execution* workbench; Agent Control Room remains the *decision* and *review* layer.

### Consequence
Result import is a local normalization endpoint (`/api/vibe-kanban/import`), not a remote sync. Vibe Kanban remains a workbench, not a primary data store.

---

## Decision 017 — Hermes is a background worker only; no autonomous code execution
Status: New (2026-05-22, Phase 11)

### Decision
Hermes can generate monitoring summaries, Obsidian notes, insight extraction, and handoff packs, but must never execute code, modify databases, trigger deployments, or perform any action without explicit user approval. It is a *tool*, not an *agent*.

### Reason
Safety boundary: the product must remain controllable. Autonomous Hermes execution would violate the human-in-the-loop principle established in Decision 001.

### Consequence
Hermes integration follows 3 safe patterns (Static Generator ✅, Manual CLI, Subprocess with Approval Gate) documented in `docs/HERMES_INTEGRATION_ROADMAP.md`. Only Pattern A is complete; Patterns B and C require explicit Phase gates.

---

## Decision 018 — Phase 11 focuses on workbench integration and deployment readiness, not new features
Status: New (2026-05-22, Phase 11)

### Decision
Phase 11 completes Vibe Kanban integration (workspace link + result import), documents Hermes roadmap, and hardens deployment readiness. Phase 11 does *not* add new core features; the MVP (18 user requirements) was feature-complete at Phase 10.

### Reason
MVP is validated. Phase 11 is about production readiness and bridging to Vibe Kanban. New features belong in Phase 12+.

### Consequence
Post-Phase-11 work is optional/scaling: Vercel deployment, enhanced Hermes generators, Hermes CLI integration, real Vibe Kanban workspace sync.

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

---

## Decision 014 — Agent Control Room is the brain; Vibe Kanban is the workbench
Status: Accepted

### Decision
Keep Agent Control Room as the orchestration brain and use Vibe Kanban as the execution workbench. Agent Control Room owns product intent, technical translation, task decomposition, agent routing, generated prompts, acceptance criteria, approval gates, session reports, and handoffs. Vibe Kanban should own or provide the richer execution surfaces: issue cards, workspaces, git worktrees, Claude/Codex sessions, diff/review UI, and previews.

### Reason
The product's differentiation is not a better kanban board. Its differentiation is reducing context loss and decision burden for a PM/non-developer using multiple AI coding tools. Vibe Kanban is already stronger at board/session/workspace mechanics, so rebuilding those surfaces inside Agent Control Room would create a weaker duplicate and dilute the core product.

### Consequence
Future work should deepen the Vibe Kanban bridge before expanding internal board features. Prefer API/MCP integration, open-workspace links, workspace/session launch, execution-result import, and diff/review handoff. `/plan` should become a control panel for readiness, prompts, acceptance criteria, and decisions rather than a full replacement for Vibe Kanban.

Do not make Vibe Kanban the source of product intent or orchestration logic. Do not deep-fork Vibe Kanban until the bridge proves valuable and stable.

---

## Decision 015 — Agent Control Room is an AI Development Control Tower
Status: Accepted

### Decision
Define Agent Control Room primarily as an AI Development Control Tower for non-developer PMs. Prompt generation and handoff generation remain core submodules, but they are not the full product definition.

### Reason
The user wants to input only an idea or product direction and have the system produce a roadmap, task breakdown, agent assignment, senior-dev prompts, execution tracking, completion checks, token/context handoffs, and durable insight memory.

### Consequence
Major docs and future UI work should use control-tower language. `/plan` should become a Visual Development Roadmap Control Panel. The next active phase is Roadmap-First Control Tower UX before deeper Vibe Kanban workbench expansion.

---

## Decision 016 — Context reset uses Context Packs, not literal `/clear`
Status: Accepted

### Decision
When context is long, token-limited, overloaded, or ready for a new agent/session, Agent Control Room should generate a structured Context Pack and next-session prompt.

### Reason
Literal `/clear` is tool-specific and loses product intent unless the system preserves decisions, changed files, completed work, blockers, and next acceptance criteria.

### Consequence
Future implementation should add Context Pack generation and handoff recommendations for `token_limited` and `context_overloaded` agent states.

---

## Decision 017 — Hermes is optional background worker only
Status: Accepted

### Decision
Hermes may be represented as an optional background/status/memory worker for monitoring, summaries, Obsidian note generation, development log summarization, and retry candidate discovery.

### Reason
Hermes can help with long-running memory and status work, but the product should not shift high-risk coding responsibility to an autonomous background agent.

### Consequence
Hermes must not be assigned high-risk autonomous code changes, DB migrations, deployment, or auto-merge without explicit user approval.
