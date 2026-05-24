import type { Metadata } from "next";
import "./globals.css";

import { Sidebar } from "@/components/layout/Sidebar";
import { TopHeader } from "@/components/layout/TopHeader";
import { ControlTowerNav } from "@/components/navigation/ControlTowerNav";

export const metadata: Metadata = {
  title: "Agent Control Room",
  description: "Prompt and handoff orchestrator for AI coding tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="light">
      <body className="bg-zinc-50 text-zinc-900 min-h-screen flex flex-col">
        <TopHeader />
        <div className="flex-1 grid md:grid-cols-[240px_1fr] grid-cols-1">
          <div className="hidden md:block">
            <Sidebar />
          </div>
          <main className="overflow-auto relative bg-zinc-50">
            <ControlTowerNav />
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
