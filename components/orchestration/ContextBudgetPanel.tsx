"use client";

import React from "react";
import type { AgentType, ContextBudget } from "@/lib/types";
import { AlertCircle } from "lucide-react";

interface ContextBudgetPanelProps {
  budgets: ContextBudget[];
  thresholds: Record<AgentType, number>;
}

/**
 * ContextBudgetPanel: Displays token context budget status for all agents.
 *
 * Shows:
 * - Progress bars for each agent
 * - Percentage of context used
 * - Warning indicator at 80% threshold
 * - Job count and token count
 */
export function ContextBudgetPanel({
  budgets,
  thresholds,
}: ContextBudgetPanelProps) {
  if (budgets.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded border border-gray-200">
        <p className="text-sm text-gray-600">No context budget data available.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 bg-white rounded border border-gray-200">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="font-semibold text-lg">Context Budget Status</h3>
        <AlertCircle className="w-4 h-4 text-amber-500" />
      </div>

      {budgets.map((budget) => {
        const threshold = thresholds[budget.agentId] || 100000;
        const percentage = Math.min(
          100,
          Math.round((budget.estimatedTokens / threshold) * 100)
        );
        const isApproaching = percentage >= 80;
        const isExceeded = percentage >= 100;

        return (
          <div
            key={budget.agentId}
            className={`p-3 rounded border ${
              isExceeded
                ? "bg-red-50 border-red-300"
                : isApproaching
                  ? "bg-amber-50 border-amber-300"
                  : "bg-green-50 border-green-300"
            }`}
          >
            {/* Header: Agent name + percentage */}
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-medium text-sm">{budget.agentId}</p>
                <p className="text-xs text-gray-600">
                  {budget.jobCount} job{budget.jobCount !== 1 ? "s" : ""}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={`text-sm font-bold ${
                    isExceeded
                      ? "text-red-700"
                      : isApproaching
                        ? "text-amber-700"
                        : "text-green-700"
                  }`}
                >
                  {percentage}%
                </p>
                <p className="text-xs text-gray-600">
                  {budget.estimatedTokens.toLocaleString()} /{" "}
                  {threshold.toLocaleString()} tokens
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden mb-2">
              <div
                className={`h-full rounded-full transition-all ${
                  isExceeded
                    ? "bg-red-600"
                    : isApproaching
                      ? "bg-amber-500"
                      : "bg-green-600"
                }`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>

            {/* Warning message */}
            {isApproaching && (
              <div className="text-xs mt-2">
                {isExceeded ? (
                  <p className="text-red-700 font-semibold">
                    ⛔ Context limit exceeded. Switch agents immediately.
                  </p>
                ) : (
                  <p className="text-amber-700">
                    ⚠️ Approaching context limit. Consider switching agents or
                    saving a context pack.
                  </p>
                )}
              </div>
            )}

            {/* Token breakdown */}
            <div className="text-xs text-gray-600 mt-2 grid grid-cols-2 gap-1">
              <p>Prompt: {budget.promptChars.toLocaleString()} chars</p>
              <p>Output: {budget.outputChars.toLocaleString()} chars</p>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="text-xs text-gray-600 border-t pt-3 mt-3">
        <p className="font-medium mb-1">Legend:</p>
        <ul className="space-y-1">
          <li>
            <span className="inline-block w-3 h-3 bg-green-600 rounded-full mr-1" />
            Safe (&lt;80%)
          </li>
          <li>
            <span className="inline-block w-3 h-3 bg-amber-500 rounded-full mr-1" />
            Approaching (≥80%)
          </li>
          <li>
            <span className="inline-block w-3 h-3 bg-red-600 rounded-full mr-1" />
            Exceeded (≥100%)
          </li>
        </ul>
      </div>
    </div>
  );
}
