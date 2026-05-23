# Phase 2 Multi-Agent Orchestration + Hermes Insight

## Overview

Phase 1 (Execution Feedback Loop) is complete. Smoke tests pass. Local runner executes. Hermes packets are generated.

Phase 2 builds the **next orchestration recommendation layer**:
- After execution completes, the system generates the next recommended task
- Recommends the best agent for that task
- Decides execution mode (sequential vs. parallel-safe)
- Detects file conflict risk
- Captures Hermes insights from patterns
- Shows everything in PM-friendly Korean

**Goal:** Prepare and recommend the next action. NOT enable uncontrolled autonomous execution.

---

## Implementation Tasks

### T001: Next Task Recommendation Engine
**Input:** 
- ExecutionResultSummary
- DecisionClassification  
- current roadmap task
- roadmap context

**Output:**
```ts
type NextTaskRecommendation = {
  taskId: string;                    // generated ID
  title: string;                     // PM-friendly title in Korean
  goal: string;                      // 한 문장 목표
  recommendedAgent: AgentType;       // 추천 에이전트
  recommendationReason: string;      // 한국어 선택 이유
  riskLevel: RiskLevel;              // safe | low | medium | high | critical
  allowedFiles?: string[];           // 수정 가능한 파일/패턴
  doNotTouchFiles?: string[];        // 절대 건드려선 안 되는 파일
  acceptanceCriteria: string[];      // 완료 기준
  executionMode: "single" | "sequential" | "parallel_safe" | "blocked";
  conflictRisk: "none" | "low" | "medium" | "high";
  shouldAutoRun: boolean;            // always false in Phase 2
  relatedPlanTaskId?: string;        // 연관된 roadmap task ID
};
```

**Rules:**
1. pass → generate next roadmap task
2. fail → generate Claude Code fix task or Codex QA task
3. qa_needed → generate Codex QA task  
4. retry_needed → generate retry task with same agent
5. blocked → generate manual review task
6. drift_detected → generate Hermes drift analysis task
7. manual_review → escalate to user with decision request

**File Location:** `lib/orchestration/next-task-generator.ts`

**Tests:**
- Decision mapping (each decision type generates correct task)
- Agent assignment correctness
- Risk level assignment
- File boundary respect

---

### T002: Agent Router Enhancement
**Input:**
- NextTaskRecommendation
- task type
- risk level

**Output:**
```ts
type AgentRoutingDetail = {
  agent: AgentType;
  reason: string;                 // 한국어 선택 이유
  capabilities: string[];         // e.g. "테스트 작성", "UI 개선"
  restrictions: string[];         // e.g. "자동 실행 불가", "승인 필수"
  canAutoRun: boolean;           // always false for Codex/Antigravity
};
```

**Rules:**
- Claude Code: implementation, architecture, complex logic, runner/approval integration
- Codex: tests, QA, regression, bug isolation, safety verification
- Antigravity: UI/UX, visual layout, Korean copy
- Hermes: monitoring, insights, drift detection
- Codex/Antigravity: must NOT auto-run unless verified stable

**Improvement:** Add reasoning output for PM visibility

**File Location:** `lib/orchestration/agent-router-enhanced.ts` or enhance existing

---

### T003: Parallel Safety Decision Engine
**Input:**
- NextTaskRecommendation (current)
- NextTaskRecommendation (potentially following task)
- roadmap context

**Output:**
```ts
type ParallelSafetyDecision = {
  mode: "single" | "sequential" | "parallel_safe" | "blocked";
  reason: string;                 // 한국어 설명
  conflictRisk: "none" | "low" | "medium" | "high";
  conflictingFiles: string[];     // 겹치는 파일들
  recommendation: string;         // PM-friendly Korean advice
};
```

**Conflict Detection Rules:**
1. Same file target → sequential
2. Shared type files → sequential  
3. runner/approval/risk logic → sequential
4. UI-only vs. backend files → parallel_safe (if no shared types)
5. Unknown/ambiguous files → sequential

**File Location:** `lib/orchestration/parallel-safety-decider.ts`

**Tests:**
- Same file detection
- Type file detection
- Safe parallel scenarios
- Unsafe parallel scenarios

---

### T004: Hermes Insight Recorder
**Input:**
- ExecutionResultSummary
- DecisionClassification
- execution history (from storage)

**Output:**
```ts
type HermesInsight = {
  id: string;
  createdAt: string;
  source: "execution_result" | "decision" | "drift" | "failure_pattern";
  summary: string;                // 한국어 요약
  evidence: string[];             // 증거/데이터
  recommendation: string;         // 추천 액션
  severity: "info" | "warning" | "critical";
  relatedTaskId?: string;
  relatedPlanId?: string;
  patternType?: "repeated_failure" | "drift" | "performance_regression" | "auth_issue";
};
```

**Insight Generation Rules:**
1. Repeated failures (3+ in same area) → critical warning
2. Drift from task allowedFiles → drift_detected insight
3. File boundary violations → critical security insight
4. Hermes packet suggests drift → add insight
5. >2 retries same agent → warning about approach

**File Location:** `lib/hermes/insight-recorder.ts`

**Storage:** Use existing storage layers (JSON for now, Supabase later)

---

### T005: Orchestration UI Integration
**Display Locations:**
1. Workbench result area (after execution)
2. `/orchestration` OrchestrationDecision tab
3. `/plan` YourNextMove section

**Show:**
- 다음 추천 작업: [title]
- 추천 에이전트: [agent] 
- 선택 이유: [reason in Korean]
- 위험도: [risk level]
- 추천 실행 방식: [sequential | parallel_safe | blocked]
- 충돌 위험: [conflict risk + explanation]
- Hermes 인사이트: [insights if any]

**Components:**
- `<NextTaskRecommendationCard />` - shows single recommendation
- `<OrchestrationDecisionPanel />` - shows full decision with reasoning
- `<HermesInsightPanel />` - shows insights in context

**File Location:** `app/components/orchestration/` (new folder)

---

### T006: Integration & Safety Testing
**Checklist:**
- [ ] No auto-run is enabled
- [ ] Approval gate is preserved
- [ ] File boundary validation is intact
- [ ] Forbidden commands remain blocked
- [ ] Hermes role is unchanged (supervisor only)
- [ ] typecheck passes
- [ ] lint passes
- [ ] build passes
- [ ] smoke:e2e:dry passes
- [ ] New unit tests pass for each module
- [ ] No token limit exceeded

**Safety Rules to Verify:**
```md
✅ No automatic chained execution
✅ No uncontrolled multi-agent parallel execution
✅ No Telegram approval
✅ No production deploy
✅ No GitHub PR automation
✅ No Supabase durable storage in this phase
✅ No Obsidian sync
✅ Approval gate enforced
✅ Approval token validation intact
✅ cwd validation intact
✅ Command sanitization intact
✅ File boundary validation intact
✅ Risk classifier enforced
✅ Forbidden command policy enforced
✅ Hermes supervisor-only role enforced
```

---

## Implementation Order

1. **T001:** Next Task Recommendation Engine (foundation)
2. **T002:** Agent Router Enhancement (builds on T001)
3. **T003:** Parallel Safety Decision Engine (independent, can run after T001)
4. **T004:** Hermes Insight Recorder (independent)
5. **T005:** UI Integration (builds on T001-T004)
6. **T006:** Integration & Safety Testing

---

## Success Criteria for Phase 2

### Functional
- [ ] Next task generator produces typed recommendations for all decision types
- [ ] Agent router explains why each agent was selected
- [ ] Parallel safety decider prevents file conflicts
- [ ] Hermes insights capture repeated patterns
- [ ] UI shows PM-friendly Korean recommendations

### Safety
- [ ] All safety rules remain intact
- [ ] No auto-execution enabled
- [ ] Approval gates preserved
- [ ] File boundaries respected
- [ ] Hermes remains supervisor-only

### Quality
- [ ] All checks pass (typecheck, lint, build)
- [ ] smoke:e2e:dry passes
- [ ] New unit tests for core logic
- [ ] No regressions in existing functionality

### Documentation
- [ ] Type definitions clearly describe all new structures
- [ ] Korean explanations are PM-friendly (not technical jargon)
- [ ] Architecture updated to include Phase 2 layer

---

## Risk Assessment

**Low Risk:**
- Next task generation (pure function, no execution)
- Type/interface additions
- UI display (no behavior change)

**Medium Risk:**
- Agent router changes (could affect routing logic if buggy)
- Parallel safety logic (must not enable false positives)
- Insight generation (must not block legitimate tasks)

**Mitigation:**
- Extensive unit tests for each module
- Manual testing of orchestration flow
- Validation of agent selection rules
- Safety test to verify no forbidden commands are unblocked

---

## Next Phase (Phase F)

After Phase 2 is stable:
- Connect packet generation to live runner completion
- Add Hermes insight persistence to storage
- Explore Obsidian sync (backlog)
- Explore remote Hermes execution (backlog)
