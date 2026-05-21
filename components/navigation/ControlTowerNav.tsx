"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Target, Cpu, Database, ShieldAlert } from "lucide-react";

const TABS = [
  {
    href: "/plan",
    label: "실행 계획 / 컨트롤 타워",
    englishLabel: "Control Tower",
    icon: Target,
  },
  {
    href: "/prompt-compiler",
    label: "프롬프트 컴파일러",
    englishLabel: "Prompt Compiler",
    icon: Cpu,
  },
  {
    href: "/hermes-packets",
    label: "Hermes 패킷 초안",
    englishLabel: "Hermes Packets",
    icon: Database,
  },
];

export function ControlTowerNav() {
  const pathname = usePathname();

  // Only show this navigation shell on the three control tower-related pages
  const isControlTowerRoute = ["/plan", "/prompt-compiler", "/hermes-packets"].includes(pathname);

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
              이 화면은 프롬프트 및 작업 패킷 초안만 생성하며, 실제 에이전트를 실행하거나 소스 코드를 수정하지 않습니다.
              <span className="block text-[10px] text-amber-500/60 mt-0.5">
                Draft-only control surface. This app prepares prompts and packets. It does not execute agents or modify files.
              </span>
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
