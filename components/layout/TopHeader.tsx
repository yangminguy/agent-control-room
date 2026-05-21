"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Settings, Menu, X, ShieldAlert } from "lucide-react";
import { NAV_ITEMS } from "./Sidebar";

export function TopHeader() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
        <div className="flex items-center gap-4">
          {/* 모바일 햄버거 메뉴 버튼 */}
          <button
            onClick={toggleMobileMenu}
            className="md:hidden text-text-secondary hover:text-text-primary p-1.5 rounded-lg hover:bg-surface-2 transition-colors"
            aria-label="메뉴 열기"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded bg-pink-primary flex items-center justify-center text-background font-bold text-lg animate-pulse">
              A
            </div>
            <span className="font-bold text-lg text-text-primary group-hover:text-pink-soft transition-colors">
              Agent Control Room
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-full transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="p-2 text-text-secondary hover:text-text-primary hover:bg-surface-2 rounded-full transition-colors">
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 모바일 메뉴 오버레이 */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* 백드롭 */}
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={closeMobileMenu}
          />
          
          {/* 드로워 패널 */}
          <div className="fixed inset-y-0 left-0 w-[280px] bg-surface border-r border-border p-6 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-out transform translate-x-0">
            <div>
              {/* 드로워 헤더 */}
              <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded bg-pink-primary flex items-center justify-center text-background font-bold text-sm">
                    A
                  </div>
                  <span className="font-bold text-md text-text-primary">
                    Control Room
                  </span>
                </div>
                <button
                  onClick={closeMobileMenu}
                  className="p-1 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-2 transition-colors"
                  aria-label="메뉴 닫기"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 드로워 내비게이션 링크 */}
              <nav className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={closeMobileMenu}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        isActive
                          ? "bg-pink-primary/10 text-pink-primary"
                          : "text-text-secondary hover:text-text-primary hover:bg-surface-2"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </div>

            {/* 드로워 하단 안전 정보 */}
            <div className="pt-4 border-t border-border mt-auto">
              <div className="bg-amber-500/5 border border-amber-500/10 p-3 rounded-lg flex gap-2 items-start">
                <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-500/90 leading-relaxed">
                  <span className="font-semibold block mb-0.5">초안 전용 제어판</span>
                  이 앱은 프롬프트/패킷 초안만 준비하며 에이전트를 자동 실행하지 않습니다.
                </p>
              </div>
              <p className="text-[10px] text-text-secondary text-center mt-4">
                Agent Control Room v1.0
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
