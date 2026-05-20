import {
  createExecutionQueue,
  enqueueTask,
  getNextExecutableTask,
  markRunning,
  markCompleted,
  getQueueStats,
} from "@/lib/orchestration/task-queue";
import type { PlanTask } from "@/lib/types";

// Global queue instance (in-memory, MVP scope)
// NOTE: Queue state is lost on server restart. For production, replace with persistent storage (Redis, database).
// Current behavior is acceptable for MVP but should be addressed before scaling.
let globalQueue = createExecutionQueue(3, {
  "claude-code": 1,
  codex: 2,
  antigravity: 1,
});

export async function POST(req: Request) {
  try {
    const { action, task, taskId, success } = await req.json();

    switch (action) {
      case "enqueue": {
        if (!task) return Response.json({ error: "Task required" }, { status: 400 });
        enqueueTask(globalQueue, task as PlanTask, task.priority || "P1");
        return Response.json({
          success: true,
          message: `Task ${task.id} enqueued`,
          stats: getQueueStats(globalQueue),
        });
      }

      case "next": {
        const nextTask = getNextExecutableTask(globalQueue);
        if (nextTask) {
          markRunning(globalQueue, nextTask.task.id);
          return Response.json({
            success: true,
            task: nextTask.task,
            stats: getQueueStats(globalQueue),
          });
        }
        return Response.json({
          success: false,
          message: "No executable tasks available",
          stats: getQueueStats(globalQueue),
        });
      }

      case "complete": {
        if (!taskId) return Response.json({ error: "taskId required" }, { status: 400 });
        markCompleted(globalQueue, taskId, success ?? false);
        return Response.json({
          success: true,
          message: `Task ${taskId} marked as ${success ? "completed" : "failed"}`,
          stats: getQueueStats(globalQueue),
        });
      }

      case "stats": {
        return Response.json({
          success: true,
          stats: getQueueStats(globalQueue),
          queueSize: globalQueue.tasks.size,
        });
      }

      case "reset": {
        globalQueue = createExecutionQueue(3);
        return Response.json({
          success: true,
          message: "Queue reset",
        });
      }

      default:
        return Response.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Queue operation failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  return Response.json({
    info: "Task execution queue API",
    endpoints: {
      "POST enqueue": "Add task to queue",
      "POST next": "Get next executable task",
      "POST complete": "Mark task as complete/failed",
      "GET stats": "Get queue statistics",
      "POST reset": "Reset queue",
    },
    stats: getQueueStats(globalQueue),
  });
}
