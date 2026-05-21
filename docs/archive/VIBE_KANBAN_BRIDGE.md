# VIBE_KANBAN_BRIDGE.md — Agent Control Room

## Purpose

This document describes the Vibe Kanban Bridge: the structured handoff layer between Agent Control Room (strategic planning) and Vibe Kanban (execution workbench).

**Key Principle:** Agent Control Room generates Markdown handoff documents for user review. No real API calls or execution are automated at this stage.

---

## What is Vibe Kanban in Agent Control Room?

**Vibe Kanban is the Execution Workbench, not the Product Brain.**

| Component | Owns | Does Not Own |
|-----------|------|--------------|
| **Agent Control Room** | Product intent, roadmap, task decomposition, agent routing, prompts, approval gates, completion reasoning, insight memory | Board UI, workspace lifecycle, agent sessions |
| **Vibe Kanban** | Issue cards, workspace creation, git worktrees, agent sessions, diff/review UI, dev server preview | Product strategy, task decomposition, routing logic, completion criteria |

The bridge enables Agent Control Room to hand off tasks to Vibe Kanban for execution, then optionally import results back for analysis and next-step planning.

---

## Bridge Architecture

### Data Flow

```
Agent Control Room (Planning)
        ↓
  [Bridge Generator]
        ↓
  Markdown Handoff (User Review)
        ↓
  User Approves
        ↓
  Vibe Kanban Workspace (Execution)
        ↓
  [Optional] Import Results Back
        ↓
  Session Report & Next Step
```

### Bridge Layers

1. **Type Layer** (`lib/integrations/vibe-kanban/types.ts`)
   - `WorkspaceHandoff` — Complete session setup
   - `SessionBrief` — Agent briefing before execution
   - `DiffReviewChecklist` — Code review guidance
   - `PreviewReviewChecklist` — UI testing guidance
   - `TaskExecutionPacket` — Task metadata and constraints

2. **Generator Layer** (`lib/integrations/vibe-kanban/bridge.ts`)
   - `generateWorkspaceHandoff()` — Complete workspace handoff
   - `generateSessionBrief()` — Agent briefing
   - `generateDiffReviewChecklist()` — Code review template
   - `generatePreviewReviewChecklist()` — Preview testing template
   - `generateTaskExecutionPacket()` — Task metadata

3. **UI Layer** (Future)
   - Handoff preview pages
   - Workspace launch buttons
   - Result import forms

---

## Bridge Types

### WorkspaceHandoff

Complete handoff for setting up a Vibe Kanban workspace.

```typescript
type WorkspaceHandoff = {
  workspaceName: string;        // "Phase 2: Backend API"
  projectId: string;            // Link back to Agent Control Room project
  sessionName: string;          // "session-2024-05-21-backend-api"
  gitBranch: string;            // "feat/backend-api"
  tasks: Task[];                // All tasks for this session
  instructions: string;         // Setup and execution instructions
  preferredAgent?: AgentType;   // "claude-code" or "codex"
  constraints?: {
    maxTokens?: number;
    maxTimeMinutes?: number;
    timeoutWarningMinutes?: number;
  };
};
```

**Output:** Markdown document with complete workspace setup, task descriptions, acceptance criteria, and constraints.

**When Used:**
- Task ready for handoff to Vibe Kanban
- Multiple related tasks grouped into one session
- User wants to manually create or manage a Vibe Kanban workspace

### SessionBrief

High-level briefing for the AI agent before task execution.

```typescript
type SessionBrief = {
  sessionName: string;          // "session-2024-05-21-backend-api"
  workspaceId: string;          // Vibe Kanban workspace ID
  taskDescription: string;      // What to build
  expectedOutcome: string;      // Deliverable
  allowedFiles: string[];       // Files to modify
  doNotTouchFiles: string[];    // Files to avoid
  priorContext?: string;        // Prior session context
  completedWork?: string[];     // What was already done
  blockers?: string[];          // Known issues
};
```

**Output:** Markdown briefing with task, scope, and context.

**When Used:**
- Session has started in Vibe Kanban
- Agent needs context before beginning work
- Session has dependencies from prior agents

### DiffReviewChecklist

Code review guidance for changed files.

```typescript
type DiffReviewChecklist = {
  filePath: string;             // "src/api/users.ts"
  changeType: "added" | "modified" | "deleted" | "renamed";
  stats?: {
    addedLines: number;
    removedLines: number;
    changedLines: number;
  };
  reviewPoints: {               // What to check
    id: string;
    category: "logic" | "style" | "security" | "performance" | "test" | "docs";
    description: string;
    status: "pending" | "approved" | "flagged" | "needs_discussion";
  }[];
  risksFound: {                 // Issues identified
    id: string;
    severity: "critical" | "high" | "medium" | "low";
    title: string;
    description: string;
    suggestedFix?: string;
  }[];
};
```

**Output:** Markdown review checklist with file-by-file guidance and risk assessment.

**When Used:**
- Agent completes work and creates diffs
- Manual code review needed before merge
- Automated static analysis identified issues

### PreviewReviewChecklist

Testing guidance for a running preview (dev server, build output, etc.).

```typescript
type PreviewReviewChecklist = {
  previewUrl: string;           // "http://localhost:3000"
  functionalTests: {            // Test scenarios
    id: string;
    title: string;
    steps: string[];
    expectedResult: string;
    status: "pending" | "passed" | "failed";
    notes?: string;
  }[];
  uiTests: {                    // UI/UX checks
    id: string;
    title: string;
    description: string;
    checklist: string[];
    status: "pending" | "passed" | "failed";
    notes?: string;
  }[];
  performanceChecks: {          // Metrics
    id: string;
    metric: "page_load" | "bundle_size" | "core_web_vitals" | "memory" | "cpu";
    target: string;
    actual?: string;
    status: "pending" | "passed" | "failed";
    notes?: string;
  }[];
  reviewNotes?: string;
};
```

**Output:** Markdown testing checklist with functional, UI, and performance criteria.

**When Used:**
- New UI or user-facing feature developed
- Dev server preview available
- Before merging to staging or main

### TaskExecutionPacket

Metadata and constraints for a single task.

```typescript
type TaskExecutionPacket = {
  taskId: string;               // Unique ID
  agentType: AgentType | "manual";  // "claude-code", "codex", etc.
  priority: "P0" | "P1" | "P2" | "P3";
  estimatedTokens: number;      // Resource estimate
  estimatedTime: number;        // Time in minutes
  acceptanceCriteria: string[]; // "Done" definition
  forbiddenFiles?: string[];    // Do not touch
  scopeLimitations?: string[];  // Scope boundaries
  knownRisks?: string[];        // Identified issues
  dependsOnTaskId?: string;     // Task dependency
};
```

**Output:** Markdown packet with task metadata, acceptance criteria, and constraints.

**When Used:**
- Detailed task briefing needed
- Token/time budgeting required
- Parallelization planning
- Risk mitigation planning

---

## Workflow

### Step 1: Task Ready for Handoff

Agent Control Room has generated a task and confirmed acceptance criteria.

```
Task State: "ready" or "planned"
↓
User Reviews Task Details
↓
Decide: "Execute Now" or "Send to Vibe Kanban"
```

### Step 2: User Approves Handoff

User clicks "Send to Vibe Kanban" or "Generate Handoff".

```
generateWorkspaceHandoff(input) or generateTaskExecutionPacket(input)
↓
Markdown Handoff Generated
↓
User Reviews Markdown (Copy, Preview, or Export)
```

### Step 3: Vibe Kanban Execution (Manual)

User manually:
1. Creates workspace in Vibe Kanban
2. Pastes generated handoff as issue description
3. Starts session with preferred agent
4. Agent receives SessionBrief

```
[Vibe Kanban Workspace Created]
↓
[Issue/Card Created from Handoff]
↓
[Agent Session Started]
↓
[Agent Receives SessionBrief]
↓
[Execution Begins]
```

### Step 4: Work Completes

Agent finishes, creates diffs, runs tests.

```
[Agent Completes Work]
↓
[Diffs Generated]
↓
[Preview/Tests Run]
↓
DiffReviewChecklist + PreviewReviewChecklist Needed
```

### Step 5: (Optional) Import Results Back

User optionally imports execution result into Agent Control Room.

```
[User Exports Vibe Kanban Result]
↓
[Agent Control Room Imports Diffs & Session Report]
↓
[T019 Diff Analyzer Reviews Changes]
↓
[Completion Judgment & Next Step Recommended]
```

---

## Bridge Generators

### generateWorkspaceHandoff()

**Purpose:** Generate a complete workspace handoff for user review.

**Input:**
```typescript
{
  workspaceName: "Phase 2: Backend",
  projectId: "proj-123",
  sessionName: "session-backend-api",
  gitBranch: "feat/backend-api",
  tasks: [
    {
      id: "task-1",
      title: "Implement User API",
      description: "Create GET /users and POST /users endpoints",
      acceptanceCriteria: [
        "GET /users returns list of users",
        "POST /users creates new user",
        "Tests pass"
      ]
    }
  ],
  instructions: "Follow the API design guide. Use TypeScript. Write tests.",
  preferredAgent: "claude-code"
}
```

**Output:** Markdown document ready for copy-to-clipboard or export.

### generateSessionBrief()

**Purpose:** Generate agent briefing before execution starts.

**Input:**
```typescript
{
  sessionName: "session-backend-api",
  workspaceId: "ws-456",
  taskDescription: "Implement User API with GET and POST endpoints",
  expectedOutcome: "Working endpoints with 100% test coverage",
  allowedFiles: ["src/api/**", "tests/**"],
  doNotTouchFiles: ["src/db/**", "package.json"],
  completedWork: [
    "Database schema defined"
  ]
}
```

**Output:** Markdown briefing ready for agent to read.

### generateDiffReviewChecklist()

**Purpose:** Generate code review guidance for diffs.

**Input:**
```typescript
[
  {
    filePath: "src/api/users.ts",
    changeType: "added",
    stats: { addedLines: 120, removedLines: 0, changedLines: 120 },
    reviewPoints: [
      {
        id: "logic-1",
        category: "logic",
        description: "Endpoint handles errors correctly",
        status: "pending"
      }
    ],
    risksFound: [
      {
        id: "sec-1",
        severity: "high",
        title: "No input validation",
        description: "User email not validated",
        suggestedFix: "Add email format validation"
      }
    ]
  }
]
```

**Output:** Markdown review checklist for manual review.

### generatePreviewReviewChecklist()

**Purpose:** Generate testing guidance for running preview.

**Input:**
```typescript
[
  {
    previewUrl: "http://localhost:3000",
    functionalTests: [
      {
        id: "f1",
        title: "Create User Flow",
        steps: ["Click Create", "Fill Form", "Submit"],
        expectedResult: "User created and list updated",
        status: "pending"
      }
    ],
    uiTests: [
      {
        id: "u1",
        title: "Form Validation",
        description: "Check form displays errors",
        checklist: ["Required field highlighted", "Error message shown"],
        status: "pending"
      }
    ],
    performanceChecks: [
      {
        id: "p1",
        metric: "page_load",
        target: "< 2s",
        status: "pending"
      }
    ]
  }
]
```

**Output:** Markdown testing checklist.

### generateTaskExecutionPacket()

**Purpose:** Generate task metadata and constraints.

**Input:**
```typescript
{
  taskId: "task-1",
  agentType: "claude-code",
  priority: "P0",
  estimatedTokens: 5000,
  estimatedTime: 30,
  acceptanceCriteria: [
    "GET /users endpoint works",
    "POST /users endpoint works",
    "All tests pass"
  ],
  forbiddenFiles: ["src/db/**"],
  scopeLimitations: [
    "No authentication layer",
    "No rate limiting"
  ],
  knownRisks: [
    "Database connection may timeout"
  ]
}
```

**Output:** Markdown packet with task details and constraints.

---

## Current Implementation Status

### Implemented ✅

- `lib/integrations/vibe-kanban.ts` — Basic issue draft conversion
- `toVibeKanbanIssueDraft()` — Convert task to Vibe Kanban issue
- `HttpVibeKanbanClient` and `MockVibeKanbanClient` — HTTP bridge with fallback
- `/api/vibe-kanban/issue` — API route for issue creation (mock-first)
- `SendToVibeKanbanButton.tsx` — UI button to send task

### Ready to Implement (Foundation Complete) ✅

- `lib/integrations/vibe-kanban/types.ts` — Bridge types
- `lib/integrations/vibe-kanban/bridge.ts` — Bridge generators

### Next Steps (Future)

- UI pages for handoff preview and approval
- Workspace launch buttons (if Vibe Kanban API stabilizes)
- Result import forms
- Integration with T019 Diff Analyzer for auto-review
- Obsidian-compatible context pack generation from Vibe Kanban sessions

---

## Important Safety Notes

### No Real Vibe Kanban Execution Yet

**This bridge generates Markdown documents for user review and manual action.**

- `generateWorkspaceHandoff()` → Markdown string (user copy-pastes or exports)
- `generateSessionBrief()` → Markdown string (user shares with agent)
- `generateDiffReviewChecklist()` → Markdown string (user shares in review)
- `generatePreviewReviewChecklist()` → Markdown string (user uses for testing)
- `generateTaskExecutionPacket()` → Markdown string (user shares with agent)

**No automatic Vibe Kanban API calls or workspace creation.**

User must:
1. Review the generated Markdown
2. Manually create or use existing Vibe Kanban workspace
3. Paste handoff as issue description
4. Start session manually
5. (Optional) Import results back into Agent Control Room

### Future Integration Plans

When Vibe Kanban stabilizes or MCP support improves:
- Programmatic workspace creation (requires Vibe Kanban API)
- Automated issue creation (already attempted in `/api/vibe-kanban/issue`)
- Session start API (requires Vibe Kanban support)
- Result polling or webhook integration (future)

Until then, the bridge is **document-generation only**.

---

## Files

| File | Purpose |
|------|---------|
| `lib/integrations/vibe-kanban/types.ts` | Bridge type definitions |
| `lib/integrations/vibe-kanban/bridge.ts` | Markdown generator functions |
| `docs/VIBE_KANBAN_BRIDGE.md` | This document |

---

## Related Documents

- `VIBE_KANBAN_INTEGRATION.md` — Research, decision, and integration strategy
- `ARCHITECTURE.md` — System architecture and component roles
- `HANDOFF.md` — Handoff structure and protocol
- `TASKS.md` — Task decomposition and status machine
