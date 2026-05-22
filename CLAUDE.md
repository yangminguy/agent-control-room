# CLAUDE.md — Agent Control Room

## Project Summary
Agent Control Room is a personal **AI Development Control Tower** for a PM/non-developer user. It turns an idea or product direction into a visual development roadmap, decomposes it into executable tasks, recommends the right AI agent or workbench, compiles senior-developer-quality prompts, tracks outcomes, and preserves handoff context until the product or feature is complete.

The current MVP began with prompt and handoff orchestration. The updated direction expands it into a roadmap-first control tower while keeping user approval, review, and explicit execution gates at the center.

## Current Direction
Agent Control Room should now be described first as an AI Development Control Tower for non-developer PMs.

The product loop is: idea or product direction → senior developer translation → visual roadmap → task decomposition → agent routing → senior-dev prompt compilation → human approval → execution/workbench handoff → result/diff analysis → roadmap completion checks → Obsidian-compatible insight memory → next task, handoff, or Context Pack.

Prompt and handoff generation remain core submodules, but they are no longer the whole product definition.

## Product Principle
The product must reduce context loss and decision burden. It should help the user answer:

- What should be done next?
- Which AI tool should do it?
- What context should the tool read first?
- What files can it edit?
- What does completion mean?
- How should the work be handed off?

## Current MVP Scope
Build the roadmap-first MVP of the AI Development Control Tower.

Included:
- Project registration
- Project document reader
- Idea or product direction input
- Technical translation
- Product roadmap generation
- Visual `/plan` roadmap control panel
- Task decomposition with acceptance criteria
- Agent routing recommendation
- Senior Dev Prompt Compiler for tool-specific prompts
- Handoff generation
- Session report input/storage
- Next task recommendation
- Agent availability manager
- Context reset / handoff pack generation
- Obsidian-compatible insight memory export concept

Excluded:
- Codex automatic execution
- Antigravity automatic execution
- Token usage automatic detection
- Slack integration
- GitHub PR automation
- Auto-merge
- fully autonomous code execution without user approval

## Current Implementation Status
As of 2026-05-22, the codebase implements:

**Phase 1-8 (Complete)**:
- Direction to Prompt at `/`.
- `/api/orchestrate` with OpenAI structured output and deterministic local fallback.
- TypeScript domain types in `lib/types.ts`.
- Local JSON seed/read storage in `data/` and `lib/storage/json-store.ts`.
- Session report input and persistence at `/reports` and `/api/reports`.
- Vibe Kanban issue draft conversion and HTTP bridge in `lib/integrations/vibe-kanban.ts`.
- Project registration/list/detail routes and UI.
- Handoff preview UI.
- Plan, task, and card data model (`FeaturePlan`, `PlanTask`, `KanbanCard`, `SubAgentTrack`, `ExecutionLog`).
- `/plan` HTML plan view with current card/status UI and manual task status updates.
- Agent Execution Runner foundation: git branch creation, Claude Code CLI spawn, SSE log streaming, execution log storage, and `RunnerLogView`.
- T019 Git Diff & Outcome Analyzer.
- T020 Multi-Agent Router Enhancement.
- T021 Token / Rate Limit Handoff.
- T022 human-approved Autonomous Execution Loop.
- T024 Vibe Kanban HTTP issue integration with mock fallback.
- T025 Security & Dependency Hardening (npm audit fix, path validation).
- T026 Supabase schema/storage migration readiness with JSON fallback.

**Phase 9 (Complete)**:
- T027 `/plan` Visual Development Roadmap Control Panel ✅
  - Roadmap data model and types (RoadmapStage, RoadmapStatus, etc.)
  - Roadmap helper functions and storage layer with Supabase fallback
  - `/api/roadmap` endpoint for data retrieval
  - UI components: RoadmapTimeline, RoadmapStageCard, RoadmapStatusBadge
  - Adapter layer: `roadmap-ui-adapter.ts` for data ↔ UI mapping
  - `/plan` refactored as roadmap-first Control Tower
  - Agent Status Panel with 6 agents (Claude Code, Codex, Antigravity, Hermes, Vibe Kanban, Manual/User)
  
- T027-Hermes Hermes Packet Draft UI ✅
  - Hermes type system: HermesPacket, HermesSection, HermesPacketKind (6 kinds)
  - Hermes packet generators: session-summary, context-pack, handoff-pack, failed-task-review, background-research, obsidian-note
  - Markdown renderer and JSON exporter
  - `/hermes-packets` page with packet kind selector, Markdown/JSON preview, copy-to-clipboard
  - Example packet data in `data/hermes-task-packets.json`
  - PacketDraftCard component for grid display
  - Safe link from Hermes agent card to `/hermes-packets`
  - Safety notice: "Hermes is not executed" (prominent on page)

- T028 Senior Dev Prompt Compiler Structure ✅
  - Core compiler in `lib/prompts/senior-dev-prompt-compiler.ts`
  - Type system in `lib/prompts/senior-dev-compiler.types.ts`
  - Enhancements: agent availability, token limit tracking, handoff recommendation, context pack recommendation

**Phase 10 (Complete — Full MVP Control Loop)**:
- T031 Control Tower UI Localization & Architecture Reframe ✅
  - UI localization to Korean (한국어)
  - 18 user requirements fully implemented and tested
  - SchedulingModePanel for task scheduling (Single/Sequential/Parallel/Token Relay)
  - ResultReviewPanel for result review and auto-classification
  - ContextPackBuilder & HandoffPackBuilder for handoff generation
  - HermesMonitorPanel for execution monitoring
  - ObsidianNoteBuilder for insight memory extraction
  - Failed task tracker with retry candidate management
  - Prompt pattern library for prompt synthesis
  - All 91 tests passing, 30 routes compiled
  - Full MVP feature complete

**Phase 11 (Complete — Workbench Integration & Deployment Readiness)**:
- T036 Vibe Kanban Real Integration ✅
  - `workspaceUrl` field added to CreateIssueResponse
  - `/api/vibe-kanban/import` endpoint for result normalization
  - ResultReviewPanel import form added (issueId + workspaceResult)
  - 10 new integration tests, 101/101 tests passing
  - 33 routes compiled, all checks green

- T037 Hermes CLI Integration Roadmap ✅
  - `docs/HERMES_INTEGRATION_ROADMAP.md` created (3,000 words)
  - 12-section analysis: current state, integration points, 3 safe patterns, safety boundaries, 3-phase roadmap
  - Risk assessment and decision gates defined
  - Implementation guidance for Phase 1-3
  - Hermes positioning confirmed: background worker only (no autonomous code execution)

- T038 Deployment Checklist Update ✅
  - `docs/DEPLOYMENT_CHECKLIST.md` updated with Phase 10-11 state
  - npm audit status corrected (T025 reflection)
  - All 33 routes and 18+ API endpoints documented
  - Supabase migration guide and env vars documented
  - Smoke test checklist expanded (8 pages + 6 APIs + data store)
  - Vercel, Docker, Node.js deployment guides added

- T029 Agent Availability Manager & Foundation Modules ✅
  - `lib/agents/agent-availability-manager.ts`: Centralized agent state (available, token_limited, cooling_down, background_worker, etc.)
  - `lib/orchestration/context-pack-generator.ts`: Context Pack generation (Markdown)
  - `lib/orchestration/handoff-pack-generator.ts`: Handoff Pack generation (Markdown)
  - `lib/memory/obsidian-note-generator.ts`: Obsidian-compatible note generation (7 types)
  - `lib/integrations/vibe-kanban/types.ts`: Vibe Kanban Bridge type system
  - `lib/integrations/vibe-kanban/bridge.ts`: Bridge generator functions (5 markdown outputs)
  - `/prompt-compiler` UI enhanced with fallback agent, approval notice, handoff/context pack suggestions, do-not-touch files, validation commands

- T030 Hermes CLI Installation Spike Preparation ✅
  - `docs/HERMES_CLI_INSTALLATION_SPIKE.md`: Spike guide with safety boundaries (no installation/execution)
  - `docs/VIBE_KANBAN_BRIDGE.md`: Bridge architecture and integration roadmap

**Phase 12-16 (Complete — Core Autonomous Orchestration Loop)**:
- Task scheduling decisions (`single`, `sequential`, `parallel`, `token_relay`) based on task risk level and file conflict checks.
- Automatic agent result collection and classification (`Pass`, `MinorFix`, `QA`, `Blocked`, `SafetyViolation`).
- Failed task retry tracking with max 3 retries (infinite loop prevention) and retry candidates management.
- Hermes background observer-only monitoring summaries and Obsidian note exports (7 types: Insight, Decision, Failed-Attempt, Prompt, Handoff, Status, QA-Finding).
- Webhooks and Discord approval preview card (mock) for high-risk actions.
- 23 integration tests, all checks passing.

**Phase 17-18 (Complete — Orchestration Adapters & Control Panel UI)**:
- CLI agent adapters for `claude-code`, `codex`, `antigravity`.
- `/orchestration` page layout with a 5-tab panel (Queue, Results, Approvals, Progress, Feedback).
- State management via React Context (`orchestration-context.tsx`) with seed data for manual verification.

**Phase 19-22 (Complete — Orchestration UX Completion & Logs)**:
- Conversation-to-task job generation panel (`ConversationToJobPanel`).
- Logs API endpoint (`/api/orchestration/logs`) reading NDJSON file logs.
- OrchestrationLogViewer UI component displaying event categories, agents, risk metrics, and timestamps.
- Hermes Insight Panel rendering cycle summaries, performance reviews, routing tips, and Obsidian note export concatenation.

**Phase 28-32 (Complete — Real CLI Integration & Production Safety)**:
- Real Codex CLI stdout parsing and Antigravity Prompt-Copy workflows.
- Vibe Kanban HTTP API integration and card status polling.
- Destructive Pattern Detector protecting do-not-touch files.
- Context budget auto-management based on token limits (chars/4 heuristic).
- Risk escalation approval gates.
- 199 tests passing.

**Phase 33 (Complete — Production Hardening & Error Recovery)**:
- Exponential backoff retry policies for network and API errors.
- Error recovery manager scheduling retries and logging strategies.

**Phase 34 (Complete — Hermes LLM Validation & Auto-Decision Layer)**:
- LLM-assisted validation logic scoring completion ratio and risks.
- Auto-decision engine with confidence threshold (default 75%) for auto-approving/rejecting tasks, and user approval workflows.
- 22 new tests passing (225 total passing).

**Phase 35-36 (Complete — Multi-Project Integration & Dashboard)**:
- `MultiProjectOrchestrator` for managing parallel projects (up to 2 concurrent) with independent queues.
- `AgentSlotAllocator` restricting agent concurrency across projects.
- Dashboard snapshot builder aggregating KPI metrics, activity feeds, and active slot statuses.
- Real-time client dashboard UI at `/dashboard` displaying metrics, agent listings, and active project filters.
- 26 new tests passing (251 total passing).

**Phase 37-39 (Complete — Hermes Enhancements: Telegram, OrchestrationPacket, Risk Classification)** ✅:
- **Telegram Integration**: `TelegramClient` for approval requests, status reports, phase complete alerts, failure reports, high-risk operation warnings.
  - Fixed Markdown formatting for Telegram API compatibility
  - Supports 6 message types with mock mode fallback
  - Tests: 7 passing (approval, status, phase complete, failure, warning, singleton)
- **OrchestrationPacket & PhaseCompletePacket**: Formalized packet types in `lib/types.ts` for Hermes→Agent Control Room communication.
  - Automatic status inference (completed/failed/partial/blocked)
  - Risk assessment and next-step recommendations
  - Markdown rendering support
  - Tests: 7 passing (generation, rendering, markdown)
- **Risk Classification Engine**: `RiskClassifier` auto-classifies tasks by risk level (Low/Medium/High) and detects file conflicts.
  - Pattern-based classification for git, terminal, deployment operations
  - File ownership tracking and conflict detection
  - Auto-recommendation generation
  - Tests: 7 passing (high-risk, medium-risk, critical files, conflict detection)
- **API Routes**: `/api/orchestration/telegram/approve` for approval response intake (persists responses and updates matching in-memory dispatch jobs without triggering execution), `/api/orchestration/classify` for risk classification.
- **Packet Generation**: Functions to generate and render OrchestrationPacket and PhaseCompletePacket (Markdown + JSON).
- **Integration Tests**: 1 Telegram workflow integration test covering 6 complete scenarios (273 total tests passing, 7 skipped).

**Phase 40 (Complete — Planning→Orchestration Auto-Connection)** ✅:
- **localStorage Bridge Pattern**: Cross-page state sharing for orchestration jobs
  - `ChatControlRoom.tsx` stores `pending_orchestration_jobs` after planning execution
  - `orchestration-context.tsx` loads and auto-creates dispatch jobs on mount
  - Lightweight, instant state transfer without backend persistence

**Phase 41 (Complete — Natural Language Project-Aware Orchestration)** ✅:
- **Project Analyzer** (`project-context-manager.ts`): Scans project files, detects frameworks (Next.js, React, TypeScript, Supabase), identifies risk patterns
- **Context Store** (`project-store.ts`): Caches analysis to `data/project-contexts/{projectId}.json`
- **Analysis API** (`/api/projects/[id]/analyze`): On-demand project analysis endpoint with security checks
- **LLM Decision Engine** (`llm-decision-engine.ts`): Uses `gpt-5-mini` for natural language orchestration decisions with automatic fallback to rule-based
- **Project Context Injection** (`orchestrator.ts`): Automatically adds project info to OpenAI system prompt
- **Decision Transparency**: Added `decisionSource: "llm" | "rule_fallback"` field to track decision origin
- **CLI Patch Tool** (`scripts/analyze-and-patch.ts`): Analyzes project → gets AI suggestions → applies patches with user confirmation
- **Status**: 0 TypeScript errors, production build successful, deployed to Vercel
- **Key Achievement**: Full orchestration loop with natural language understanding of project context

**Next Phase**:
- Configure `OPENAI_API_KEY` on Vercel for live LLM-based decisions
- Supabase Syncing and Live Database Hookup
- Real Telegram Bot Token Integration
- Obsidian Memory Loop Implementation
- Production Monitoring and Real-world Usage Feedback Loop

## Recommended Tech Stack
Use this unless the user explicitly changes direction.

- Framework: Next.js App Router
- Language: TypeScript
- Styling: Tailwind CSS
- UI: shadcn/ui where useful
- Icons: lucide-react
- Storage MVP: local JSON or SQLite
- Storage later: Supabase
- Deployment: Vercel

## Key Domain Terms

### Agent
An external AI coding tool used by the user.
Allowed values:
- `claude-code` — Primary coding agent for complex implementation
- `codex` — QA, testing, type checking, isolated fixes
- `antigravity` — UI/UX, visual screen design
- `hermes` — Approval-based operations worker (terminal/status checks, logging, Telegram approval packet/notification support, approval response persistence, Obsidian memory; real Telegram bot/webhook e2e wiring pending)

### Orchestrator
The product layer that translates user intent into a roadmap, task sequence, agent routing, prompts, approval gates, and next-step decisions.

### Senior Dev Prompt Compiler
The module that converts vague non-developer direction into copy-ready prompts with goal, context, scope, non-goals, files to inspect, editable files, acceptance criteria, checks, and handoff instructions.

### Handoff
A structured transfer document from one AI tool to another.

### Session Report
A structured record of what an AI tool did in a specific work session.

### Context Pack
A reset/handoff document used when a session becomes long, token-limited, blocked, or ready to move to a new agent. It must include project goal, completed work, changed files, important decisions, blockers, next task, acceptance criteria, do-not-do rules, and the next prompt.

## Agent Routing Rules
Use these defaults:

| Work Type | Preferred Agent | Reason |
|---|---|---|
| Architecture, complex reasoning, document review | Claude Code | Strong at context-heavy planning |
| Clear implementation, bug fixing, tests, type errors | Codex | Strong at bounded implementation |
| UI prototype, visual iteration, multi-file screen work | Antigravity | Strong for visual/product implementation |
| Terminal/status checks, Git/deployment monitoring, approval packets | Hermes | Approval-based operations worker with Telegram client and approval response persistence |
| Operational automation, logging, memory extraction | Hermes | Obsidian memory + failure pattern analysis |
| Workspaces, sessions, diffs, previews | Vibe Kanban | Execution workbench, not product brain |
| Unknown or ambiguous work | Claude Code first | Analyze before implementation |

If preferred agent status is `cooling_down`, `token_limited`, `context_overloaded`, `blocked`, `manual_only`, or `experimental`, recommend a viable fallback and generate a handoff or Context Pack. Do not invent automatic token integrations; status is manually tracked unless explicitly implemented.

**Hermes Approval Policy**: High-risk operations (git push, production deploy, dependency changes, DB migrations) require explicit approval before execution. Telegram request formatting/client support and approval response persistence exist; execution still remains gated through `/api/runner` approval tokens. See [[docs/HERMES_BACKGROUND_WORKER.md]] for the target approval matrix.

## Core Flow
1. User selects or registers a project.
2. System reads core docs.
3. User enters an idea or product direction.
4. System translates the idea like a senior developer/product partner.
5. System generates a product roadmap and visual `/plan` roadmap control panel.
6. System decomposes roadmap stages into small tasks with acceptance criteria.
7. System recommends an agent or execution workbench.
8. System compiles a copy-ready senior-dev prompt.
9. User approves execution or sends the task to a workbench such as Vibe Kanban.
10. System imports or receives the execution result.
11. System analyzes completion, partial completion, failure, blockers, and changed files.
12. System updates roadmap status, saves a session report, stores useful insight, and recommends the next task or Context Pack.

## Open-Source Integration Direction
Use Vibe Kanban as the execution workbench, not the product brain.

- Agent Control Room owns: product intent, technical translation, task decomposition, agent routing, prompt generation, acceptance criteria, approval gates, result interpretation, insight memory, and handoff context.
- Vibe Kanban owns or inspires: issue cards, workspace lifecycle, git worktrees, Claude/Codex sessions, diff/review UI, and preview flows.
- Prefer API/MCP bridge work over cloning or redesigning Vibe Kanban UI.
- `/plan` should become a Visual Development Roadmap Control Panel for strategy, readiness, status, user decisions, and next prompts.

## Core Documents to Read First
For any implementation task, read in this order:

1. `CLAUDE.md`
2. `AGENTS.md`
3. `docs/README.md`
4. `docs/CONTROL_TOWER_DIRECTION.md`
5. `docs/PRD.md`
6. `docs/ARCHITECTURE.md`
7. `docs/TASKS.md`
8. `docs/AGENT_STATE.md`
9. `docs/HANDOFF.md`
10. `docs/DECISIONS.md`

## Coding Rules
- Keep MVP small and explicit.
- Do not expand automatic tool execution beyond explicitly supported, human-approved runner flows.
- Do not add multi-user collaboration unless requested.
- Do not invent token usage integrations.
- Prefer structured markdown and deterministic templates.
- Keep prompt output copy-ready.
- Every generated task must include acceptance criteria.
- Every handoff must include changed files, remaining work, and next prompt.
- Store durable development insights as Obsidian-compatible Markdown when that workflow is implemented.

## Suggested Folder Structure
```txt
agent-control-room/
  app/
    page.tsx
    projects/
      page.tsx
      [id]/page.tsx
    direction/new/page.tsx
    handoffs/page.tsx
    reports/page.tsx
  components/
    agents/
    projects/
    prompts/
    handoffs/
    reports/
    ui/
  lib/
    orchestration/
    project-docs/
    routing/
    prompts/
    storage/
    types.ts
  data/
    projects.json
    tasks.json
    handoffs.json
    session-reports.json
  docs/
    PRD.md
    ARCHITECTURE.md
    TASKS.md
    HANDOFF.md
    AGENT_STATE.md
    DECISIONS.md
  CLAUDE.md
```

## Initial Implementation Order
1. Define TypeScript domain types.
2. Create seed data storage layer.
3. Build project registration/list/detail UI.
4. Implement document summary input/manual paste flow.
5. Build direction input form.
6. Implement technical translation output model.
7. Implement task decomposition model.
8. Implement routing rules.
9. Implement prompt generator.
10. Implement handoff generator.
11. Implement session report form.
12. Build dashboard cards.

## Acceptance Standard
The MVP is acceptable when the user can:

1. Register a project.
2. Enter a product direction.
3. Receive technical translation.
4. See decomposed tasks.
5. See recommended agent and reason.
6. Copy a tool-specific prompt.
7. Paste back a result.
8. Save a session report.
9. Generate a handoff to another agent.

## Do Not Do Yet
- Do not add uncontrolled Codex automatic execution.
- Do not connect to Antigravity automatically.
- Do not implement GitHub PR creation.
- Do not implement Slack alerts.
- Do not implement unsafe autonomous DB migrations or deployment automation.
- Do not overbuild permissions/authentication.

## Report Format After Each Coding Session
```md
# Session Report

## Summary

## Changed Files

## Tests Run

## Completed

## Remaining Issues

## Recommended Next Task

## Handoff Needed?
```
