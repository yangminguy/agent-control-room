# Agent Control Room

Agent Control Room is a personal Human-in-the-loop AI Development Orchestrator.
It turns product direction into technical tasks, recommends the right AI coding
tool, generates execution prompts, tracks work, and preserves handoff context.

## Run locally

**Development (JSON storage):**
```bash
npm install
npm run dev
```

**With Supabase (optional):**
```bash
# Set environment variables
cp .env.example .env.local
# Edit .env.local with your Supabase URL and key
nano .env.local

# Then run
npm run dev
```

Open the local URL printed by Next.js (typically `http://localhost:3000`).

## MVP flow

1. **Register or select a project** at `/` → `/projects`
2. **Enter product direction** in natural language → Direction input form
3. **Generate orchestration output**:
   - Technical translation (OpenAI structured output)
   - Task decomposition
   - Agent routing + recommendation
   - Copy-ready prompt
4. **Track execution** in `/plan`:
   - Kanban board with task statuses
   - Execute button (spawns Claude Code or displays copy prompt)
   - Auto-analysis after execution
5. **Loop control**:
   - Continue → prepare next task
   - Stop → save current result
   - Error recovery with Retry buttons
6. **Export/handoff**:
   - Session report at `/reports`
   - Send to Vibe Kanban at task card (with project/status selection)

## Files

- `CLAUDE.md` — Main AI coding context file
- `docs/README.md` — Active vs archived documentation map
- `docs/PRD.md` — Current concise product requirements
- `docs/ARCHITECTURE.md` — System architecture and module design
- `docs/TASKS.md` — Current task status and next task
- `docs/HANDOFF.md` — Tool-to-tool handoff format
- `docs/AGENT_STATE.md` — Current project state and next prompt
- `docs/DECISIONS.md` — Product/technical decisions
- `docs/ROADMAP.md` — Phase-level roadmap
- `docs/TASK_MODEL.md` — Plan, task, kanban, diff, and execution log models
- `docs/VIBE_KANBAN_INTEGRATION.md` — Vibe Kanban bridge notes
- `docs/PROMPT_TEMPLATES.md` — Reusable prompts for Claude Code, Codex, Antigravity
- `docs/DESIGN_SYSTEM.md` — Current UI design rules
- `docs/archive/` — Historical long-form research and superseded docs

## Deploy to Vercel

1. **Push to GitHub** (optional but recommended):
   ```bash
   git add .
   git commit -m "Deploy: Agent Control Room Phase 8 complete"
   git push
   ```

2. **Set Environment Variables** in Vercel dashboard:
   ```
   OPENAI_API_KEY=sk-...
   NEXT_PUBLIC_SUPABASE_URL=https://pqqgkhowiaeznkumwhwl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...
   ```

3. **Deploy**:
   ```bash
   npm run build
   vercel --prod
   ```

## Current Status (Phase 8 Complete)

✅ **Completed Phases:**
- Phase 1-5: Core orchestration, structured planning, execution, analysis, routing, autonomous loop
- Phase 6: Loop UX refinement (feedback banners, error recovery)
- Phase 7: Security hardening (npm audit, path validation)
- Phase 8: Integration (Vibe Kanban HTTP API, Supabase schema)

✅ **Ready for Production:**
- Zero critical/high security vulnerabilities (direct dependencies)
- All core flows tested and verified
- JSON fallback ensures offline capability
- Supabase optional (app runs without it)

⚠️ **Known Limitations:**
- Vibe Kanban `/api/scratch/` scratch API not fully integrated (general `/api/issues` endpoint used)
- No multi-user authentication (single-user personal tool)
- npm audit: 2 moderate (Next.js bundled PostCSS, not exploitable in this app)

## Recommended Start

1. Run the app: `npm run dev`
2. Start from the Direction to Prompt screen at `/`
3. For implementation handoffs, keep prompts bounded:

```txt
Read CLAUDE.md, docs/PRD.md, docs/ARCHITECTURE.md, and docs/TASKS.md.
Keep the change scoped to the current task and update docs if task status changes.
```

4. For cloud deployment, configure Supabase environment variables and re-deploy
