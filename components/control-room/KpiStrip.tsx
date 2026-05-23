import React from "react";
import { Target, Cpu, AlertTriangle, HelpCircle } from "lucide-react";

interface KpiStripProps {
  overallProgress: number;
  activeAgentsCount: number;
  blockersCount: number;
  decisionsCount: number;
}

export function KpiStrip({
  overallProgress,
  activeAgentsCount,
  blockersCount,
  decisionsCount,
}: KpiStripProps) {
  const cards = [
    {
      label: "전체 진행률",
      value: `${overallProgress}%`,
      icon: Target,
      iconColor: "text-pink-primary",
      bgGlow: "group-hover:shadow-[0_0_15px_rgba(236,72,153,0.15)]",
    },
    {
      label: "활성 에이전트",
      value: `${activeAgentsCount} 에이전트`,
      icon: Cpu,
      iconColor: "text-blue-400",
      bgGlow: "group-hover:shadow-[0_0_15px_rgba(96,165,250,0.15)]",
    },
    {
      label: "감지된 장애물",
      value: `${blockersCount} 건`,
      icon: AlertTriangle,
      iconColor: blockersCount > 0 ? "text-red-400" : "text-text-secondary/40",
      bgGlow: blockersCount > 0 ? "group-hover:shadow-[0_0_15px_rgba(248,113,113,0.15)]" : "",
    },
    {
      label: "승인/의사결정",
      value: `${decisionsCount} 건 대기 중`,
      icon: HelpCircle,
      iconColor: decisionsCount > 0 ? "text-amber-400 animate-status-ping" : "text-text-secondary/40",
      bgGlow: decisionsCount > 0 ? "group-hover:shadow-[0_0_15px_rgba(251,191,36,0.15)]" : "",
    },
  ];

  return (
    <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in">
      {cards.map((card, index) => {
        const Icon = card.icon;
        return (
          <div
            key={index}
            className={`group relative overflow-hidden rounded-xl border border-border bg-surface p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-pink-primary/30 ${card.bgGlow}`}
          >
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-surface-2 rounded-lg border border-border/80 group-hover:border-pink-primary/10 transition-colors">
                <Icon className={`w-5 h-5 ${card.iconColor}`} />
              </div>
              <div>
                <p className="text-[11px] text-text-secondary font-medium uppercase tracking-wider">
                  {card.label}
                </p>
                <p className="text-xl font-bold text-text-primary mt-1">
                  {card.value}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
