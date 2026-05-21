import React from "react";
import { Bot, User, Cpu, Workflow, BrainCircuit, Code2, Layout, Server } from "lucide-react";

interface AgentBadgeProps {
  agent: string;
  className?: string;
}

type AgentConfig = {
  icon: React.ElementType;
  classes: string;
  displayName: string;
};

const getAgentConfig = (agentName: string): AgentConfig => {
  const normalized = agentName.toLowerCase();

  if (normalized.includes("claude")) {
    return {
      icon: BrainCircuit,
      classes:
        "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800/50",
      displayName: "Claude Code",
    };
  }
  if (normalized.includes("codex")) {
    return {
      icon: Cpu,
      classes:
        "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800/50",
      displayName: "Codex",
    };
  }
  if (normalized.includes("antigravity")) {
    return {
      icon: Layout,
      classes:
        "bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800/50",
      displayName: "Antigravity",
    };
  }
  if (normalized.includes("hermes")) {
    return {
      icon: Bot,
      classes:
        "bg-teal-100 text-teal-800 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800/50",
      displayName: "Hermes",
    };
  }
  if (normalized.includes("vibe") || normalized.includes("kanban")) {
    return {
      icon: Workflow,
      classes:
        "bg-pink-100 text-pink-800 border-pink-200 dark:bg-pink-900/30 dark:text-pink-400 dark:border-pink-800/50",
      displayName: "Vibe Kanban",
    };
  }
  if (normalized.includes("manual") || normalized.includes("user")) {
    return {
      icon: User,
      classes:
        "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800/50",
      displayName: "사용자 직접",
    };
  }
  if (normalized.includes("frontend")) {
    return {
      icon: Layout,
      classes:
        "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-800/50",
      displayName: "프론트엔드",
    };
  }
  if (normalized.includes("backend")) {
    return {
      icon: Server,
      classes:
        "bg-cyan-100 text-cyan-800 border-cyan-200 dark:bg-cyan-900/30 dark:text-cyan-400 dark:border-cyan-800/50",
      displayName: "백엔드",
    };
  }

  return {
    icon: Code2,
    classes:
      "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    displayName: agentName,
  };
};

export function AgentBadge({ agent, className = "" }: AgentBadgeProps) {
  if (!agent) return null;

  const config = getAgentConfig(agent);
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border ${config.classes} ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.displayName}
    </span>
  );
}
