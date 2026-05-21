import React from "react";
import {
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRightLeft,
} from "lucide-react";

export type RoadmapStatus =
  | "completed"
  | "active"
  | "waiting"
  | "blocked"
  | "user_input_required"
  | "failed"
  | "handoff_needed";

interface RoadmapStatusBadgeProps {
  status: RoadmapStatus;
  className?: string;
}

const statusConfig: Record<
  RoadmapStatus,
  { label: string; icon: React.ElementType; classes: string }
> = {
  completed: {
    label: "✓ 완료",
    icon: CheckCircle2,
    classes:
      "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
  },
  active: {
    label: "진행 중",
    icon: PlayCircle,
    classes:
      "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  waiting: {
    label: "대기 중",
    icon: Clock,
    classes:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  },
  blocked: {
    label: "차단됨",
    icon: AlertTriangle,
    classes:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  user_input_required: {
    label: "사용자 확인 필요",
    icon: HelpCircle,
    classes:
      "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
  },
  failed: {
    label: "실패",
    icon: XCircle,
    classes:
      "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
  handoff_needed: {
    label: "핸드오프 필요",
    icon: ArrowRightLeft,
    classes:
      "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  },
};

export function RoadmapStatusBadge({
  status,
  className = "",
}: RoadmapStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.classes} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
