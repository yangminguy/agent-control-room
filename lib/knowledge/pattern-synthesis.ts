/**
 * T032: Execution Pattern Detection & Synthesis
 *
 * Analyze execution history to identify patterns that improve future routing.
 */

import type { AgentRecommendation } from "@/lib/routing/intelligent-router";

export interface ExecutionMetrics {
  agent_id: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageTimeMinutes: number;
  averageTokensUsed: number;
  successRate: number;
}

export interface TaskTypePattern {
  taskType: string; // e.g. "ui-design", "backend-api", "testing"
  bestAgent: string;
  secondBestAgent: string;
  successRate: number;
  averageTime: number;
  frequency: number; // how often this task type appears
}

export interface ExecutionPattern {
  metrics: Record<string, ExecutionMetrics>;
  patterns: TaskTypePattern[];
  insights: string[];
  recommendations: string[];
}

/**
 * Analyze execution logs to build pattern database
 */
export function synthesizeExecutionPatterns(
  executionHistory: Array<{
    agent_id: string;
    task_type: string;
    success: boolean;
    timeMinutes: number;
    tokensUsed: number;
  }>,
): ExecutionPattern {
  const metrics: Record<string, ExecutionMetrics> = {};
  const taskPatterns: Record<string, { agents: Record<string, number>; times: number[]; successes: number }> = {};

  // Build agent metrics
  executionHistory.forEach((exec) => {
    // Agent metrics
    if (!metrics[exec.agent_id]) {
      metrics[exec.agent_id] = {
        agent_id: exec.agent_id,
        totalExecutions: 0,
        successfulExecutions: 0,
        failedExecutions: 0,
        averageTimeMinutes: 0,
        averageTokensUsed: 0,
        successRate: 0,
      };
    }

    const metric = metrics[exec.agent_id];
    metric.totalExecutions++;
    metric.averageTimeMinutes = (metric.averageTimeMinutes * (metric.totalExecutions - 1) + exec.timeMinutes) / metric.totalExecutions;
    metric.averageTokensUsed = (metric.averageTokensUsed * (metric.totalExecutions - 1) + exec.tokensUsed) / metric.totalExecutions;

    if (exec.success) {
      metric.successfulExecutions++;
    } else {
      metric.failedExecutions++;
    }

    metric.successRate = metric.successfulExecutions / metric.totalExecutions;

    // Task pattern
    if (!taskPatterns[exec.task_type]) {
      taskPatterns[exec.task_type] = { agents: {}, times: [], successes: 0 };
    }

    const pattern = taskPatterns[exec.task_type];
    pattern.agents[exec.agent_id] = (pattern.agents[exec.agent_id] || 0) + 1;
    pattern.times.push(exec.timeMinutes);
    if (exec.success) pattern.successes++;
  });

  // Build task type patterns
  const patterns: TaskTypePattern[] = Object.entries(taskPatterns).map(([taskType, data]) => {
    const agentEntries = Object.entries(data.agents).sort((a, b) => b[1] - a[1]);
    const bestAgent = agentEntries[0]?.[0] || "unknown";
    const secondBestAgent = agentEntries[1]?.[0] || "unknown";

    const avgTime = data.times.reduce((a, b) => a + b, 0) / data.times.length;
    const successRate = data.successes / data.times.length;

    return {
      taskType,
      bestAgent,
      secondBestAgent,
      successRate,
      averageTime: avgTime,
      frequency: data.times.length,
    };
  });

  // Generate insights
  const insights: string[] = [];

  // Top performing agents
  const topAgents = Object.entries(metrics)
    .sort((a, b) => b[1].successRate - a[1].successRate)
    .slice(0, 3);

  topAgents.forEach(([agentId, metric]) => {
    if (metric.totalExecutions >= 5) {
      insights.push(
        `🌟 ${agentId}: ${(metric.successRate * 100).toFixed(0)}% success rate (${metric.totalExecutions} executions)`,
      );
    }
  });

  // Task type insights
  const strongPatterns = patterns.filter((p) => p.successRate > 0.8);
  if (strongPatterns.length > 0) {
    insights.push(`✓ ${strongPatterns.length} task types have strong patterns (>80% success)`);
  }

  // Generate recommendations
  const recommendations: string[] = [];

  // Recommend agent updates based on success rates
  recommendations.push("💡 Use historical success rates to inform future agent routing");

  // Identify weak patterns
  const weakPatterns = patterns.filter((p) => p.successRate < 0.6);
  if (weakPatterns.length > 0) {
    recommendations.push(`⚠️ ${weakPatterns.length} task types have low success (<60%) - consider multi-agent approach`);
  }

  // Time optimization
  const slowTasks = patterns.filter((p) => p.averageTime > 60);
  if (slowTasks.length > 0) {
    recommendations.push(`⏱️ ${slowTasks.length} task types average >60 min - consider breaking into smaller tasks`);
  }

  return {
    metrics,
    patterns,
    insights,
    recommendations,
  };
}

/**
 * Use patterns to improve agent recommendation confidence
 */
export function adjustAgentScoreByPattern(
  agent_id: string,
  taskType: string,
  baseScore: number,
  pattern: ExecutionPattern,
): number {
  const metric = pattern.metrics[agent_id];
  if (!metric || metric.totalExecutions < 3) {
    return baseScore; // Not enough data
  }

  // Boost score by success rate
  const successBoost = metric.successRate * 20;

  // Check if this agent is recommended for this task type
  const relevantPattern = pattern.patterns.find((p) => p.taskType === taskType);
  if (relevantPattern) {
    if (relevantPattern.bestAgent === agent_id) {
      return baseScore + successBoost + 15;
    } else if (relevantPattern.secondBestAgent === agent_id) {
      return baseScore + successBoost + 5;
    }
  }

  return baseScore + successBoost;
}
