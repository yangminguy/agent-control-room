-- T026: Initial schema migration for Agent Control Room
-- Replaces local JSON file storage with Supabase PostgreSQL tables.
-- All tables use snake_case columns to match Supabase conventions.
-- JSON fallback in application code continues to work when these vars are absent.

-- ─── projects ────────────────────────────────────────────────────────────────
create table if not exists projects (
  id            text primary key,
  name          text not null,
  path          text not null,
  description   text,
  base_tool     text,
  default_agent text not null default 'claude-code',
  docs          jsonb not null default '[]'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─── tasks ───────────────────────────────────────────────────────────────────
create table if not exists tasks (
  id                  text primary key,
  project_id          text not null references projects(id) on delete cascade,
  base_tool_task_id   text,
  title               text not null,
  user_intent         text not null default '',
  technical_summary   text not null default '',
  status              text not null default 'draft',
  recommended_agent   text not null default 'claude-code',
  priority            text not null default 'P1',
  acceptance_criteria jsonb not null default '[]'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- ─── handoffs ────────────────────────────────────────────────────────────────
create table if not exists handoffs (
  id              text primary key,
  project_id      text not null,
  task_id         text not null,
  from_agent      text not null,
  to_agent        text not null,
  reason          text not null default '',
  completed_work  jsonb not null default '[]'::jsonb,
  remaining_work  jsonb not null default '[]'::jsonb,
  changed_files   jsonb not null default '[]'::jsonb,
  forbidden_files jsonb not null default '[]'::jsonb,
  next_prompt     text not null default '',
  created_at      timestamptz not null default now()
);

-- ─── session_reports ─────────────────────────────────────────────────────────
create table if not exists session_reports (
  id                      text primary key,
  project_id              text not null,
  task_id                 text not null,
  agent                   text not null,
  summary                 text not null default '',
  execution_time_minutes  integer not null default 0,
  tokens_used             integer not null default 0,
  errors                  jsonb not null default '[]'::jsonb,
  changed_files           jsonb not null default '[]'::jsonb,
  tests_run               jsonb not null default '[]'::jsonb,
  code_review_score       integer not null default 0,
  accessibility_score     integer not null default 0,
  performance_metrics     jsonb,
  manual_notes            text not null default '',
  remaining_issues        jsonb not null default '[]'::jsonb,
  completion_judgment     text not null default 'pending',
  completion_reason       text not null default '',
  next_task               text not null default '',
  next_prompt             text not null default '',
  recommended_agent       text not null default 'claude-code',
  prd_alignment_score     integer not null default 0,
  risks                   jsonb not null default '[]'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- ─── feature_plans ───────────────────────────────────────────────────────────
-- tasks column stores the full PlanTask[] array as JSONB (denormalized for simplicity).
create table if not exists feature_plans (
  id          text primary key,
  project_id  text not null,
  title       text not null,
  user_goal   text not null default '',
  status      text not null default 'planned',
  tasks       jsonb not null default '[]'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ─── execution_logs ──────────────────────────────────────────────────────────
create table if not exists execution_logs (
  id            text primary key,
  plan_task_id  text not null,
  agent         text not null,
  branch_name   text not null,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,
  exit_code     integer,
  log_lines     jsonb not null default '[]'::jsonb,
  status        text not null default 'running'
);

-- ─── agent_statuses ──────────────────────────────────────────────────────────
create table if not exists agent_statuses (
  agent             text primary key,
  status            text not null default 'available',
  reason            text,
  last_used_at      timestamptz,
  next_available_at timestamptz,
  updated_at        timestamptz not null default now()
);

-- Seed default agent statuses (upsert so re-running is safe)
insert into agent_statuses (agent, status) values
  ('claude-code', 'available'),
  ('codex',       'available'),
  ('antigravity', 'available')
on conflict (agent) do nothing;

-- ─── Row Level Security ───────────────────────────────────────────────────────
-- Enable RLS on all tables. Since this is a single-user personal tool,
-- we use a simple "allow all" policy for anon key access.
-- Tighten with auth.uid() checks when multi-user support is added.

alter table projects        enable row level security;
alter table tasks           enable row level security;
alter table handoffs        enable row level security;
alter table session_reports enable row level security;
alter table feature_plans   enable row level security;
alter table execution_logs  enable row level security;
alter table agent_statuses  enable row level security;

create policy "allow all" on projects        for all using (true) with check (true);
create policy "allow all" on tasks           for all using (true) with check (true);
create policy "allow all" on handoffs        for all using (true) with check (true);
create policy "allow all" on session_reports for all using (true) with check (true);
create policy "allow all" on feature_plans   for all using (true) with check (true);
create policy "allow all" on execution_logs  for all using (true) with check (true);
create policy "allow all" on agent_statuses  for all using (true) with check (true);
