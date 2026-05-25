"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Target,
  ShieldAlert,
  Cpu,
  Package,
  ClipboardCheck,
  Play,
} from "lucide-react";

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
  {
    href: "/orchestration",
    label: "실행 오케스트레이션",
    englishLabel: "Orchestration",
    icon: Play,
  },
  {
    href: "/agent-status",
    label: "에이전트 상태",
    englishLabel: "Agent Status",
    icon: Cpu,
  },
  {
    href: "/hermes-packets",
    label: "Hermes 패킷",
    englishLabel: "Hermes Packets",
    icon: Package,
  },
  {
    href: "/result-review",
    label: "실행 결과 검증",
    englishLabel: "Result Review",
    icon: ClipboardCheck,
  },
];

export function ControlTowerNav() {
  const pathname = usePathname();

  const isControlTowerRoute = [
    "/",
    "/plan",
    "/orchestration",
    "/agent-status",
    "/hermes-packets",
    "/result-review",
  ].includes(pathname);

  if (!isControlTowerRoute) {
    return null;
  }

  return (
    <div className="w-full bg-white border-b border-zinc-200 sticky top-[57px] z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-0 gap-4">
          
          {/* Tabs Navigation */}
          <nav className="flex items-center gap-6 overflow-x-auto no-scrollbar scroll-smooth">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = pathname === tab.href;

              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 transition-all whitespace-nowrap text-sm font-medium -mb-[2px] ${
                    isActive
                      ? "border-pink-600 text-pink-600 font-semibold"
                      : "border-transparent text-zinc-500 hover:text-zinc-900 hover:border-zinc-300"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? "text-pink-600" : "text-zinc-400"}`} />
                  <span>{tab.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Safety Notice Block */}
          <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/10 px-3 py-1 my-2 rounded-lg max-w-full md:max-w-md shrink-0">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <p className="text-[11px] text-amber-600 font-medium leading-tight">
              <span className="font-semibold">초안 제어판:</span> 실제 실행은 수동 실행 버튼을 누른 뒤에만 시작됩니다.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
