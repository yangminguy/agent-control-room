import { analyzeDiff, mapJudgmentToTaskStatus } from "@/lib/analyzer/git-diff-analyzer";
import { getFeaturePlanById, updateKanbanCardResult } from "@/lib/storage/feature-plan-store";
import { getExecutionLogByTaskId } from "@/lib/storage/execution-log-store";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      planId: string;
      taskId: string;
      cwd: string;
    };

    const { planId, taskId, cwd } = body;

    // Get plan and task
    const plan = await getFeaturePlanById(planId);
    if (!plan) {
      return Response.json(
        { error: `Plan not found: ${planId}` },
        { status: 404 }
      );
    }

    const planTask = plan.tasks.find((t) => t.id === taskId);
    if (!planTask) {
      return Response.json(
        { error: `Task not found in plan: ${taskId}` },
        { status: 404 }
      );
    }

    // Get acceptance criteria from task
    const acceptanceCriteria = planTask.acceptanceCriteria || [];

    // Analyze diff
    const analysisResult = await analyzeDiff({
      cwd,
      branchName: planTask.branchName,
      acceptanceCriteria,
    });

    // Map completion judgment to task status
    const newTaskStatus = mapJudgmentToTaskStatus(analysisResult.completionJudgment);

    // Update KanbanCard fields in feature plan
    const updatedPlan = await updateKanbanCardResult(
      planId,
      taskId,
      {
        changedFiles: analysisResult.changedFiles,
        diffSummary: analysisResult.diffSummary,
        completionJudgment: analysisResult.completionJudgment,
        nextPrompt: analysisResult.nextPrompt,
        status: newTaskStatus,
      }
    );

    // Get execution log for reference (optional)
    const executionLog = await getExecutionLogByTaskId(taskId);

    return Response.json({
      success: true,
      analysis: analysisResult,
      taskStatus: newTaskStatus,
      executionLogId: executionLog?.id,
      updatedTask: updatedPlan.tasks.find((t) => t.id === taskId),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: message },
      { status: 500 }
    );
  }
}
