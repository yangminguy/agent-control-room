import React from "react";
import type { Metadata } from "next";
import { PromptCompilerUI } from "@/components/prompt-compiler/PromptCompilerUI";
import { Cpu, ArrowLeft } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Prompt Compiler — Agent Control Room",
  description: "Turn rough PM instructions into safe, copy-ready agent prompts without direct execution.",
};

export default function PromptCompilerPage() {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-8">
        
        {/* Header */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/plan"
              className="text-xs text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              실행 계획으로 돌아가기
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-primary/10 rounded-xl">
              <Cpu className="w-8 h-8 text-pink-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                Prompt Compiler
              </h1>
              <p className="mt-1 text-sm text-text-secondary leading-relaxed">
                Turn rough PM instructions into safe, copy-ready agent prompts.
              </p>
            </div>
          </div>
        </div>

        {/* Core UI */}
        <PromptCompilerUI />

      </div>
    </div>
  );
}
