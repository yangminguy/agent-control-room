"use client";

import type { PlanTaskStatus } from "@/lib/types";
import {
  Circle,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";

type StatusStyle = {
  label: string;
  textColor: string;
};

const STATUS_STYLES: Record<PlanTaskStatus, StatusStyle> = {
  planned: {
    label: "Planned",
    textColor: "text-zinc-400",
  },
  ready: {
    label: "Ready",
    textColor: "text-pink-primary",
  },
  running: {
    label: "Running",
    textColor: "text-pink-primary",
  },
  done: {
    label: "Done",
    textColor: "text-green-600",
  },
  partial: {
    label: "Partial",
    textColor: "text-amber-500",
  },
  blocked: {
    label: "Blocked",
    textColor: "text-red-600",
  },
  needs_review: {
    label: "Review",
    textColor: "text-pink-primary",
  },
};

function getStatusIcon(status: PlanTaskStatus, size: number = 16, isAnimated: boolean = false) {
  const iconClass = isAnimated ? "animate-spin" : "";
  switch (status) {
    case "planned":
      return <Circle size={size} className={iconClass} />;
    case "ready":
      return <Clock size={size} className={iconClass} />;
    case "running":
      return <Loader2 size={size} className={`${iconClass} animate-spin`} />;
    case "done":
      return <CheckCircle2 size={size} className={iconClass} />;
    case "partial":
      return <AlertCircle size={size} className={iconClass} />;
    case "blocked":
      return <AlertTriangle size={size} className={iconClass} />;
    case "needs_review":
      return <Eye size={size} className={iconClass} />;
  }
}

interface StatusBadgeProps {
  status: PlanTaskStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-zinc-900 ${style.textColor}`}
        title={style.label}
      >
        {getStatusIcon(status, 12)}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-900 ${style.textColor}`}
    >
      {getStatusIcon(status, 16)}
      <span>{style.label}</span>
    </span>
  );
}
