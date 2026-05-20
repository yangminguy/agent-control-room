import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

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
    <html lang="ko" className="dark">
      <body className="bg-background text-text-primary">
        <header className="border-b border-border bg-surface">
          <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 text-sm font-medium text-text-secondary">
            <Link href="/" className="font-semibold text-text-primary hover:text-pink-primary">
              Agent Control Room
            </Link>
            <Link href="/agent-status" className="hover:text-pink-primary">
              Agent Status
            </Link>
            <Link href="/handoffs" className="hover:text-pink-primary">
              Handoffs
            </Link>
            <Link href="/reports" className="hover:text-pink-primary">
              Reports
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
