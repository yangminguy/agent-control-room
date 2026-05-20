"use client";

import type { PlanTaskStatus } from "@/lib/types";

const STATUS_STYLES: Record<
  PlanTaskStatus,
  { label: string; bg: string; text: string; icon: string }
> = {
  planned: {
    label: "Planned",
    bg: "bg-gray-100 dark:bg-gray-800",
    text: "text-gray-700 dark:text-gray-300",
    icon: "○",
  },
  ready: {
    label: "Ready",
    bg: "bg-blue-100 dark:bg-blue-900",
    text: "text-blue-700 dark:text-blue-300",
    icon: "⏱",
  },
  running: {
    label: "Running",
    bg: "bg-amber-100 dark:bg-amber-900",
    text: "text-amber-700 dark:text-amber-300",
    icon: "⚙",
  },
  done: {
    label: "Done",
    bg: "bg-green-100 dark:bg-green-900",
    text: "text-green-700 dark:text-green-300",
    icon: "✓",
  },
  partial: {
    label: "Partial",
    bg: "bg-orange-100 dark:bg-orange-900",
    text: "text-orange-700 dark:text-orange-300",
    icon: "◐",
  },
  blocked: {
    label: "Blocked",
    bg: "bg-red-100 dark:bg-red-900",
    text: "text-red-700 dark:text-red-300",
    icon: "⚠",
  },
  needs_review: {
    label: "Review",
    bg: "bg-purple-100 dark:bg-purple-900",
    text: "text-purple-700 dark:text-purple-300",
    icon: "👁",
  },
};

interface StatusBadgeProps {
  status: PlanTaskStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${style.bg} ${style.text}`}
        title={style.label}
      >
        {style.icon}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium ${style.bg} ${style.text}`}
    >
      <span>{style.icon}</span>
      <span>{style.label}</span>
    </span>
  );
}
