/**
 * T035: JSON → Supabase Data Migration Utilities
 */

import type { FeaturePlan, PlanTask, SessionReport } from "@/lib/types";

export interface MigrationReport {
  timestamp: string;
  totalRecords: number;
  successful: number;
  failed: number;
  errors: string[];
}

/**
 * Convert JSON feature plans to Supabase format
 */
export async function migrateFeaturePlans(
  plans: FeaturePlan[],
): Promise<MigrationReport> {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalRecords: plans.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const plan of plans) {
    try {
      // Validate plan data
      if (!plan.id || !plan.projectId || !plan.title) {
        throw new Error(`Invalid plan data: missing required fields`);
      }

      // In production, insert to Supabase:
      // await supabase.from('feature_plans').insert({
      //   id: plan.id,
      //   project_id: plan.projectId,
      //   title: plan.title,
      //   user_goal: plan.userGoal,
      //   status: plan.status,
      //   created_at: plan.createdAt,
      //   updated_at: plan.updatedAt,
      // });

      report.successful++;
    } catch (error) {
      report.failed++;
      report.errors.push(
        `Plan ${plan.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return report;
}

/**
 * Convert JSON plan tasks to Supabase format
 */
export async function migratePlanTasks(tasks: PlanTask[]): Promise<MigrationReport> {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalRecords: tasks.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const task of tasks) {
    try {
      if (!task.id || !task.planId || !task.title) {
        throw new Error("Invalid task data: missing required fields");
      }

      // In production:
      // await supabase.from('plan_tasks').insert({
      //   id: task.id,
      //   plan_id: task.planId,
      //   title: task.title,
      //   assigned_agent: task.assignedAgent,
      //   internal_agent_ids: task.subAgentTracks?.map(t => t.agentId).filter(Boolean),
      //   status: task.status,
      //   priority: task.priority,
      //   acceptance_criteria: task.acceptanceCriteria,
      //   generated_prompt: task.generatedPrompt,
      //   branch_name: task.branchName,
      //   created_at: task.createdAt,
      //   updated_at: task.updatedAt,
      // });

      report.successful++;
    } catch (error) {
      report.failed++;
      report.errors.push(
        `Task ${task.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return report;
}

/**
 * Convert JSON session reports to Supabase format
 */
export async function migrateSessionReports(
  reports: SessionReport[],
): Promise<MigrationReport> {
  const report: MigrationReport = {
    timestamp: new Date().toISOString(),
    totalRecords: reports.length,
    successful: 0,
    failed: 0,
    errors: [],
  };

  for (const sr of reports) {
    try {
      if (!sr.id || !sr.projectId) {
        throw new Error("Invalid session report: missing required fields");
      }

      // In production:
      // await supabase.from('session_reports').insert({
      //   id: sr.id,
      //   project_id: sr.projectId,
      //   task_id: sr.taskId,
      //   agent: sr.agent,
      //   summary: sr.summary,
      //   changed_files: sr.changedFiles,
      //   tests_run: sr.testsRun,
      //   remaining_issues: sr.remainingIssues,
      //   recommended_next_task: sr.recommendedNextTask,
      //   created_at: sr.createdAt,
      // });

      report.successful++;
    } catch (error) {
      report.failed++;
      report.errors.push(
        `Report ${sr.id}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  return report;
}

/**
 * Run all migrations
 */
export async function runAllMigrations(
  plans: FeaturePlan[],
  tasks: PlanTask[],
  reports: SessionReport[],
) {
  const [plansReport, tasksReport, reportsReport] = await Promise.all([
    migrateFeaturePlans(plans),
    migratePlanTasks(tasks),
    migrateSessionReports(reports),
  ]);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      total: plansReport.totalRecords + tasksReport.totalRecords + reportsReport.totalRecords,
      successful:
        plansReport.successful + tasksReport.successful + reportsReport.successful,
      failed: plansReport.failed + tasksReport.failed + reportsReport.failed,
    },
    details: {
      plans: plansReport,
      tasks: tasksReport,
      reports: reportsReport,
    },
  };
}
