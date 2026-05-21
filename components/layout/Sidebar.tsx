"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  FolderKanban,
  Bot,
  ArrowRightLeft,
  FileText,
  Cpu,
  Database,
  Lightbulb,
  ClipboardCheck,
  PackageOpen,
  BrainCircuit,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "대시보드", icon: LayoutDashboard },
  { href: "/plan", label: "실행 계획", icon: Target },
  { href: "/projects", label: "프로젝트", icon: FolderKanban },
  { href: "/agent-status", label: "에이전트 상태", icon: Bot },
  { href: "/prompt-compiler", label: "프롬프트 컴파일러", icon: Cpu },
  { href: "/hermes-packets", label: "Hermes 패킷 초안", icon: Database },
  { href: "/memory", label: "메모리 & 인사이트", icon: BrainCircuit },
  { href: "/context-pack", label: "Context / Handoff Pack", icon: PackageOpen },
  { href: "/handoffs", label: "핸드오프", icon: ArrowRightLeft },
  { href: "/reports", label: "리포트", icon: FileText },
  { href: "/result-review", label: "결과 리뷰", icon: ClipboardCheck },
  { href: "/advisor", label: "어드바이저", icon: Lightbulb },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[240px] flex flex-col bg-surface-2 border-r border-border min-h-[calc(100vh-57px)]">
      <nav className="flex-1 py-6 px-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-pink-primary/10 text-pink-primary"
                  : "text-text-secondary hover:text-text-primary hover:bg-surface"
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-border">
        <p className="text-xs text-text-secondary text-center">
          Agent Control Room v1.0
        </p>
      </div>
    </aside>
  );
}
