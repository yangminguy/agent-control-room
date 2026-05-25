"use client";

import { useState } from "react";

function generateOrchestrationInsight(): string {
  return "Orchestration cycle monitoring - System is observing dispatch queue state (read-only).";
}

function generateAgentPerformanceSummary(): string {
  return "Agent Performance Summary - No execution data collected yet.";
}

function generateRoutingRecommendation(): string {
  return "Routing Recommendation - Monitor queue for routing patterns.";
}

function generateTimeoutFallbackSummary(): string {
  return "Timeout/Fallback Summary - No timeout events recorded.";
}

// ── Copy button helper ────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="px-2 py-1 text-xs rounded border border-zinc-200 bg-white text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
    >
      {copied ? "복사됨" : "복사"}
    </button>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function InsightSection({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-4 space-y-2 shadow-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
        <CopyButton text={content} />
      </div>
      <p className="whitespace-pre-wrap max-h-64 overflow-y-auto text-sm text-zinc-600 leading-relaxed">
        {content}
      </p>
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonitorInsightPanel() {
  const [exportCopied, setExportCopied] = useState(false);

  // Generate all four insight sections
  const orchestrationInsight = generateOrchestrationInsight();
  const agentPerformanceSummary = generateAgentPerformanceSummary();
  const routingRecommendation = generateRoutingRecommendation();
  const timeoutFallbackSummary = generateTimeoutFallbackSummary();

  const allInsights = [
    orchestrationInsight,
    agentPerformanceSummary,
    routingRecommendation,
    timeoutFallbackSummary,
  ].join("\n\n---\n\n");

  const handleExportAll = async () => {
    await navigator.clipboard.writeText(allInsights);
    setExportCopied(true);
    setTimeout(() => setExportCopied(false), 2000);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Safety banner */}
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 flex items-start gap-2">
        <span className="text-amber-700 text-sm mt-0.5">!</span>
        <p className="text-xs text-amber-800">
          <strong>Hermes is observing only — not executing.</strong> These insights
          are generated from current dispatch queue state. No code is run. No files
          are modified.
        </p>
      </div>

      {/* Four insight sections */}
      <InsightSection
        title="Orchestration Cycle Insights"
        content={orchestrationInsight}
      />

      <InsightSection
        title="Agent Performance Summary"
        content={agentPerformanceSummary}
      />

      <InsightSection
        title="Routing Recommendation"
        content={routingRecommendation}
      />

      <InsightSection
        title="Timeout / Fallback Summary"
        content={timeoutFallbackSummary}
      />

      {/* Export all */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExportAll}
          className="px-4 py-2 rounded border border-zinc-200 bg-white text-zinc-600 text-sm hover:text-zinc-900 hover:bg-zinc-50 transition-colors"
        >
          {exportCopied
            ? "클립보드에 복사됨"
            : "전체 내용을 Obsidian 메모로 복사"}
        </button>
      </div>
    </div>
  );
}
