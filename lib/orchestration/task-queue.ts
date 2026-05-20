/**
 * T038 & T039: Parallel Execution Queue & Conditional Branching
 *
 * Manage multiple tasks with resource limits and conditional rules.
 */

import type { PlanTask } from "@/lib/types";

export type TaskPriority = "P0" | "P1" | "P2" | "P3";

export interface QueuedTask {
  task: PlanTask;
  priority: TaskPriority;
  enqueuedAt: Date;
  status: "queued" | "running" | "completed" | "failed";
}

export interface ExecutionQueue {
  tasks: Map<string, QueuedTask>;
  running: Set<string>;
  maxConcurrent: number;
  agentLimits: Map<string, number>; // max concurrent per agent
}

export interface ConditionalRule {
  id: string;
  trigger: string; // e.g. "test_failed", "compilation_error"
  action: string; // e.g. "create_debug_task", "retry", "escalate"
  targetAgent?: string;
  params?: Record<string, unknown>;
}

/**
 * Create execution queue with resource limits
 */
export function createExecutionQueue(
  maxConcurrent: number = 3,
  agentLimits: Record<string, number> = {
    "claude-code": 1,
    codex: 2,
    antigravity: 1,
  },
): ExecutionQueue {
  return {
    tasks: new Map(),
    running: new Set(),
    maxConcurrent,
    agentLimits: new Map(Object.entries(agentLimits)),
  };
}

/**
 * Enqueue task for execution
 */
export function enqueueTask(queue: ExecutionQueue, task: PlanTask, priority: TaskPriority): void {
  queue.tasks.set(task.id, {
    task,
    priority,
    enqueuedAt: new Date(),
    status: "queued",
  });
}

/**
 * Get next executable task respecting limits
 */
export function getNextExecutableTask(queue: ExecutionQueue): QueuedTask | null {
  if (queue.running.size >= queue.maxConcurrent) {
    return null;
  }

  // Sort by priority
  const queued = Array.from(queue.tasks.values())
    .filter((t) => t.status === "queued")
    .sort((a, b) => {
      const priorityOrder: Record<TaskPriority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

  // Check agent limits
  for (const qTask of queued) {
    const agentLimit = queue.agentLimits.get(qTask.task.assignedAgent) || 1;
    const agentRunning = Array.from(queue.running).filter((id) => {
      const t = queue.tasks.get(id);
      return t?.task.assignedAgent === qTask.task.assignedAgent;
    }).length;

    if (agentRunning < agentLimit) {
      return qTask;
    }
  }

  return null;
}

/**
 * Mark task as running
 */
export function markRunning(queue: ExecutionQueue, taskId: string): void {
  const qTask = queue.tasks.get(taskId);
  if (qTask) {
    qTask.status = "running";
    queue.running.add(taskId);
  }
}

/**
 * Mark task as completed
 */
export function markCompleted(queue: ExecutionQueue, taskId: string, success: boolean): void {
  const qTask = queue.tasks.get(taskId);
  if (qTask) {
    qTask.status = success ? "completed" : "failed";
    queue.running.delete(taskId);
  }
}

/**
 * T039: Evaluate conditional rules based on execution result
 */
export function evaluateConditionalRules(
  result: {
    taskId: string;
    success: boolean;
    errorType?: string;
    judgment?: "completed" | "partial" | "not_completed";
  },
  rules: ConditionalRule[],
): ConditionalRule | null {
  // Match rules based on result
  if (!result.success && result.errorType === "compilation_error") {
    return rules.find((r) => r.trigger === "compilation_error") || null;
  }

  if (result.judgment === "partial") {
    return rules.find((r) => r.trigger === "partial_completion") || null;
  }

  if (result.judgment === "not_completed") {
    return rules.find((r) => r.trigger === "task_failed") || null;
  }

  return null;
}

/**
 * Generate next task based on conditional rule
 */
export function executeConditionalAction(
  triggeredRule: ConditionalRule,
  originalTask: PlanTask,
): PlanTask | null {
  if (triggeredRule.action === "create_debug_task") {
    return {
      ...originalTask,
      id: `debug-${originalTask.id}`,
      title: `[DEBUG] ${originalTask.title}`,
      description: `Debug task for: ${originalTask.title}\n\nPrevious error: ${triggeredRule.params?.error || "unknown"}`,
      status: "planned",
      assignedAgent: triggeredRule.targetAgent || "claude-code",
      priority: "P0",
    };
  }

  if (triggeredRule.action === "retry") {
    return {
      ...originalTask,
      status: "planned",
    };
  }

  if (triggeredRule.action === "escalate") {
    return {
      ...originalTask,
      id: `escalate-${originalTask.id}`,
      title: `[ESCALATED] ${originalTask.title}`,
      assignedAgent: "claude-code" as const, // Always escalate to Claude Code
      priority: "P0",
      status: "planned",
    };
  }

  return null;
}

/**
 * T040: Generate next task recommendation from synthesis
 */
export function recommendNextTask(
  completedTask: PlanTask,
  patterns: {
    taskType: string;
    commonFollowups: string[];
    successRate: number;
  }[],
): PlanTask | null {
  // Find similar task patterns
  const pattern = patterns.find((p) => p.taskType === completedTask.title);

  if (pattern && pattern.commonFollowups.length > 0) {
    const nextTaskTitle = pattern.commonFollowups[0];

    return {
      id: `next-${completedTask.id}`,
      planId: completedTask.planId,
      title: nextTaskTitle,
      description: `Recommended next task based on completion of: ${completedTask.title}`,
      status: "planned",
      assignedAgent: completedTask.assignedAgent,
      priority: "P1",
      acceptanceCriteria: [],
      subAgentTracks: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

/**
 * Queue statistics
 */
export function getQueueStats(queue: ExecutionQueue) {
  return {
    total: queue.tasks.size,
    queued: Array.from(queue.tasks.values()).filter((t) => t.status === "queued").length,
    running: queue.running.size,
    completed: Array.from(queue.tasks.values()).filter((t) => t.status === "completed").length,
    failed: Array.from(queue.tasks.values()).filter((t) => t.status === "failed").length,
    utilization: `${queue.running.size}/${queue.maxConcurrent}`,
  };
}
