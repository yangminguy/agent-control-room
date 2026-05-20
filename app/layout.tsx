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
    <html lang="ko">
      <body>
        <header className="border-b bg-white">
          <nav className="mx-auto flex max-w-7xl items-center gap-4 px-6 py-3 text-sm font-medium text-gray-600">
            <Link href="/" className="text-gray-950 hover:text-blue-700">
              Agent Control Room
            </Link>
            <Link href="/agent-status" className="hover:text-blue-700">
              Agent Status
            </Link>
            <Link href="/handoffs" className="hover:text-blue-700">
              Handoffs
            </Link>
            <Link href="/reports" className="hover:text-blue-700">
              Reports
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
