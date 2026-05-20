# EVOLUTION_STRATEGY.md — Agent Control Room 2026H2 Roadmap

## Current Status (2026-05-20)
- **Phase 5 Complete**: Autonomous Execution Loop (T022)
- **Capability**: Human-in-the-loop orchestrator for PM-to-prompt translation, task decomposition, agent routing, execution, and analysis
- **Agent Ecosystem**: 45 specialized agents available in ~/.claude/agents/
- **Next Frontier**: Intelligent multi-agent orchestration, design excellence, quality assurance at scale

---

## Strategic Direction: From Simple Routing → Intelligent Orchestration

### Why Now?
Current system routes to 3 external agents (Claude Code, Codex, Antigravity). But the 45 internal agents represent specialized expertise across:
- **Architecture** (agent-organizer, codebase-orchestrator, ai-engineer, llm-architect)
- **Quality** (code-reviewer, qa-expert, ui-ux-tester, accessibility-tester)
- **Analysis** (data-analyst, research-analyst, error-detective, knowledge-synthesizer)
- **Operations** (project-manager, task-distributor, git-workflow-manager, context-manager)
- **Design** (ui-designer, ux-researcher, design-bridge, frontend-developer)
- **Performance** (performance-engineer, database-optimizer, postgres-pro)

**Insight**: These agents can form a **composable execution pipeline** within the orchestrator itself, not just route to external tools.

---

## Phase 6 — Intelligent Agent Capability Matrix (P1)

### Goal
Map every available agent to (task_type, complexity, team_size, domain). Enable dynamic agent selection.

### Key Tasks

#### T023 — Agent Capability Inventory
- **Input**: `/Users/wonminyang/.claude/agents/` (45 agents)
- **Process**: Parse agent metadata, extract specializations, identify overlaps
- **Output**: `data/agent-profiles.json` with:
  ```json
  {
    "agent_id": "ui-designer",
    "aliases": ["designer", "ui"],
    "specializations": ["visual-design", "interaction-patterns", "design-systems"],
    "input_types": ["wireframe-request", "design-review", "accessibility-audit"],
    "output_types": ["design-components", "style-guide", "accessibility-report"],
    "best_for": ["new-ui-feature", "design-system-work", "accessibility-fixes"],
    "avoid_when": ["algorithm-heavy", "data-infrastructure"],
    "estimated_tokens": 15000,
    "estimated_time": "30 minutes",
    "team_context": "needed when",
    "dependencies": ["ux-researcher", "accessibility-tester"]
  }
  ```
- **Acceptance**: Profiles for all 45 agents, no missing fields

#### T024 — Dynamic Agent Selection Router
- **Current logic**: Hardcoded 3-agent routing (Claude Code, Codex, Antigravity)
- **New logic**: Query agent-profiles.json + task type + complexity → recommend best 1–3 agents
- **Example**: 
  - Input: "Create a dark mode toggle component"
  - Current: "Antigravity" (too broad)
  - Future: ["ui-designer" (primary), "react-specialist" (implementation), "accessibility-tester" (QA)]
- **Implementation**: Enhanced `routeAgent()` in `lib/orchestration/router.ts`
- **Acceptance**: 
  - Router returns N agents ranked by score
  - Each recommendation includes confidence % and reasoning
  - Supports agent-composition (multi-agent tasks)

#### T025 — Agent Composition Executor
- **Goal**: Wire multiple agents into a single execution plan
- **Example workflow**:
  ```
  1. ui-designer → designs component spec
  2. frontend-developer → implements in React
  3. ui-ux-tester → validates interaction
  4. accessibility-tester → audits a11y
  5. code-reviewer → checks code quality
  ```
- **UI**: Show multi-agent plan as sequential/parallel stages in KanbanBoard
- **Persistence**: `SubAgentTrack` already exists; extend to `AgentCompositionTrack`
- **Acceptance**: 
  - Multi-agent task plan is displayable in `/plan`
  - Each stage shows assigned agent, status, prompt, result
  - Manual approval gate before proceeding to next stage

---

## Phase 7 — UI/Design Excellence (P1)

### Goal
Use ui-designer + ux-researcher + design-bridge to elevate the orchestrator's own interface.

#### T026 — Design System Audit & Refresh
- **Current**: Tailwind + shadcn/ui (functional, not polished)
- **Run**: `/design-bridge` skill on current CLAUDE.md + ARCHITECTURE.md
- **Output**: High-fidelity design system for Agent Control Room itself
- **Acceptance**: 
  - Design system defined (colors, typography, spacing, components)
  - Visual mockups for all key screens (dashboard, plan, kanban, runner)
  - Accessibility audit passed (WCAG AA minimum)

#### T027 — UX Research: PM Mental Model
- **Input**: User (양원민) journey, pain points, current workflows
- **Use**: ux-researcher agent
- **Output**: Journey maps, personas, problem statements
- **Why**: Before designing, validate that UI actually solves PM problems
- **Acceptance**: 
  - User journey documented
  - Top 3 pain points identified with solutions
  - New UI mockups address all pain points

#### T028 — Implement High-Fidelity UI
- **Use**: frontend-developer + ui-designer agents in composition
- **Scope**: Dashboard, Project Detail, Plan View, Kanban Cards, Runner Log
- **Target**: Production-ready styling + animations + responsive layout
- **Acceptance**: 
  - All screens match design system
  - Mobile responsive (tested on 375px, 768px, 1440px)
  - Dark mode support (default + toggle)
  - Performance: Core Web Vitals (LCP <2.5s, FID <100ms, CLS <0.1)

---

## Phase 8 — Quality Assurance at Scale (P1)

### Goal
Automate testing, code review, and accessibility checks for generated code.

#### T029 — Automated Code Review Pipeline
- **Trigger**: After Agent Execution Runner completes
- **Process**: 
  1. Capture git diff
  2. Send diff to code-reviewer agent
  3. Generate review summary (security, performance, style, test coverage)
  4. Display in KanbanCard as collapsible "Code Review" section
- **Acceptance**: 
  - Code review appears within 30s of execution complete
  - Shows issues with severity (critical, warning, info)
  - User can dismiss or create follow-up task

#### T030 — QA Test Generation & Execution
- **Trigger**: Task completion (via analyzer)
- **Process**:
  1. Analyzer identifies what changed (frontend, backend, database)
  2. qa-expert agent generates test cases
  3. Execute tests via npm/pytest/etc.
  4. Show results in KanbanCard
- **Example**: "New user registration form" → QA generates: valid input tests, XSS tests, empty field tests, rate limit tests
- **Acceptance**: 
  - Test cases generated automatically
  - Test results shown in UI
  - Failures create "Fix Tests" tasks

#### T031 — Accessibility Testing Automation
- **Trigger**: UI changes detected
- **Process**:
  1. Diff shows new/modified components
  2. accessibility-tester agent audits (WCAG AA)
  3. Generate accessibility report
  4. Flag violations: missing alt-text, color contrast, keyboard nav, ARIA labels
- **Acceptance**: 
  - Accessibility report generated for UI changes
  - Shows violations with remediation steps
  - Integration with kanban card

---

## Phase 9 — Knowledge Management & Learning (P2)

### Goal
Synthesize execution history into learnings, patterns, and future guidance.

#### T032 — Execution Analysis & Pattern Detection
- **Use**: knowledge-synthesizer, data-analyst agents
- **Input**: All execution logs, session reports, code reviews, test results from Phase 5+
- **Process**:
  1. Analyze: Which agent types succeed at which tasks?
  2. Identify: Common failure patterns (e.g., "UI tasks without ux-researcher fail a11y")
  3. Learn: Build a success/failure matrix: agent × task_type → success_rate
- **Output**: `data/execution-patterns.json` with success metrics
- **Use case**: Future agent selection can be informed by historical success rates
- **Acceptance**: 
  - Pattern analysis runs monthly
  - Success rate matrix updated
  - Agent profiles updated with historical performance

#### T033 — Contextual Prompt Enhancement
- **Use**: context-manager, prompt-engineer agents
- **Goal**: Improve prompt quality over time by including relevant precedents
- **Example**: 
  - User: "Add dark mode"
  - System: Detects similar past task → includes snippet of how ux-researcher helped last time
  - Output: Enhanced prompt with relevant examples
- **Acceptance**: 
  - Past examples surfaced in generated prompts
  - User rates usefulness
  - Incorporation increases task success rate

#### T034 — Auto-Generated Documentation
- **Use**: documentation-engineer agent
- **Trigger**: After each successful execution
- **Process**:
  1. Analyzer provides diff summary + test results + code review
  2. Documentation engineer writes architecture docs, API docs, decision logs
  3. Auto-insert into project's docs/ folder
- **Example**: PR-level documentation generation
- **Acceptance**: 
  - Docs generated and committed alongside code
  - Docs are accurate (validated by user before commit)
  - Project documentation stays in sync with implementation

---

## Phase 10 — Production Infrastructure (P2)

### Goal
Move from local JSON storage to scalable, observable infrastructure.

#### T035 — Supabase Data Model
- **Use**: postgres-pro, data-engineer agents
- **Current**: Local JSON files (feature-plans.json, execution-logs.json, agent-statuses.json)
- **Migrate to**: Supabase with:
  - `feature_plans` (plan_id, project_id, name, status, created_at)
  - `plan_tasks` (task_id, plan_id, agent_id, status, prompt, result, acceptance_criteria)
  - `execution_logs` (log_id, task_id, agent_id, branch_name, stdout, stderr, exit_code)
  - `agent_profiles` (agent_id, specialization, performance_score, last_used)
  - `session_reports` (report_id, project_id, summary, tasks_completed, token_estimate)
- **Acceptance**: 
  - Schema designed + approved by postgres-pro
  - Migrations written
  - JSON → Supabase migration tool created
  - Local storage still works (fallback)

#### T036 — Observability & Metrics
- **Use**: data-analyst, performance-engineer agents
- **Metrics**:
  - Prompt → Execution time
  - Agent utilization by type
  - Task success rate by agent
  - Token/cost tracking
  - Failure reasons (blocked, timeout, approval rejected)
- **Dashboards**:
  - Agent performance leaderboard
  - Task success trends
  - Cost by project
- **Acceptance**: 
  - 5+ key metrics tracked
  - Dashboards visible in `/metrics` page
  - Monthly reports generated

#### T037 — Error Detection & Auto-Recovery
- **Use**: error-detective, debugger agents
- **Trigger**: Task fails or gets blocked
- **Process**:
  1. error-detective analyzes failure logs
  2. Generates root cause hypothesis
  3. Suggests remediation (retry, different agent, manual fix)
  4. debugger provides detailed walkthrough if needed
- **Acceptance**: 
  - Error analysis within 1 minute of failure
  - Root cause identified with confidence %
  - Remediation steps actionable

---

## Phase 11 — Advanced Orchestration (P3)

#### T038 — Parallel Multi-Project Execution
- **Goal**: Orchestrate multiple projects/tasks concurrently
- **Current**: One task at a time
- **New**: Queue system with agent resource limits
- **Acceptance**: Execute 2+ tasks in parallel, respecting agent cooling-down states

#### T039 — Conditional Task Branching
- **Goal**: Data-driven task generation (e.g., if tests fail → auto-create debug task)
- **Use**: workflow-orchestrator agent
- **Acceptance**: 
  - If/then rules for task creation
  - Example: "If code review finds security issue → auto-create remediation task"

#### T040 — Feedback Loop: Session Report → Next Direction
- **Goal**: Analyze session results to automatically suggest next steps
- **Use**: knowledge-synthesizer, project-manager agents
- **Example**: "Last task fixed auth flow, next should be rate limiting"
- **Acceptance**: "Recommended next task" is data-driven, not just hardcoded

---

## Implementation Roadmap (Sequenced)

| Phase | Quarters | Key Tasks | Owner Recommendation |
|-------|----------|-----------|---------------------|
| 6 | Q3 | T023–T025 (Agent Matrix + Composition) | Agent-organizer + Claude Code |
| 7 | Q3 | T026–T028 (UI/Design) | UI-designer + frontend-developer |
| 8 | Q4 | T029–T031 (QA Automation) | QA-expert + code-reviewer |
| 9 | Q4 | T032–T034 (Knowledge Mgmt) | knowledge-synthesizer + documentation-engineer |
| 10 | Q1 2027 | T035–T037 (Production Infrastructure) | postgres-pro + data-engineer |
| 11 | Q2 2027 | T038–T040 (Advanced Orchestration) | workflow-orchestrator + project-manager |

---

## Why This Sequence?

1. **Agent Matrix first** (Phase 6): Unlocks all downstream phases by enabling intelligent multi-agent selection
2. **UI second** (Phase 7): Polish the user experience early; orchestrator must be pleasant to use daily
3. **Quality third** (Phase 8): Add safety/validation before entering production workflows
4. **Knowledge fourth** (Phase 9): Capture learnings from Phases 6–8 to continuously improve routing
5. **Infrastructure fifth** (Phase 10): Once data is valuable, move it to production-ready storage
6. **Advanced last** (Phase 11): Parallel execution and conditional logic only after foundation is solid

---

## Success Criteria by Phase

### Phase 6 Success
- [ ] All 45 agents have capability profiles
- [ ] Router recommends 3 agents (primary + fallback + QA) with confidence %
- [ ] Multi-agent task plan is displayable and executable
- [ ] User prefers agent-composition output over single-agent routing

### Phase 7 Success
- [ ] Design system documented (10+ components defined)
- [ ] All screens updated to match design system
- [ ] WCAG AA accessibility audit passed
- [ ] Mobile responsive on all breakpoints
- [ ] User finds UI more intuitive and pleasant

### Phase 8 Success
- [ ] Code review appears automatically after execution
- [ ] QA tests are generated and run without manual intervention
- [ ] Accessibility violations are caught before commit
- [ ] Task success rate increases (fewer manual fixes needed)

### Phase 9 Success
- [ ] Patterns identified (e.g., "ux-researcher first = higher a11y success")
- [ ] Prompts include relevant historical examples
- [ ] Documentation auto-generated and useful
- [ ] Knowledge base powers agent selection decisions

### Phase 10 Success
- [ ] All data migrated to Supabase
- [ ] Observability dashboards live
- [ ] Error recovery suggestions are actionable
- [ ] System is deployable to Vercel with Supabase backend

### Phase 11 Success
- [ ] 2+ tasks execute in parallel
- [ ] Conditional branching rules work
- [ ] Next task recommendation is data-driven
- [ ] Fully autonomous execution loop (with human approval gates)

---

## Questions for User Prioritization

1. **Which phase resonates most?** (Architecture → UI → Quality → Knowledge → Infrastructure → Advanced)
2. **Which problem is most painful right now?** (Current agent routing too simplistic? UI hard to use? Execution frequently blocked?)
3. **Timeline**: Is T023–T028 doable in Q3 (8 weeks), or should we scope tighter?
4. **Resource**: Should I work on these phases sequentially, or coordinate multiple phases in parallel?
