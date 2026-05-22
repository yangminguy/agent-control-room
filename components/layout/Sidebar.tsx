"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Target,
  Settings,
} from "lucide-react";

export const NAV_ITEMS = [
  { href: "/", label: "기획 채팅", icon: LayoutDashboard },
  { href: "/plan", label: "Phase 로드맵", icon: Target },
  { href: "/projects", label: "고급 도구", icon: Settings },
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
