import {
  generateRecoveryPlan,
  executeRecoveryPlan,
  executeRecoveryAction,
  summarizeRecoveryPlan,
  type RecoveryAction,
} from "@/lib/monitor/auto-recovery-engine";

export const runtime = "nodejs";

/**
 * GET /api/hermes/recovery
 * Generates a recovery plan for failed tasks
 *
 * Query parameters:
 *   - includeApprovalRequired: Include high-risk actions (default: false)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeApprovalRequired =
      searchParams.get("includeApprovalRequired") === "true";

    const plan = generateRecoveryPlan();
    const summary = summarizeRecoveryPlan(plan);

    return Response.json({
      plan,
      summary,
      includeApprovalRequired,
      readyForAutomation: plan.readyForAutomation,
      requiresApproval: plan.requiresApproval,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hermes/recovery
 * Executes the recovery plan
 *
 * Body:
 *   - dryRun: Preview mode without actual execution (default: true)
 *   - maxConcurrent: Maximum concurrent tasks (default: 2)
 *   - selectedActions: Array of taskIds to recover (optional, if provided only these are executed)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      dryRun?: boolean;
      maxConcurrent?: number;
      selectedActions?: string[];
    };

    const { dryRun = true, maxConcurrent = 2, selectedActions } = body;
    const plan = generateRecoveryPlan();

    let actionsToExecute = plan.readyForAutomation;

    // Filter to selected actions if provided
    if (selectedActions && selectedActions.length > 0) {
      actionsToExecute = actionsToExecute.filter((a) =>
        selectedActions.includes(a.taskId)
      );
    }

    // Create modified plan for execution
    const executionPlan = {
      ...plan,
      readyForAutomation: actionsToExecute,
      requiresApproval: [],
    };

    const result = await executeRecoveryPlan(executionPlan, {
      dryRun,
      maxConcurrent,
    });

    return Response.json({
      success: true,
      dryRun,
      executed: result.executed,
      succeeded: result.succeeded,
      failed: result.failed,
      results: result.results.map((r) => ({
        taskId: r.action.taskId,
        strategy: r.action.strategy,
        success: r.result.success,
        message: r.result.message,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/hermes/recovery/single
 * Executes a single recovery action
 *
 * Body:
 *   - taskId: Task ID to recover
 *   - dryRun: Preview mode (default: true)
 */
export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as {
      taskId: string;
      dryRun?: boolean;
    };

    const { taskId, dryRun = true } = body;
    const plan = generateRecoveryPlan();

    const action = plan.readyForAutomation.find((a) => a.taskId === taskId);
    if (!action) {
      return Response.json(
        { error: `No auto-recoverable action found for task ${taskId}` },
        { status: 404 }
      );
    }

    const result = await executeRecoveryAction(action, dryRun);

    return Response.json({
      success: result.success,
      taskId,
      strategy: action.strategy,
      message: result.message,
      dryRun,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return Response.json({ error: message }, { status: 500 });
  }
}
