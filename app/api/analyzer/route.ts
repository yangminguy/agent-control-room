import { analyzeDiff, mapJudgmentToTaskStatus } from "@/lib/analyzer/git-diff-analyzer";
import { getFeaturePlanById, updateKanbanCardResult } from "@/lib/storage/feature-plan-store";
import { getExecutionLogByTaskId } from "@/lib/storage/execution-log-store";
import { validateCwdSafety } from "@/lib/runner/git-utils";

export async function POST(request: Request) {
  try {
    const body = await request.json() as {
      planId: string;
      taskId: string;
      cwd: string;
    };

    const { planId, taskId, cwd } = body;

    // Security: Validate cwd against path traversal
    const projectRoot = process.cwd();
    if (!validateCwdSafety(cwd, projectRoot)) {
      return Response.json(
        { error: "Invalid working directory path. Path traversal detected or path is outside project scope." },
        { status: 403 }
      );
    }

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
    const taskIdsByJudgment = {
      completedTaskIds:
        analysisResult.completionJudgment === "completed" ? [taskId] : [],
      partialTaskIds:
        analysisResult.completionJudgment === "partial" ? [taskId] : [],
      blockedTaskIds:
        analysisResult.completionJudgment === "not_completed" ||
        analysisResult.completionJudgment === "pending"
          ? [taskId]
          : [],
    };
    const enrichedAnalysis = {
      ...analysisResult,
      ...taskIdsByJudgment,
    };

    // Update KanbanCard fields in feature plan
    const updatedPlan = await updateKanbanCardResult(
      planId,
      taskId,
      {
        changedFiles: enrichedAnalysis.changedFiles,
        diffSummary: enrichedAnalysis.diffSummary,
        completionJudgment: enrichedAnalysis.completionJudgment,
        nextPrompt: enrichedAnalysis.nextPrompt,
        status: newTaskStatus,
      }
    );

    // Get execution log for reference (optional)
    const executionLog = await getExecutionLogByTaskId(taskId);

    return Response.json({
      success: true,
      analysis: enrichedAnalysis,
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
