-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  repo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Feature Plans table
CREATE TABLE feature_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Plan Tasks table
CREATE TABLE plan_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  plan_id UUID NOT NULL REFERENCES feature_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  agent_type TEXT,
  status TEXT DEFAULT 'planned',
  acceptance_criteria TEXT,
  generated_prompt TEXT,
  execution_result TEXT,
  completion_judgment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Session Reports table
CREATE TABLE session_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  task_id UUID REFERENCES plan_tasks(id) ON DELETE CASCADE,
  summary TEXT,
  changed_files TEXT[],
  completed_count INTEGER DEFAULT 0,
  remaining_issues TEXT,
  recommended_next_task TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Agent Statuses table
CREATE TABLE agent_statuses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_type TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'available',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Execution Logs table
CREATE TABLE execution_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES plan_tasks(id) ON DELETE CASCADE,
  branch_name TEXT,
  logs TEXT,
  exit_code INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_projects_created_at ON projects(created_at);
CREATE INDEX idx_feature_plans_project_id ON feature_plans(project_id);
CREATE INDEX idx_plan_tasks_plan_id ON plan_tasks(plan_id);
CREATE INDEX idx_session_reports_project_id ON session_reports(project_id);
CREATE INDEX idx_execution_logs_task_id ON execution_logs(task_id);

-- Enable RLS (Row Level Security) if needed
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE execution_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_statuses ENABLE ROW LEVEL SECURITY;

-- Create public policies (for MVP - can be restricted later)
CREATE POLICY "Projects are viewable by everyone" ON projects FOR SELECT USING (true);
CREATE POLICY "Feature plans are viewable by everyone" ON feature_plans FOR SELECT USING (true);
CREATE POLICY "Plan tasks are viewable by everyone" ON plan_tasks FOR SELECT USING (true);
CREATE POLICY "Session reports are viewable by everyone" ON session_reports FOR SELECT USING (true);
CREATE POLICY "Agent statuses are viewable by everyone" ON agent_statuses FOR SELECT USING (true);
CREATE POLICY "Execution logs are viewable by everyone" ON execution_logs FOR SELECT USING (true);