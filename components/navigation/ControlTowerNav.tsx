"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Target, ShieldAlert } from "lucide-react";

const TABS = [
  {
    href: "/",
    label: "기획 채팅",
    englishLabel: "Planning Chat",
    icon: MessageSquare,
  },
  {
    href: "/plan",
    label: "Phase 로드맵",
    englishLabel: "Roadmap",
    icon: Target,
  },
];

export function ControlTowerNav() {
  const pathname = usePathname();

  const isControlTowerRoute = ["/", "/plan"].includes(pathname);

  if (!isControlTowerRoute) {
    return null;
  }

  return (
    <div className="w-full bg-surface/50 border-b border-border backdrop-blur-md sticky top-[57px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-2.5 gap-4">
          
          {/* Tabs Navigation */}
          <nav className="flex items-center gap-1 overflow-x-auto no-scrollbar scroll-smooth">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-pink-primary/10 text-pink-primary border border-pink-primary/20 shadow-sm"
                      : "text-text-secondary hover:text-text-primary hover:bg-surface-2/60 border border-transparent"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-pink-primary" : "text-text-secondary"}`} />
                  <div className="flex flex-col items-start leading-tight">
                    <span>{tab.label}</span>
                    <span className="text-[10px] opacity-75 font-normal">{tab.englishLabel}</span>
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Safety Notice Block */}
          <div className="flex items-center gap-2.5 bg-amber-500/5 border border-amber-500/20 px-3.5 py-1.5 rounded-lg max-w-full md:max-w-md shrink-0">
            <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-500/90 font-medium leading-normal">
              <span className="font-semibold block sm:inline">초안 전용 제어판:</span>{" "}
              채팅과 계획 고정은 실행하지 않습니다. 실제 실행은 사용자가 실행 버튼을 누른 뒤에만 시작됩니다.
              <span className="block text-[10px] text-amber-500/60 mt-0.5">
                Planning is safe by default. Execution requires explicit user action.
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
