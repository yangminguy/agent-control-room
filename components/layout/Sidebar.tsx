"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Target,
  LayoutDashboard,
  FolderOpen,
  Cpu,
  ClipboardCheck,
  Package,
  ArrowLeftRight,
  FileText,
} from "lucide-react";

export const CORE_ITEMS = [
  { href: "/", label: "기획 채팅", icon: MessageSquare },
  { href: "/plan", label: "Phase 로드맵", icon: Target },
  { href: "/dashboard", label: "통합 대시보드", icon: LayoutDashboard },
];

export const ADVANCED_ITEMS = [
  { href: "/projects", label: "프로젝트 관리", icon: FolderOpen },
  { href: "/agent-status", label: "에이전트 상태", icon: Cpu },
  { href: "/result-review", label: "실행 결과 검증", icon: ClipboardCheck },
  { href: "/hermes-packets", label: "Hermes 패킷", icon: Package },
  { href: "/handoffs", label: "핸드오프 리스트", icon: ArrowLeftRight },
  { href: "/reports", label: "세션 리포트", icon: FileText },
];

export function Sidebar() {
  const pathname = usePathname();

  const renderNavGroup = (title: string, items: typeof CORE_ITEMS) => (
    <div className="space-y-2">
      <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
        {title}
      </p>
      <div className="space-y-1">
        {items.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:translate-x-1 ${
                isActive
                  ? "bg-pink-50/60 text-pink-600 border border-pink-200"
                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 border border-transparent"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform ${
                isActive ? "text-pink-600" : "text-zinc-400 group-hover:text-zinc-500"
              }`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <aside className="w-[240px] flex flex-col bg-white border-r border-zinc-200 min-h-[calc(100vh-57px)]">
      <nav className="flex-1 py-6 px-4 space-y-6">
        {renderNavGroup("Core Tools", CORE_ITEMS)}
        {renderNavGroup("Advanced Tools", ADVANCED_ITEMS)}
      </nav>
      <div className="p-4 border-t border-zinc-200">
        <p className="text-xs text-zinc-400 text-center">
          Agent Control Room v1.0
        </p>
      </div>
    </aside>
  );
}

