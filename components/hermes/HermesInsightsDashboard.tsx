"use client";

import { useEffect, useState } from "react";

interface HermesInsight {
  id: string;
  title: string;
  summary: string;
  category: string;
  severity: string;
  occurrenceCount: number;
  status: string;
  updatedAt: string;
}

export function HermesInsightsDashboard() {
  const [insights, setInsights] = useState<HermesInsight[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadData() {
    try {
      const res1 = await fetch("/api/hermes/insights?limit=10");
      const res2 = await fetch("/api/hermes/insights/stats");
      if (res1.ok) setInsights((await res1.json()).insights || []);
      if (res2.ok) setStats((await res2.json()).stats);
    } catch (e) {
      console.error("Load failed:", e);
    }
    setLoading(false);
  }

  async function generateInsights() {
    setGenerating(true);
    try {
      const res = await fetch("/api/hermes/insights/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: false, maxNew: 10 }),
      });
      if (res.ok) {
        await loadData();
      }
    } finally {
      setGenerating(false);
    }
  }

  async function exportInsights() {
    setExporting(true);
    try {
      const res = await fetch("/api/hermes/insights/export", { method: "POST" });
      if (res.ok) {
        alert("Markdown export complete!");
      }
    } finally {
      setExporting(false);
    }
  }

  if (loading) return <div className="animate-pulse h-32 bg-surface-2 rounded" />;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">
          Hermes 인사이트 아카이브
        </h2>
        <p className="text-xs text-text-secondary">운영 경험을 정리한 지식 베이스</p>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <p className="text-xs text-text-secondary uppercase mb-2">전체</p>
            <p className="text-2xl font-bold text-text-primary">{stats.totalCount}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <p className="text-xs text-text-secondary uppercase mb-2">활성</p>
            <p className="text-2xl font-bold text-emerald-400">{stats.byStatus?.active || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <p className="text-xs text-text-secondary uppercase mb-2">검토 필요</p>
            <p className="text-2xl font-bold text-yellow-400">{stats.byStatus?.["needs-review"] || 0}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4">
            <p className="text-xs text-text-secondary uppercase mb-2">높음</p>
            <p className="text-2xl font-bold text-red-400">{stats.bySeverity?.high || 0}</p>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => generateInsights()}
          disabled={generating}
          className="px-3 py-2 text-xs font-medium rounded border border-emerald-700 bg-emerald-950 text-emerald-300 hover:bg-emerald-900 disabled:opacity-50"
        >
          {generating ? "생성 중..." : "인사이트 생성"}
        </button>
        <button
          onClick={() => exportInsights()}
          disabled={exporting}
          className="px-3 py-2 text-xs font-medium rounded border border-blue-700 bg-blue-950 text-blue-300 hover:bg-blue-900 disabled:opacity-50"
        >
          {exporting ? "내보내기 중..." : "Markdown 내보내기"}
        </button>
      </div>

      <div className="space-y-2">
        {insights.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-8 text-center">
            <p className="text-sm text-text-secondary">아직 인사이트가 없습니다.</p>
          </div>
        ) : (
          insights.map((i) => (
            <div key={i.id} className="rounded-lg border border-border bg-surface-1 p-4 hover:bg-surface-2">
              <h4 className="font-semibold text-text-primary text-sm">{i.title}</h4>
              <p className="text-xs text-text-secondary mt-1">{i.summary}</p>
              <div className="flex items-center gap-2 text-[10px] mt-2">
                <span className="px-2 py-1 rounded bg-surface-2 text-text-secondary">{i.category}</span>
                <span className="px-2 py-1 rounded bg-surface-2 text-text-secondary">{i.severity}</span>
                <span className="px-2 py-1 rounded bg-surface-2 text-text-secondary">{i.occurrenceCount}회</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
