# T035: Supabase Data Model Design

## 현재 상태
- **저장소**: `data/` 폴더의 JSON 파일들
- **문제**: 복잡한 데이터는 JSON 관리 불편, 쿼리 성능 제한

## Supabase 스키마

### feature_plans
```sql
CREATE TABLE feature_plans (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  title TEXT NOT NULL,
  user_goal TEXT,
  status TEXT CHECK (status IN ('planned', 'in_progress', 'done', 'blocked')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX idx_feature_plans_project ON feature_plans(project_id);
```

### plan_tasks
```sql
CREATE TABLE plan_tasks (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assigned_agent TEXT,
  internal_agent_ids TEXT[] DEFAULT '{}', -- T025: Multi-agent support
  status TEXT CHECK (status IN ('planned', 'ready', 'running', 'done', 'partial', 'blocked', 'needs_review')),
  priority TEXT CHECK (priority IN ('P0', 'P1', 'P2', 'P3')),
  acceptance_criteria TEXT[],
  generated_prompt TEXT,
  branch_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE,
  FOREIGN KEY (plan_id) REFERENCES feature_plans(id)
);

CREATE INDEX idx_plan_tasks_plan ON plan_tasks(plan_id);
CREATE INDEX idx_plan_tasks_status ON plan_tasks(status);
```

### execution_logs
```sql
CREATE TABLE execution_logs (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  agent_id TEXT,
  branch_name TEXT,
  stdout TEXT,
  stderr TEXT,
  exit_code INTEGER,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  tokens_used INTEGER,
  FOREIGN KEY (task_id) REFERENCES plan_tasks(id)
);

CREATE INDEX idx_execution_logs_task ON execution_logs(task_id);
CREATE INDEX idx_execution_logs_date ON execution_logs(completed_at);
```

### agent_performance
```sql
CREATE TABLE agent_performance (
  agent_id TEXT PRIMARY KEY,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  average_time_minutes DECIMAL,
  average_tokens_used INTEGER,
  success_rate DECIMAL,
  last_used_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### session_reports
```sql
CREATE TABLE session_reports (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  task_id TEXT,
  agent TEXT,
  summary TEXT,
  changed_files TEXT[],
  tests_run TEXT[],
  remaining_issues TEXT[],
  recommended_next_task TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY (project_id) REFERENCES projects(id),
  FOREIGN KEY (task_id) REFERENCES plan_tasks(id)
);

CREATE INDEX idx_session_reports_project ON session_reports(project_id);
CREATE INDEX idx_session_reports_task ON session_reports(task_id);
```

## 마이그레이션 계획

### Phase 1: Schema 생성 (Production)
1. Supabase 프로젝트 생성
2. 위 테이블들 생성
3. RLS (Row Level Security) 정책 설정

### Phase 2: 데이터 마이그레이션
1. JSON → Supabase 변환 스크립트 작성
2. Data integrity 검증
3. 양쪽 병행 운영 (failover용)

### Phase 3: 애플리케이션 업데이트
```typescript
// Before: JSON storage
const plan = readJSON('data/feature-plans.json')

// After: Supabase
const { data, error } = await supabase
  .from('feature_plans')
  .select()
  .eq('id', planId);
```

## 성능 최적화

### 인덱싱 전략
```sql
-- Frequently queried fields
CREATE INDEX idx_tasks_status ON plan_tasks(status);
CREATE INDEX idx_execution_logs_date ON execution_logs(completed_at);
CREATE INDEX idx_performance_success ON agent_performance(success_rate DESC);

-- Composite for multi-filter queries
CREATE INDEX idx_tasks_plan_status ON plan_tasks(plan_id, status);
```

### 쿼리 최적화
```typescript
// N+1 쿼리 방지: 한 번에 모든 데이터 fetch
const { data: plans } = await supabase
  .from('feature_plans')
  .select(`
    *,
    plan_tasks (
      *,
      execution_logs (*)
    )
  `)
  .eq('project_id', projectId);
```

## RLS (Row Level Security) 정책

```sql
-- 사용자는 자신의 프로젝트만 접근 가능
-- (현재는 single-user이므로 단순화)
ALTER TABLE feature_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON feature_plans
  FOR SELECT
  USING (auth.uid() IS NOT NULL);
```

## 안전성

### Backup 전략
- Automatic backups (Supabase 기본)
- Weekly exports to cloud storage
- Point-in-time recovery (30일)

### 재해 복구
- Local JSON fallback (마이그레이션 기간)
- Read replica for high availability
- Connection pooling for concurrent access
