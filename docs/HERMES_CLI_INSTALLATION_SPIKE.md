# HERMES_CLI_INSTALLATION_SPIKE.md — Agent Control Room

## Title

Hermes CLI Installation Spike Preparation

---

## Goal

Investigate the feasibility, requirements, and implications of Hermes CLI installation and local execution as a background/memory worker agent for Agent Control Room.

This spike is **research and planning only**. No actual installation, CLI execution, or integration occurs.

---

## Context

Hermes is an optional background/memory agent in Agent Control Room's agent model:

| Agent | Role | Use Case |
|-------|------|----------|
| **Claude Code** | Primary reasoning, architecture | Complex planning, document review |
| **Codex** | Implementation, bug fixes | Bounded implementation tasks |
| **Antigravity** | UI prototyping, visual iteration | Frontend/UX work |
| **Hermes** | Long-running monitoring, summaries, memory | Background work, context preservation, insight extraction |
| **Vibe Kanban** | Execution workbench | Issue cards, workspaces, diffs, previews |

Hermes is currently:
- Represented as a packet/memory generator in the UI (`/hermes-packets`)
- Markdown-based (no execution)
- Not connected to Vibe Kanban or other agents
- Optional in the execution loop

This spike investigates whether Hermes CLI could enhance Agent Control Room by:
- Running asynchronously between main agent execution
- Extracting insights from session results
- Maintaining memory across sessions
- Generating context packs
- Optimizing token usage

---

## Safety Boundaries

**CRITICAL: The following are EXPLICITLY OUT OF SCOPE for this spike.**

- **No Installation:** This spike does not install Hermes CLI locally.
- **No Execution:** This spike does not run or invoke Hermes commands.
- **No API Connection:** This spike does not connect Agent Control Room to Hermes.
- **No Subprocess Calls:** This spike does not spawn Hermes processes.
- **No Real Hermes Integration:** Any actual Hermes CLI installation and execution is future work, contingent on passing a follow-up implementation phase.

**User Approval Required:** If a future decision is made to integrate Hermes CLI execution, that work will require explicit user approval and a separate implementation task with strict sandboxing and error handling.

---

## What to Investigate

### 1. Installation Prerequisites

**Research Questions:**
- What are the system requirements for Hermes CLI?
  - Operating system support (macOS, Linux, Windows)?
  - Node.js or Python version requirements?
  - Disk space requirements?
  - Network requirements (online vs. offline)?
- What is the installation command? (e.g., `npm install`, `pip install`, `curl | bash`)
- Are there dependency conflicts with Agent Control Room's tech stack?
- Is Hermes CLI open-source or proprietary? Public registry or private?

**Research Method:**
- Review official Hermes documentation
- Check package registry (npm, PyPI, Homebrew, etc.)
- Note system requirements and installation steps
- Document any prerequisites or special setup needed

### 2. Execution Modes

**Research Questions:**
- How is Hermes CLI invoked?
  - CLI command syntax? (e.g., `hermes-cli run`, `hermes prompt`)
  - Configuration file format?
  - Environment variables needed?
- Does Hermes support local-only execution or require cloud connectivity?
- What are the performance characteristics?
  - Latency for a typical request?
  - Memory usage during execution?
  - Token consumption per request?
- Is there a dry-run or mock mode for testing?

**Research Method:**
- Review CLI documentation and examples
- Identify standard usage patterns
- Document configuration options
- Note any cloud/API dependencies

### 3. API / CLI Connection Patterns

**Research Questions:**
- If integration is desired later, what would the interface be?
  - Subprocess execution (Node.js `child_process`)?
  - HTTP/REST API?
  - gRPC or other protocol?
  - MCP (Model Context Protocol)?
- What would the input/output format be?
  - JSON, YAML, plain text?
  - Streaming or request/response?
- What error handling is needed?
  - Timeout handling?
  - Retry logic?
  - Fallback behavior if Hermes is unavailable?
- Would Hermes need read/write access to the project filesystem?
  - Session files?
  - Memory database?
  - Configuration files?

**Research Method:**
- Review Hermes API documentation
- Check for MCP support or other integration patterns
- Document the minimal interface needed
- Identify data serialization requirements

### 4. Performance and Cost Implications

**Research Questions:**
- What is the token cost per Hermes operation?
  - Per session summary?
  - Per context pack generation?
  - Per insight extraction?
- Does Hermes CLI count against the same token budget as Claude Code/Codex?
- What is the latency impact of adding Hermes between tasks?
  - Synchronous execution?
  - Async/background execution?
- Are there rate limits or quotas?
- How does local execution (if possible) compare to cloud execution?

**Research Method:**
- Review Hermes pricing and API documentation
- Estimate token usage for common operations
- Document any cost considerations
- Note parallelization opportunities

### 5. Integration Points with Agent Control Room

**Research Questions:**
- Where in Agent Control Room's workflow would Hermes be most valuable?
  - Between task completion and next-step recommendation?
  - After session report is saved?
  - During roadmap update?
  - During context pack generation?
- What data would Hermes need as input?
  - Session report?
  - Diffs and changed files?
  - User feedback?
  - Previous context packs?
- What would Hermes output?
  - Insight summary?
  - Recommended next task?
  - Memory/context entry?
  - Token savings estimate?
- How would Hermes integrate with existing components?
  - `/hermes-packets` page?
  - Roadmap stage completion?
  - Handoff generation?

**Research Method:**
- Map Agent Control Room's task lifecycle
- Identify bottlenecks or context-loss points
- Document where Hermes would provide value
- Sketch minimal integration points

---

## Investigation Paths

### Path A: Official Documentation Review

**Steps:**
1. Find official Hermes CLI repository or website
2. Read installation guide
3. Review quickstart and API documentation
4. Check example usage and output
5. Review any limitations or known issues

**Deliverable:**
- Summary of installation requirements
- System and dependency compatibility
- Typical usage patterns
- Output format and structure

### Path B: Package Registry Analysis

**Steps:**
1. Check npm registry for Hermes CLI package
2. Check PyPI, Homebrew, or other package managers
3. Review version history and release notes
4. Check download stats and community adoption
5. Review open issues or discussions

**Deliverable:**
- Package name and latest version
- Installation command
- Dependency tree (what Hermes requires)
- Version stability and update frequency

### Path C: Local Testing (Research Only, No Installation)

**Steps (WITHOUT installing):**
1. Document what a test installation would look like
2. Estimate disk space and dependencies
3. Identify potential installation blockers
4. Document cleanup/uninstall procedure
5. Note any system changes that would occur

**Deliverable:**
- Installation risk assessment
- System impact analysis
- Rollback procedure
- Lessons for future implementation

### Path D: Integration Point Mapping

**Steps:**
1. Review Agent Control Room's task lifecycle
2. Identify context-loss or delay points
3. Map where Hermes could add value
4. Estimate token and time savings
5. Document minimal MVP integration

**Deliverable:**
- Integration point diagram
- Value proposition per integration point
- Minimal viable interface design
- Estimated complexity and effort

---

## Non-Goals

**Explicitly NOT doing:**

- Installing Hermes CLI
- Running Hermes commands or scripts
- Creating subprocess spawning code
- Writing integration code
- Modifying package.json or dependencies
- Testing Hermes execution
- Connecting Agent Control Room to Hermes
- Creating Hermes configuration files
- Building any Hermes-aware UI
- Documenting usage patterns (that's implementation)

---

## Potential Spike Findings

### Likely Findings

1. **Installation is straightforward but adds complexity**
   - Standard package manager install
   - Minimal dependencies
   - Small disk footprint
   - But subprocess handling adds error cases

2. **Token costs matter**
   - Hermes operations consume tokens
   - May not be cost-effective for every session
   - Selective use needed (only high-value sessions)

3. **Integration is async-first**
   - Hermes works best as background/queue
   - Blocking integration would hurt performance
   - Need task queue or background worker infrastructure

4. **Local execution may not be viable**
   - Hermes CLI may require cloud connectivity
   - API calls still consume tokens
   - Offline operation not guaranteed

5. **Memory persistence is critical**
   - Hermes needs durable storage for context
   - Supabase or local database needed
   - Integration with Obsidian-compatible export

### Decision Criteria

Based on findings, decisions will likely be:

**Implement Hermes Integration if:**
- Installation is low-complexity and low-risk
- Token costs are justified by time/context savings
- Local or async execution is feasible
- Integration points are clear and non-blocking
- Obsidian memory export is compatible

**Defer Hermes Integration if:**
- Installation is complex or risky
- Token costs exceed benefits
- Cloud-only execution adds dependency
- Integration would block primary task execution
- Memory persistence requires major refactor

**Reject Hermes Integration if:**
- Upstream (Hermes) is sunsetting or unreliable
- Security or licensing concerns emerge
- Cost-benefit analysis is unfavorable
- Simpler alternatives exist (local LLM, simple heuristics)

---

## Success Criteria for Spike

Spike is successful when the following questions are answered:

1. **Installation:** What are the exact steps and requirements to install Hermes CLI?
2. **Execution:** How is Hermes CLI invoked, what are the input/output formats, and what are performance characteristics?
3. **Integration:** If integration is desired, what would the minimal API/interface be and what are the blockers?
4. **Cost:** What is the token cost per operation and how does it compare to primary agent execution?
5. **Feasibility:** Is Hermes CLI installation and integration feasible, safe, and beneficial for Agent Control Room?
6. **Decision:** Based on findings, should Agent Control Room pursue Hermes CLI integration in the next phase?

---

## Spike Deliverables

Upon completion, spike should produce:

1. **Installation Guide (Research)**
   - System requirements
   - Dependency analysis
   - Installation steps (documented, not executed)
   - Estimated disk/memory impact

2. **Integration Map**
   - Where Hermes would fit in Agent Control Room's workflow
   - Input/output formats
   - Async vs. sync design
   - Memory persistence strategy

3. **Cost-Benefit Analysis**
   - Token costs per operation
   - Time savings for typical workflows
   - Infrastructure overhead
   - ROI estimate

4. **Risk Assessment**
   - Installation risks
   - Integration complexity
   - Failure modes and recovery
   - Security/sandboxing needs

5. **Recommendation Report**
   - Should we pursue Hermes integration?
   - What is the implementation approach?
   - What are the next steps?
   - What are the blockers or prerequisites?

---

## Related Documents

- `AGENTS.md` — Agent model and Hermes role
- `ARCHITECTURE.md` — System architecture and component roles
- `HERMES_PACKETS.md` (future) — Hermes packet types and generation
- `ROADMAP.md` — Development roadmap and phase planning

---

## Approval and Next Steps

### Current Status

- **Phase:** Pre-implementation (Spike Planning)
- **Approved By:** Product direction (see CLAUDE.md)
- **Owner:** Documentation Engineer / Senior Dev (whoever leads next phase)

### If Spike Recommends Integration

- Create T032 Implementation task
- Write detailed implementation specification
- Design safety boundaries and error handling
- Plan integration testing and validation
- Require explicit user approval before proceeding

### If Spike Recommends Deferral

- Document findings for future reference
- Plan alternative approaches
- Schedule re-evaluation point

### If Spike Identifies Blockers

- Document blockers clearly
- Plan mitigation or alternative strategies
- Consider whether Hermes is still appropriate for Agent Control Room

---

## Notes

**Remember:** This is a spike. We are researching, not building. Keep investigation focused, time-boxed, and decision-oriented. The goal is clarity for a future go/no-go decision, not implementation readiness.
