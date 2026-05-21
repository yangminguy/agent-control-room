# HERMES Integration Roadmap

**Document Version:** 1.0  
**Last Updated:** 2026-05-21  
**Status:** Analysis + Planning (No Implementation)  
**Audience:** Product Owner, PM, Documentation Engineer

---

## Executive Summary

Hermes is an AI background worker designed to extract insights, manage memory, and generate structured documentation from Agent Control Room execution. Unlike primary agents (Claude Code, Codex, Antigravity), Hermes does not implement features—it preserves and synthesizes development knowledge.

This roadmap defines three safe integration patterns that progressively enable Hermes to participate in the core control-tower loop: **Pattern A (Static Generator)**, **Pattern B (Manual CLI)**, and **Pattern C (Subprocess Integration)**. Each pattern is scoped, time-bounded, and includes explicit safety boundaries.

**Current State:** Pattern A (static generator) is complete and in production. Pattern B and C are documented for future phases.

---

## 1. Current State Analysis

### 1.1 What Hermes Is Today

Hermes is currently deployed as a **read-only generator framework** with these capabilities:

| Capability | Status | Implementation | Safety |
|---|---|---|---|
| Markdown generation (6 packet kinds) | ✅ Complete | `lib/hermes/packet-generators.ts` | Pure function, no side effects |
| JSON export | ✅ Complete | `lib/hermes/json-exporter.ts` | Serialization only |
| UI for preview/copy | ✅ Complete | `/hermes-packets` page | User-triggered, no automation |
| Obsidian note builder | ✅ Complete | `lib/hermes/obsidian-note-generator.ts` | Template + user edit |
| CLI invocation | ❌ Not implemented | N/A | Not in scope yet |
| Subprocess spawning | ❌ Not implemented | N/A | Not in scope yet |
| File system write | ❌ Not implemented | N/A | Safety boundary |
| Autonomous execution | ❌ Not implemented | N/A | Safety boundary |

### 1.2 Hermes Packet Kinds (6 Types)

Hermes generates six kinds of structured packets:

1. **Session Summary** — Short recap of what an AI tool did in one work session
2. **Context Pack** — Full state transfer when a session becomes long or blocked
3. **Handoff Pack** — Structured transfer from one agent to another
4. **Failed Task Review** — Analysis of why a task failed and recovery options
5. **Background Research** — Pre-work summary (architecture, dependencies, risks)
6. **Obsidian Note** — Long-form insight memory in Markdown (7 subtypes)

### 1.3 Current Workflow (Pattern A: Static Generator)

```
User action (e.g., session report save)
    ↓
Hermes Agent Card on /plan page
    ↓
Click "View Hermes Packets" or navigate to /hermes-packets
    ↓
Select packet kind (dropdown)
    ↓
Generator function runs (pure function, no side effects)
    ↓
Markdown rendered in UI
    ↓
User: Copy to clipboard OR export as JSON
    ↓
User: Manually create Obsidian note OR paste into handoff doc
```

**Characteristics:**
- No automation
- Zero risk of unintended changes
- Requires user decision at each step
- Copy-paste workflow (low friction, explicit)

### 1.4 Components in Current Implementation

**UI Components:**
- `components/hermes/HermesMonitorPanel.tsx` — Status widget on `/plan`
- `components/hermes/PackTabs.tsx` — Packet kind selector
- `components/hermes/MarkdownRenderer.tsx` — Preview with copy button
- `components/hermes/ObsidianNoteBuilder.tsx` — Note template editor

**Generator Functions:**
- `lib/hermes/packet-generators.ts` — Core generators (6 kinds)
- `lib/hermes/obsidian-note-generator.ts` — Note subtypes (7 types)
- `lib/hermes/json-exporter.ts` — JSON serialization

**Data Storage:**
- `data/hermes-task-packets.json` — Example seed data
- No persistent storage (yet); all data is transient

**Safety Notice:**
- `/hermes-packets` page displays: "Hermes is not executed. All outputs are generated locally and require user approval before use."

---

## 2. Integration Point Map

Hermes can integrate at three critical junctures in the control-tower loop. Each integration point has distinct user needs, safety requirements, and implementation complexity.

### 2.1 Integration Point A: After Session Report Save

**Where it occurs:**
- User completes a work session with an AI agent (Claude Code, Codex, etc.)
- User fills out `/reports` session report form (what was attempted, what succeeded, what failed)
- User clicks "Save Report"

**Hermes role:**
- Auto-generate a **Session Summary** packet from the report metadata
- Suggest 1-2 follow-up memory notes (Obsidian note subtypes)
- Offer quick export to clipboard or file

**Current workflow:**
```
Session report saved
    ↓
User must navigate to /hermes-packets
    ↓
Select "Session Summary" kind
    ↓
Packet generated manually
```

**Proposed workflow (Pattern B/C):**
```
Session report saved
    ↓
Hermes auto-generates session summary
    ↓
UI shows: "Summary ready. Copy to clipboard? Or save to Obsidian?"
    ↓
User approves handoff OR dismisses
```

**Expected time saved:** 30-60 seconds per session (navigation + selection)

**Risk level:** LOW (same generation logic, just auto-triggered)

---

### 2.2 Integration Point B: After Result Classification

**Where it occurs:**
- User reviews execution results at `/result-review` page
- User classifies result as: Success, Partial Success, Failed, Blocked, User Input Needed
- User clicks "Save Classification"

**Hermes role:**
- Auto-suggest which **Obsidian note subtype** matches the classification
  - Success → "Completed Feature" or "Bug Fixed"
  - Partial Success → "Partial Implementation" or "Dependency Found"
  - Failed → "Failed Attempt" or "Blocker Identified"
  - Blocked → "Blocker Identified"
  - User Input Needed → "Design Decision Needed"
- Generate a pre-filled note template
- Allow user to edit + save directly to memory

**Current workflow:**
```
Result classified
    ↓
User navigates to /memory page
    ↓
User manually creates note (type, title, content)
```

**Proposed workflow (Pattern B/C):**
```
Result classified
    ↓
Hermes suggests: "This looks like a Failed Attempt. Create a note?"
    ↓
UI shows: Pre-filled template + edit form
    ↓
User edits + clicks "Save to Memory"
    ↓
Note stored as Obsidian MD file (or JSON, then exported)
```

**Expected impact:** Consistent taxonomy of memory notes, faster capture

**Risk level:** LOW-MEDIUM (reading classifications + suggesting types)

---

### 2.3 Integration Point C: During Context Pack Generation

**Where it occurs:**
- User is about to handoff work to a new agent (e.g., token limit reached, complexity spike)
- User navigates to `/context-pack` page or clicks "Generate Context Pack" button
- User fills out: Summary of completed work, blockers, next steps

**Hermes role:**
- Scan previous Obsidian notes and failed tasks
- Auto-inject relevant summaries into the context pack
- Suggest memory-driven next steps (e.g., "Based on previous attempts, avoid approach X")
- Recommend agent fallback (if preferred agent is blocked)

**Current workflow:**
```
Context pack form opened
    ↓
User manually writes: completed work, blockers, next steps
    ↓
User generates + copies prompt
```

**Proposed workflow (Pattern C):**
```
Context pack form opened
    ↓
Hermes queries: previous notes + failed tasks
    ↓
UI auto-fills: "Completed Work" field with summaries
    ↓
UI shows: "Failed attempts to avoid" section
    ↓
User reviews + edits as needed
    ↓
User generates prompt
```

**Expected impact:** Reduced context loss, faster context packs, better decision-making

**Risk level:** MEDIUM (reading + inserting suggestions, but user always reviews)

---

## 3. Safe Integration Patterns

### 3.1 Pattern A: Static Generator (Current, Production)

**Definition:** User triggers generation explicitly; Hermes outputs Markdown; user decides what to do with it.

**Workflow:**
```
User clicks "Generate Hermes Packet"
    ↓
Pure function generator runs
    ↓
Markdown rendered in UI
    ↓
User: copy to clipboard, export JSON, or dismiss
    ↓
User manually creates note, pastes into doc, etc.
```

**Implementation:**
- UI button/page (`/hermes-packets`)
- Generator functions (already built)
- No automation
- No file writes
- No subprocess calls

**Automation level:** 0% (fully manual)

**Safety guarantees:**
- ✅ No unintended file modifications
- ✅ No autonomous decisions
- ✅ No token spending without user awareness
- ✅ 100% user approval before any action
- ✅ Rollback: User simply doesn't copy/paste

**Hermes CLI required?** No

**Current status:** ✅ Complete and in production

**Examples:**
- `/hermes-packets` page with packet kind selector
- `/memory` page with "Generate" button for each note type
- Session report page: "Generate Session Summary" button

---

### 3.2 Pattern B: Manual CLI with Paste-Back (Future, Phase 11+)

**Definition:** User manually runs Hermes CLI on their machine; Control Room imports the result.

**Workflow:**
```
User in Control Room sees: "Export to Hermes CLI" button
    ↓
User clicks → JSON prompt copied to clipboard
    ↓
User opens terminal on their machine
    ↓
User runs: hermes run --input <prompt>
    ↓
Hermes CLI outputs: Markdown result (stdout)
    ↓
User copies result
    ↓
User returns to Control Room → "Import Hermes Result" form
    ↓
User pastes Markdown
    ↓
Control Room parses + saves as Obsidian note or memory entry
```

**Implementation approach:**
- UI: Export button (Copy to clipboard)
- CLI script/guide: README in `docs/HERMES_CLI_MANUAL.md`
- UI: Import form (paste Markdown, select type)
- Parser: `lib/hermes/markdown-parser.ts` (extracts frontmatter, sections)
- Storage: Save to memory system (JSON or Obsidian-compatible format)

**Automation level:** 50% (partial automation; CLI is still user-triggered)

**Safety guarantees:**
- ✅ User controls CLI execution (must run manually)
- ✅ User reviews result before pasting back
- ✅ No autonomous subprocess calls
- ✅ Control Room never spawns child processes
- ✅ Rollback: User simply doesn't paste result

**Hermes CLI required?** Yes, must be installed by user locally

**Prerequisite:** `docs/HERMES_CLI_INSTALLATION_SPIKE.md` (validate Hermes CLI setup steps)

**Implementation time:** 2-3 days

**Risk analysis:**
| Risk | Level | Mitigation |
|------|-------|-----------|
| User loses Hermes CLI result | LOW | User can re-run CLI |
| Markdown parse fails | LOW | Fallback: Manual edit form |
| Token cost surprises | MEDIUM | Document Hermes pricing upfront |
| Complexity (too many steps) | MEDIUM | Provide copy-paste script snippets |

---

### 3.3 Pattern C: Subprocess Integration with Approval Gate (Future, Phase 13+)

**Definition:** Control Room spawns Hermes CLI subprocess after user approval; result auto-imported.

**Workflow:**
```
User clicks: "Run Hermes Analysis" button
    ↓
Control Room shows: "This will call Hermes CLI on the server. Approve? [Yes/No]"
    ↓
User clicks: "Yes"
    ↓
Control Room spawns: child_process.spawn('hermes', [...args])
    ↓
Hermes runs on server (not user's machine)
    ↓
Result streamed back to browser (SSE or WebSocket)
    ↓
Markdown rendered
    ↓
User clicks: "Save to Memory" or "Dismiss"
    ↓
Note stored in Control Room memory system
```

**Implementation approach:**
- API endpoint: `app/api/hermes/execute/route.ts` (POST, spawns subprocess)
- Approval UI: Modal before execution (per request)
- Streaming: SSE or WebSocket for real-time feedback
- Subprocess runner: `lib/hermes/subprocess-runner.ts`
- Safety layer: `lib/hermes/sandbox-config.ts` (resource limits, timeout, env isolation)

**Automation level:** 90% (mostly automatic; requires per-action approval)

**Safety guarantees:**
- ✅ Per-action approval gate (cannot auto-run)
- ✅ Subprocess sandboxing (resource limits, env isolation)
- ✅ Timeout enforcement (3-min max per call)
- ✅ No file system write (result only saved via Control Room)
- ✅ Token limits tracked + displayed to user

**Hermes CLI required?** Yes, must be installed on server

**Prerequisite:** Separate Epic T032+ (subprocess safety research)

**Implementation time:** 3-5 days (complex sandboxing logic)

**Risk analysis:**
| Risk | Level | Mitigation |
|------|-------|-----------|
| Subprocess escapes sandbox | HIGH | SELinux/AppArmor rules + cgroup limits |
| Token exhaustion | MEDIUM | Pre-call token estimate + budget display |
| Long-running Hermes hangs | MEDIUM | 3-min timeout, graceful kill |
| Server resource spike | MEDIUM | Rate limiting (1 call / 5 sec per user) |
| Token leakage to Hermes env | MEDIUM | Explicit env allowlist (no API keys) |

---

## 4. Safety Boundaries

Hermes **must never** do any of the following:

### Autonomous Code Execution
❌ Create or modify files in the project repo (except memory notes in designated folder)  
❌ Run `npm install`, `npm run build`, or any build commands  
❌ Execute arbitrary shell commands  
❌ Create or merge git commits  
❌ Push to git branches  

**Rationale:** Hermes is a memory/monitor worker, not an implementation agent. File changes are Claude Code/Codex's job.

### Database & Deployment Mutations
❌ Perform database migrations  
❌ Modify `.env` or secrets  
❌ Trigger deployment pipelines  
❌ Modify GitHub workflow files  
❌ Create or modify infrastructure-as-code files  

**Rationale:** Irreversible operations require human approval + specialized tools.

### Autonomous Decisions Without Approval
❌ Automatically create notes without showing to user first  
❌ Auto-merge or auto-commit anything  
❌ Change task status in roadmap without user button click  
❌ Recommend agent switch without user confirmation  
❌ Spend tokens on external APIs without explicit user action  

**Rationale:** Agent Control Room is a **control tower**, not an autonomous agent.

### Financial/Token Risks
❌ Spend tokens on Hermes API calls without user awareness  
❌ Make bulk requests without rate limiting  
❌ Generate unbounded context packs (must truncate + warn)  
❌ Call external APIs beyond Hermes's API  

**Rationale:** User pays for every token; cost must be transparent.

### System-Level Access
❌ Write to arbitrary file system locations  
❌ Access environment variables (except allowlisted ones)  
❌ Read project files outside the project root  
❌ Access other projects' data  

**Rationale:** Multi-project isolation; data privacy.

---

## 5. Implementation Roadmap

### 5.1 Phase 1: Enhanced Markdown Generators (Phase 11 or Later, Optional)

**Goal:** Improve existing Hermes generator quality without changing the integration model.

**Why:** Current generators are functional but basic. Better output reduces user editing time.

**Work items:**
- Expand `lib/hermes/packet-generators.ts`:
  - Session Summary: Add metadata (duration, token usage estimate, files changed count)
  - Context Pack: Add "Completed Work" subsection with bullet points
  - Failed Task Review: Add "Avoid" section with specific anti-patterns
  - Handoff Pack: Add "Acceptance Criteria" section
- Improve `lib/hermes/obsidian-note-generator.ts`:
  - Add frontmatter metadata (date, tags, related tasks, status)
  - Add template variations (short vs. detailed)
- Enhance type system in `lib/hermes/types.ts`:
  - Add optional metadata fields for richer context

**Files to modify:**
- `lib/hermes/packet-generators.ts` (~300 lines → ~500 lines)
- `lib/hermes/obsidian-note-generator.ts` (~150 lines → ~250 lines)
- `lib/hermes/types.ts` (extend types, no breaking changes)
- `components/hermes/MarkdownRenderer.tsx` (no changes; still renders Markdown)

**Files to create:**
- `lib/hermes/templates/packet-templates.ts` (template strings)
- `lib/hermes/templates/obsidian-templates.ts` (note templates)

**Dependencies:** None (pure improvement)

**Approval required?** No (code review via PR)

**Time estimate:** 1-2 days

**Risk level:** LOW (existing Pattern A workflow unchanged; only output improves)

**Success criteria:**
- All generators produce richer output
- All tests pass
- User feedback: "Outputs are more useful, less manual editing"

**Decision gate before Phase 2:** None (can proceed independently)

---

### 5.2 Phase 2: Manual CLI Paste-Back Integration (Phase 12+)

**Goal:** Enable users to run Hermes CLI locally and import results back into Control Room.

**Why:** Allows token spending to happen on user's budget (if using local Hermes setup); reduces dependency on server-side Hermes.

**Prerequisite:** Phase 1 complete + `docs/HERMES_CLI_INSTALLATION_SPIKE.md` validated

**Work items:**

**A. Export UI (Control Room → CLI)**
- `/context-pack` page: Add "Export for Hermes CLI" button
- Button action: Generate JSON prompt → Copy to clipboard
- Prompt format: JSON with packet kind, input data, options
- Example:
  ```json
  {
    "packet_kind": "context_pack",
    "input": { "completed_work": "...", "blockers": "..." },
    "options": { "style": "detailed" }
  }
  ```

**B. CLI Guide (README)**
- `docs/HERMES_CLI_MANUAL.md` (new file)
- Steps:
  1. Install Hermes CLI locally (link to Hermes repo)
  2. Copy prompt from Control Room
  3. Run: `hermes run --input '<prompt>'`
  4. Copy result (Markdown)
  5. Return to Control Room import form

**C. Import UI (CLI → Control Room)**
- `/memory` page: Add "Import Hermes CLI Result" form
- Form fields:
  - Packet kind (dropdown)
  - Markdown content (textarea)
  - Note type (if obsidian-note)
  - Auto-detect: Try to parse frontmatter from pasted Markdown
- Button: "Save to Memory"

**D. Parser Logic**
- `lib/hermes/markdown-parser.ts` (new file)
- Functions:
  - `parseHermesMarkdown(md: string): HermesPacket` — Extract sections, metadata
  - `extractFrontmatter(md: string): Record<string, string>` — YAML frontmatter
  - `validatePacket(packet: HermesPacket): { valid: boolean; errors: string[] }`
- Fallback: If parse fails, show form fields for manual entry

**E. Storage Integration**
- Save parsed result to memory system (`lib/storage/memory-store.ts`)
- Format: Obsidian-compatible Markdown with frontmatter
- File location: `notes/` folder (if file-based) or `memory.json` (if JSON-based)

**Files to modify:**
- `app/memory/page.tsx` — Add import form
- `app/context-pack/page.tsx` — Add export button
- `lib/storage/memory-store.ts` — Add write function for notes

**Files to create:**
- `lib/hermes/markdown-parser.ts` (~200 lines)
- `docs/HERMES_CLI_MANUAL.md` (~300 words)
- `components/hermes/HermesImportForm.tsx` (~150 lines)

**Dependencies:** Phase 1 complete (for better Markdown output)

**Approval required?** Yes (user review of workflow documentation)

**Time estimate:** 2-3 days

**Risk level:** MEDIUM (parsing untrusted Markdown input; validate all fields)

**Risk mitigation:**
- Validate all parsed fields against HermesPacket type
- Sanitize Markdown (prevent code injection)
- Max file size limit (1 MB)
- Log all imports for audit trail

**Success criteria:**
- User can export context pack → paste to CLI → import result
- Result stored correctly in memory system
- Parser handles common Hermes output formats
- Fallback form works if parser fails
- Tests: 10+ example Markdown inputs

**Decision gate before Phase 3:**
- [ ] Phase 2 implementation complete
- [ ] User uses Pattern B workflow for 2+ weeks
- [ ] Feedback collected: "Is manual CLI paste-back sufficient?"
- [ ] If feedback: "Too many steps," → proceed to Phase 3
- [ ] If feedback: "Works fine," → stay with Phase 2 + Phase 1 improvements

---

### 5.3 Phase 3: Subprocess Integration with Approval Gate (Phase 13+, Separate Epic)

**Goal:** Control Room spawns Hermes CLI subprocess; user approves per execution; result auto-imported.

**Why:** Reduce friction (no copy/paste workflow); enable faster feedback loop; maintain safety via approval gates.

**Prerequisite:** Phase 2 complete + separate Epic T032+ (subprocess safety research)

**Architecture decision required:** Is server-side Hermes CLI safe? Should we sandbox it? What resource limits?

**Epic dependencies:** This is a **separate epic (T032+)** because it requires infrastructure research.

**Work items:**

**A. Subprocess Runner (lib layer)**
- `lib/hermes/subprocess-runner.ts` (new file)
- Functions:
  - `spawnHermesProcess(args: string[]): Promise<string>` — Spawn subprocess, collect output
  - `validateSubprocessResult(result: string): { valid: boolean; errors: string[] }` — Sanitize output
- Features:
  - Timeout: 3-min max (configurable)
  - Streaming: Pipe stdout to SSE endpoint
  - Error handling: Capture stderr, timeout, exit codes
  - Logging: Log all subprocess calls for audit trail

**B. Sandbox Configuration**
- `lib/hermes/sandbox-config.ts` (new file)
- Define resource limits:
  - Memory: 256 MB max
  - CPU: 1 core, no affinity
  - Timeout: 3 minutes
  - Temp file size: 10 MB max
  - Env variables: Allowlist only safe ones (no API keys)
- Implementation options:
  - Linux: Use `systemd-run --scope` with cgroup limits (if available)
  - macOS: Use `ulimit` in subprocess (basic)
  - Docker: Run Hermes in container (recommended for production)

**C. API Endpoint**
- `app/api/hermes/execute/route.ts` (new file, POST)
- Request body:
  ```json
  {
    "packet_kind": "context_pack",
    "input": { "completed_work": "..." },
    "approval_user": "user@example.com",
    "approval_timestamp": "2026-05-21T10:00:00Z"
  }
  ```
- Response: SSE stream (real-time output) → final JSON
- Rate limiting: 1 call per 5 seconds per user
- Token tracking: Estimate before run, deduct after run

**D. Approval Gate UI**
- `components/hermes/ApprovalGateModal.tsx` (new component)
- Modal content:
  - "This will call Hermes CLI. Approve?"
  - Show: Estimated token cost, timeout
  - Show: User approval (name, timestamp)
  - Buttons: "Approve & Run" / "Cancel"
- Trigger: Before every subprocess call

**E. Real-time Feedback UI**
- `components/hermes/SubprocessStreamingOutput.tsx` (new component)
- Shows:
  - Real-time Hermes output (SSE stream)
  - Spinner + "Running..."
  - Timeout countdown
  - Cancel button (kill subprocess)
  - Final result + save button

**F. Token Tracking**
- `lib/hermes/token-tracker.ts` (new file)
- Functions:
  - `estimateTokens(input: HermesInput): number` — Rough estimate (based on input size)
  - `trackTokenSpend(kind: string, tokens: number): void` — Log to session
  - `getTokenBudget(): { used: number; remaining: number }` — Query from storage

**G. Error Recovery**
- If subprocess times out: Show "Hermes took too long. Try a simpler task?"
- If subprocess crashes: Show stderr + "Hermes encountered an error. Check logs?"
- If parse fails: Fallback to paste-back workflow (Pattern B)

**Files to modify:**
- `app/api/orchestration/route.ts` — Add approval tracking
- `lib/agents/agent-availability-manager.ts` — Track Hermes availability
- `app/plan/page.tsx` — Add "Run Hermes" button to Hermes card

**Files to create:**
- `lib/hermes/subprocess-runner.ts` (~250 lines)
- `lib/hermes/sandbox-config.ts` (~150 lines)
- `lib/hermes/token-tracker.ts` (~100 lines)
- `app/api/hermes/execute/route.ts` (~200 lines)
- `components/hermes/ApprovalGateModal.tsx` (~150 lines)
- `components/hermes/SubprocessStreamingOutput.tsx` (~200 lines)

**Dependencies:** Phase 2 complete + separate Epic T032+ complete

**Approval required?** Yes, architecture review + security review

**Time estimate:** 3-5 days (complex sandboxing + error handling)

**Risk level:** MEDIUM-HIGH (subprocess spawning; requires careful sandboxing)

**Risk mitigation:**
- Subprocess sandboxing (cgroup/ulimit/Docker)
- Rate limiting (1 call / 5 sec per user)
- Token pre-checks (estimate before running)
- Audit logging (all subprocess calls)
- No write access to project files
- Env variable allowlist (no secrets)
- Graceful timeout + kill

**Testing required:**
- Unit: 20+ test cases for subprocess runner
- Integration: Full flow (approve → execute → save)
- Safety: Confirm no file writes, no env leaks, timeout works
- Load: 5+ concurrent subprocess calls
- Error: Timeout, crash, invalid output scenarios

**Success criteria:**
- User clicks "Run Hermes" → sees approval modal
- Approves → subprocess runs with timeout
- Output streamed real-time to browser
- Result auto-parsed + saved to memory
- No unintended file changes
- Token cost transparent + deducted correctly
- All safety tests pass

**Decision gate before deployment:**
- [ ] Phase 3 implementation complete
- [ ] Security review passed
- [ ] Subprocess sandboxing verified (cgroup limits enforced)
- [ ] Token tracking accurate
- [ ] Load test: 5+ concurrent calls succeed
- [ ] Error scenarios tested + graceful fallback works
- [ ] Audit logging enabled + tested
- [ ] Documentation complete

---

## 6. Risk Assessment Matrix

| Risk | Level | Phase Impact | Mitigation Strategy | Owner |
|------|-------|--------------|---------------------|-------|
| **Token cost surprise (Hermes API)** | MEDIUM | Phase 2-3 | Estimate before run, show cost to user, enforced budget | PM |
| **Subprocess escapes sandbox** | HIGH | Phase 3 | SELinux/AppArmor rules, cgroup limits, Docker containerization | DevOps |
| **Context overload (long prompt)** | MEDIUM | Phase 2-3 | Dynamic truncation, token counting, fallback to simpler task | Dev |
| **Rollback plan (Hermes fails)** | LOW | Phase 2-3 | All flows user-initiated; fallback to manual Pattern A | PM |
| **Dependency on Hermes repo stability** | MEDIUM | Phase 2-3 | Pin Hermes version, consider fork if necessary, vendor checks | Dev |
| **Markdown parser injection** | MEDIUM | Phase 2 | Validate all fields, sanitize Markdown, max file size | Security |
| **Long-running subprocess hangs** | MEDIUM | Phase 3 | Enforce 3-min timeout, graceful kill, monitor system resources | DevOps |
| **Rate limit enforcement** | LOW | Phase 3 | 1 call per 5 sec per user, per-endpoint tracking | Dev |
| **Multi-project isolation** | MEDIUM | Phase 2-3 | Restrict Hermes to current project only, no cross-project reads | Dev |
| **User confusion (too many steps in Pattern B)** | MEDIUM | Phase 2 | Clear documentation + example scripts, consider Phase 3 if needed | Documentation |

---

## 7. Decision Gates

Before proceeding to each phase, verify decision gate checklist:

### Before Phase 2 (Manual CLI Paste-Back)

**Prerequisites:**
- [ ] Phase 1 enhanced generators complete + merged
- [ ] `docs/HERMES_CLI_INSTALLATION_SPIKE.md` updated (validate install steps are correct)
- [ ] User approval: "Is manual paste-back workflow sufficient for your needs?"
- [ ] Hermes CLI repo stable + documented (check latest version, breaking changes)

**Validation:**
- [ ] Markdown output from Phase 1 is high quality
- [ ] Hermes CLI installation steps are verified on macOS/Linux
- [ ] Hermes CLI output format stable (won't change without notice)

**Sign-off:** PM + User

---

### Before Phase 3 (Subprocess Integration)

**Prerequisites:**
- [ ] Phase 2 complete + in production (2+ weeks of user feedback)
- [ ] User feedback collected: "Copy/paste is getting tedious. Need automation?"
- [ ] Separate Epic T032+ (subprocess safety research) **complete**
  - Sandbox strategy defined (cgroup, Docker, etc.)
  - Security review approved
  - Resource limit recommendations finalized
- [ ] Infrastructure ready:
  - Server can run Hermes CLI (installed or containerized)
  - Cgroup/ulimit/Docker support verified
  - Monitoring + alerting for subprocess calls

**Architecture review checklist:**
- [ ] Subprocess spawning approach approved (cgroup vs. Docker vs. ulimit)
- [ ] Token tracking mechanism approved
- [ ] Timeout + graceful kill strategy approved
- [ ] Env variable allowlist approved
- [ ] Rate limiting strategy approved
- [ ] Audit logging strategy approved

**Sign-off:** Security + DevOps + PM + User

---

## 8. Timeline & Dependencies

```
Phase 1 (Enhanced Generators)
├─ Duration: 1-2 days
├─ Start: After Phase 10 (current: Phase 9 complete)
├─ Blocks: Nothing (independent)
└─ Deliverable: Richer Markdown output

Phase 2 (Manual CLI Paste-Back)
├─ Duration: 2-3 days
├─ Start: After Phase 1 complete + HERMES_CLI_INSTALLATION_SPIKE.md validated
├─ Blocks: Nothing (optional; Pattern A still works)
├─ Prerequisite: User approves paste-back workflow
└─ Deliverable: Export/import UI + CLI guide

Phase 3 (Subprocess Integration)
├─ Duration: 3-5 days
├─ Start: After Phase 2 complete (2+ weeks) + Epic T032+ complete
├─ Blocks: Future autonomy features (use Phase 3 as foundation)
├─ Prerequisite: Security review, infrastructure ready
└─ Deliverable: Approval-gated subprocess + real-time streaming

Next Phase (Phase 10+)
├─ Antigravity Full UI/UX Polish
├─ Integration Testing (end-to-end flow validation)
├─ Vibe Kanban Real API Integration
└─ Context Pack Workflow & Storage (may use Hermes results)
```

---

## 9. Open Questions & Decisions

### 9.1 Token Cost Model
- **Question:** Should Hermes API calls count toward user's budget? Or free tier?
- **Current assumption:** User responsible for Hermes token cost (if using Hermes API)
- **Decision needed:** If Hermes API is heavy, offer free alternatives (e.g., local open-source models)

### 9.2 Hermes as Background Worker (Distinct Role)
- **Question:** Should Hermes run continuously (e.g., analyze every report automatically)?
- **Current assumption:** Hermes is event-triggered (Pattern A: user clicks button)
- **Decision needed:** Phase 3 may enable background triggering; need approval gate for that

### 9.3 Obsidian Sync
- **Question:** Should Control Room directly write to Obsidian vault (if user has one)?
- **Current assumption:** Generate Markdown; user pastes to Obsidian
- **Decision needed:** If user has Obsidian installed, could we write directly? (Requires file system access)

### 9.4 Multi-Agent Context Sharing
- **Question:** Can Hermes notes be shared across agents? (e.g., Claude Code reads Hermes note from previous Codex session)
- **Current assumption:** Notes are read-only memory; agents can optionally include relevant notes in their context
- **Decision needed:** Design note cross-referencing (tags, linked notes, etc.)

---

## 10. Current Status & Recommendations

**As of 2026-05-21:**

| Phase | Status | Action |
|-------|--------|--------|
| Pattern A (Static Generator) | ✅ Complete | Maintain + use for collecting user feedback |
| Pattern B (Manual CLI) | 📋 Documented | Schedule Phase 1 first (1-2 days), then Phase 2 (2-3 days) if user feedback supports |
| Pattern C (Subprocess) | 📋 Documented | Gate behind Epic T032+ (security research) |

**Recommended next steps:**

1. **Immediate (Next 1-2 weeks):**
   - Collect user feedback on Pattern A (static generator)
   - Validate `HERMES_CLI_INSTALLATION_SPIKE.md` (if it exists; if not, plan Phase 1.5)
   - Monitor Hermes output quality; identify gaps

2. **Phase 1 (1-2 weeks after):**
   - Enhanced Markdown generators (higher fidelity output)
   - Expand generator templates (more context, richer sections)
   - User testing: Do users spend less time editing outputs?

3. **Phase 2 decision (after Phase 1 + 2+ weeks feedback):**
   - If users say "Copy/paste is fine": Skip Phase 2, invest in Antigravity
   - If users say "Too many manual steps": Proceed with Phase 2

4. **Phase 3 decision (after Phase 2 + 2+ weeks feedback + Epic T032+):**
   - If Phase 2 is sufficient: Keep it, invest elsewhere
   - If users want full automation: Proceed with Phase 3 (heavy investment)

---

## 11. Documentation & Handoff

### 11.1 User-Facing Documentation
- `/docs/HERMES_USER_GUIDE.md` (how to use Hermes packets + export/import)
- `/docs/HERMES_CLI_MANUAL.md` (Phase 2 prerequisite)
- `/docs/OBSIDIAN_MEMORY_SYSTEM.md` (how to work with memory notes)

### 11.2 Developer Documentation
- This document: `docs/HERMES_INTEGRATION_ROADMAP.md` (architecture + phases)
- `docs/HERMES_ARCHITECTURE.md` (detailed type system, generators, storage)
- `lib/hermes/README.md` (module-level docs, generator examples)

### 11.3 Handoff Between Phases
- At end of Phase 1: Document output samples, list gaps, recommend Phase 2 timing
- At end of Phase 2: Collect user feedback, survey usage, decide Phase 3
- At start of Phase 3: Reference Epic T032+ findings, security review artifacts

---

## 12. Success Metrics

### Phase 1 Success
- Hermes output is used by users in 30%+ of sessions
- User feedback: "Outputs are detailed and save me editing time"
- No errors in generator logic (0 parsing failures)

### Phase 2 Success
- 10%+ of users run Hermes CLI weekly
- Paste-back workflow completes in <2 min average
- User feedback: "Easier than navigating UI"

### Phase 3 Success
- 30%+ of memory notes created via Hermes subprocess
- Context packs auto-enriched with 1-2 relevant historical notes
- User feedback: "Hermes helps me remember what I learned"

---

## Summary

Hermes integration follows a **three-pattern roadmap** from zero-risk static generation (Pattern A, complete) to user-initiated CLI (Pattern B, Phase 11+) to server-side subprocess (Pattern C, Phase 13+).

Each pattern includes:
- Explicit safety boundaries (what Hermes can never do)
- Decision gates (when to proceed to next phase)
- Risk mitigation (sandboxing, approval gates, token tracking)
- Time estimates (1-2 days to 3-5 days)
- User feedback loops (validate assumptions before building)

**Current recommendation:** Proceed with Phase 1 (enhanced generators) when Phases 10-11 are ready. Collect user feedback. Decide Phase 2 based on feedback.

---

**Document completed:** 2026-05-21  
**Next review date:** After Phase 1 complete (estimated 2026-06-15)  
**Maintainer:** Documentation Engineer  
