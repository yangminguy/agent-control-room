"use client";

import { useState, type ReactNode } from "react";

interface PackTabsProps {
  contextPackSlot: ReactNode;
  handoffPackSlot: ReactNode;
}

const TABS = [
  { id: "context", label: "Context Pack", desc: "토큰 한계 / 세션 리셋" },
  { id: "handoff", label: "Handoff Pack", desc: "에이전트 전환" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function PackTabs({ contextPackSlot, handoffPackSlot }: PackTabsProps) {
  const [active, setActive] = useState<TabId>("context");

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-border bg-surface-2 p-1 w-fit">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className={`flex flex-col items-start px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
              active === tab.id
                ? "bg-pink-primary/10 text-pink-primary border border-pink-primary/20"
                : "text-text-secondary hover:text-text-primary hover:bg-surface border border-transparent"
            }`}
          >
            <span className="font-semibold">{tab.label}</span>
            <span className="text-[11px] opacity-75 font-normal">{tab.desc}</span>
          </button>
        ))}
      </div>

      {/* Slot */}
      <div>
        {active === "context" ? contextPackSlot : handoffPackSlot}
      </div>
    </div>
  );
}
