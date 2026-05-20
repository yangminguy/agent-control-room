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

const STATUS_STYLES: Record<
  PlanTaskStatus,
  {
    label: string;
    textColor: string;
    Icon: React.ComponentType<{ size: number; className: string }>;
  }
> = {
  planned: {
    label: "Planned",
    textColor: "text-zinc-400",
    Icon: Circle,
  },
  ready: {
    label: "Ready",
    textColor: "text-pink-500",
    Icon: Clock,
  },
  running: {
    label: "Running",
    textColor: "text-pink-500",
    Icon: Loader2,
  },
  done: {
    label: "Done",
    textColor: "text-green-600",
    Icon: CheckCircle2,
  },
  partial: {
    label: "Partial",
    textColor: "text-amber-500",
    Icon: AlertCircle,
  },
  blocked: {
    label: "Blocked",
    textColor: "text-red-600",
    Icon: AlertTriangle,
  },
  needs_review: {
    label: "Review",
    textColor: "text-pink-500",
    Icon: Eye,
  },
};

interface StatusBadgeProps {
  status: PlanTaskStatus;
  compact?: boolean;
}

export function StatusBadge({ status, compact = false }: StatusBadgeProps) {
  const style = STATUS_STYLES[status];
  const Icon = style.Icon;
  const isAnimated = status === "running";

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium bg-zinc-900 ${style.textColor}`}
        title={style.label}
      >
        <Icon
          size={12}
          className={isAnimated ? "animate-spin" : ""}
        />
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium bg-zinc-900 ${style.textColor}`}
    >
      <Icon
        size={16}
        className={isAnimated ? "animate-spin" : ""}
      />
      <span>{style.label}</span>
    </span>
  );
}
