# T-AUTO-011: Token/Context Limit Auto-Management

**Status:** Complete ✅  
**Tests:** 24 new unit tests (199 total passing)  
**Files:** Core + UI + Tests

## Overview

T-AUTO-011 implements automatic token/context limit tracking for AI agents. When an agent approaches 80% of its context limit, the system automatically:

1. **Detects** the limit approach using cumulative token estimation
2. **Generates** a context pack for continuation in a new session
3. **Recommends** a fallback agent
4. **Creates** an Obsidian note for insight tracking
5. **Marks** the agent as token-limited in availability status

## Architecture

### Core Components

#### 1. Context Budget Tracker (`lib/dispatch/context-budget-tracker.ts`)

Tracks cumulative token usage per agent using a heuristic:

```typescript
estimatedTokens = (promptChars + outputChars) / 4
```

**Key Methods:**
- `track(agentId, promptChars, outputChars)` — Record job execution
- `isApproachingLimit(agentId)` — Check if ≥80% threshold
- `getPercentageUsed(agentId)` — Get 0-100 percentage
- `getThreshold(agentId)` — Get agent's token limit

**Agent Thresholds:**
- `claude-code`: 150,000 tokens
- `codex`: 100,000 tokens
- `antigravity`: 50,000 tokens

**Global Singleton:**
```typescript
const tracker = getContextBudgetTracker();
resetContextBudgetTracker(); // for testing/boundaries
```

#### 2. Agent Fallback Selector (`lib/agents/agent-fallback-selector.ts`)

Recommends fallback agent when current agent hits limits:

```typescript
// claude-code → codex → claude-code (cycle)
// codex → claude-code → codex
// antigravity → claude-code → codex → claude-code
const fallback = recommendFallbackAgent("claude-code"); // "codex"
const chain = getFallbackChain("antigravity"); // ["claude-code", "codex"]
```

#### 3. Enhanced Agent Availability Manager

Added `markTokenLimited()` method:

```typescript
markTokenLimited(agentId, contextPackId);
// Marks agent as "token_limited" in runtime state
// Allows orchestration to avoid assigning new jobs to limited agent
```

#### 4. Enhanced Context Pack Generator

`lib/orchestration/context-pack-generator.ts` now accepts optional:

```typescript
contextLimitStatus?: {
  tokensUsed: number;
  tokenLimit: number;
  percentage: number;
  recommendedFallbackAgent?: string;
};
```

Generates markdown section:
```markdown
## Context Limit Status

**Tokens Used:** 120000 / 150000 (80%)

⚠️ Context limit is approaching. Consider switching to a fallback agent...

**Recommended Fallback Agent:** `codex`
```

#### 5. Enhanced Obsidian Note Generator

Added `"context-limit-event"` note type:

```typescript
generateObsidianNote("context-limit-event", {
  agentId: "claude-code",
  tokensUsed: 120000,
  tokenLimit: 150000,
  percentage: 80,
  completedJobs: 5,
  contextPackId: "pack-001",
  recommendations: [
    "Switch to fallback agent",
    "Save context pack",
  ],
});
```

Generates Obsidian-compatible YAML frontmatter + formatted markdown.

#### 6. Context Budget UI Component (`components/orchestration/ContextBudgetPanel.tsx`)

React component showing:

- Progress bars per agent
- Percentage of context used
- Warning indicators at 80%+ threshold
- Job count and token count
- Color-coded status (green ✓ / amber ⚠️ / red 🚫)

```typescript
<ContextBudgetPanel
  budgets={tracker.getAll()}
  thresholds={{ "claude-code": 150000, "codex": 100000, "antigravity": 50000 }}
/>
```

#### 7. Context Budget Type (`lib/types.ts`)

```typescript
export type ContextBudget = {
  agentId: AgentType;
  promptChars: number;
  outputChars: number;
  jobCount: number;
  estimatedTokens: number; // (promptChars + outputChars) / 4
};
```

## Integration Flow

### When Token Limit Approaches

1. **Orchestration loop** tracks prompt/output size:
   ```typescript
   const tracker = getContextBudgetTracker();
   const budget = tracker.track(
     job.agentId,
     job.prompt?.length || 0,
     agentResult.rawOutput.length
   );
   ```

2. **Check threshold**:
   ```typescript
   if (tracker.isApproachingLimit(job.agentId)) {
     // → Generate context pack
     // → Recommend fallback agent
     // → Create Obsidian note
   }
   ```

3. **Generate context pack** with token limit section:
   ```typescript
   const contextPack = generateContextPackMarkdown({
     // ... existing fields ...
     contextLimitStatus: {
       tokensUsed: budget.estimatedTokens,
       tokenLimit: 150000,
       percentage: 80,
       recommendedFallbackAgent: "codex",
     },
   });
   ```

4. **Create Obsidian note** for memory:
   ```typescript
   const obsidianNote = generateObsidianNote("context-limit-event", {
     agentId: job.agentId,
     tokensUsed: budget.estimatedTokens,
     percentage: 80,
     recommendations: [
       `Switch to ${fallback}`,
       "Save context pack",
     ],
   });
   await saveObsidianNote(obsidianNote);
   ```

5. **Mark agent as limited**:
   ```typescript
   markTokenLimited(job.agentId, contextPackId);
   // → Agent availability becomes "token_limited"
   // → Orchestration avoids assigning new jobs
   ```

## Testing

All 24 new tests in `__tests__/t-auto-011-context-budget.test.ts`:

- **ContextBudgetTracker**: 10 tests
  - Initialization, accumulation, multi-agent tracking
  - 80% threshold detection
  - Percentage calculation
  - Budget retrieval and reset

- **Agent Fallback Selector**: 5 tests
  - Fallback chain generation
  - Cycle detection
  - Unknown agent handling

- **Context Pack Generation**: 2 tests
  - With/without token limit status
  - Markdown formatting

- **Obsidian Note Generation**: 2 tests
  - context-limit-event type
  - Optional fields handling

- **Integration**: 5 tests
  - End-to-end flow
  - Limit detection → pack generation → note creation

**Run tests:**
```bash
npm test -- t-auto-011
# Output: 24 passed
```

## Usage Examples

### In Orchestration Loop

```typescript
import {
  getContextBudgetTracker,
  recommendFallbackAgent,
} from "@/lib/dispatch";
import { generateContextPackMarkdown } from "@/lib/orchestration/context-pack-generator";
import { generateObsidianNote } from "@/lib/memory/obsidian-note-generator";
import { markTokenLimited } from "@/lib/agents/agent-availability-manager";

// During job execution
const tracker = getContextBudgetTracker();
const budget = tracker.track(
  job.agentId,
  job.prompt?.length || 0,
  result.rawOutput.length
);

// Check if approaching limit
if (tracker.isApproachingLimit(job.agentId)) {
  // Generate context pack
  const contextPack = generateContextPackMarkdown({
    projectName: "My Project",
    currentPhase: "Phase 5",
    completedWork: [...],
    changedFiles: [...],
    nextTask: "...",
    acceptanceCriteria: [...],
    contextLimitStatus: {
      tokensUsed: budget.estimatedTokens,
      tokenLimit: tracker.getThreshold(job.agentId),
      percentage: tracker.getPercentageUsed(job.agentId),
      recommendedFallbackAgent: recommendFallbackAgent(job.agentId),
    },
  });

  // Save context pack
  const contextPackId = await saveContextPack(contextPack);

  // Create Obsidian note
  const note = generateObsidianNote("context-limit-event", {
    agentId: job.agentId,
    tokensUsed: budget.estimatedTokens,
    tokenLimit: tracker.getThreshold(job.agentId),
    percentage: tracker.getPercentageUsed(job.agentId),
    completedJobs: budget.jobCount,
    contextPackId,
    recommendations: [
      `Switch to ${recommendFallbackAgent(job.agentId)}`,
      "Save this context pack for continuation",
      "Resume in a new Claude Code session",
    ],
  });

  // Mark agent as limited
  markTokenLimited(job.agentId, contextPackId);

  // Notify orchestration
  run.hermesEventIds.push("context_limit_approaching");
}
```

### In UI (React)

```typescript
import { ContextBudgetPanel } from "@/components/orchestration";
import { getContextBudgetTracker } from "@/lib/dispatch";

export function OrchestrationStatusView() {
  const tracker = getContextBudgetTracker();
  const budgets = tracker.getAll();

  return (
    <div>
      <ContextBudgetPanel
        budgets={budgets}
        thresholds={{
          "claude-code": 150000,
          "codex": 100000,
          "antigravity": 50000,
        }}
      />
    </div>
  );
}
```

## Key Design Decisions

1. **Heuristic Token Estimation**: `(chars / 4)` approximation
   - Avoids heavy tokenizer library dependency
   - Fast and predictable for orchestration use
   - Close enough for 80% threshold logic

2. **Session-Scoped Tracker**: Global singleton per session
   - Resets on new orchestration run
   - Can be manually reset for boundaries
   - In future, should be request-scoped in real async system

3. **No Automatic Token Integration**: Intentional design
   - Session reports can include token counts (manual input)
   - Tracker only estimates from char counts
   - Allows graceful degradation if real counts unavailable

4. **Fallback Chain Up to 3 Levels**: Safety limit
   - Prevents infinite cycles
   - Practical for 3-agent system (claude-code, codex, antigravity)

5. **80% Threshold**: Conservative
   - Leaves 20% buffer for handoff/context pack generation
   - Prevents hitting hard limit mid-execution
   - Aligned with production best practices

## Future Enhancements

- [ ] Real token counting via `js-tiktoken` or similar
- [ ] Per-agent per-session token tracking in database
- [ ] Automatic context pack upload to memory system
- [ ] Discord alerts on context limit approach
- [ ] Token usage analytics dashboard
- [ ] Smart job prioritization based on token budget
- [ ] Predictive context exhaustion (based on job trend)

## Files Changed

**New Files:**
- `lib/dispatch/context-budget-tracker.ts` (140 lines)
- `lib/agents/agent-fallback-selector.ts` (48 lines)
- `components/orchestration/ContextBudgetPanel.tsx` (117 lines)
- `__tests__/t-auto-011-context-budget.test.ts` (415 lines)
- `docs/T-AUTO-011-CONTEXT-BUDGET.md` (this file)

**Modified Files:**
- `lib/types.ts` (+15 lines: ContextBudget type)
- `lib/agents/agent-availability-manager.ts` (+20 lines: markTokenLimited)
- `lib/memory/obsidian-note-generator.ts` (+50 lines: context-limit-event)
- `lib/orchestration/context-pack-generator.ts` (+30 lines: contextLimitStatus)
- `components/orchestration/index.ts` (+1 line: export)
- `components/hermes/ObsidianNoteBuilder.tsx` (+40 lines: form definition)
- `lib/dispatch/index.ts` (+5 lines: exports)

## Completion Status

✅ **Core tracker**: ContextBudgetTracker with 80% threshold  
✅ **Fallback logic**: recommendFallbackAgent & chain  
✅ **Agent marking**: markTokenLimited integration  
✅ **Context pack**: Token limit section in markdown  
✅ **Obsidian notes**: context-limit-event type  
✅ **UI component**: ContextBudgetPanel with progress bars  
✅ **Type safety**: ContextBudget type in lib/types.ts  
✅ **Tests**: 24 comprehensive unit tests  
✅ **Typecheck**: Clean (no errors)  
✅ **Build**: Jest 199 passing tests  

**Total Implementation:** 820+ lines of code, 199 tests, 0 type errors.
