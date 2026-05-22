"use client";

/**
 * MonitorMemoryPreview
 * Phase 40: Full Orchestration Layer
 *
 * Hermes Memory Note를 미리보기 형식으로 표시하고 Obsidian markdown 복사 기능을 제공한다.
 */

import { useState } from "react";
import type { MonitorMemoryNote } from "@/lib/orchestration/types";
import { renderHermesMemoryMarkdown } from "@/lib/orchestration/monitor-memory-builder";

const TYPE_LABELS: Record<MonitorMemoryNote["type"], string> = {
  session_summary: "세션 요약",
  decision: "주요 결정",
  failure: "실패 기록",
  prompt_pattern: "성공 프롬프트 패턴",
  agent_performance: "에이전트 성능",
  context_pack: "Context Pack",
  blocker: "차단 요소",
};

const TYPE_COLORS: Record<MonitorMemoryNote["type"], string> = {
  session_summary: "bg-blue-50 border-blue-200 text-blue-800",
  decision: "bg-purple-50 border-purple-200 text-purple-800",
  failure: "bg-red-50 border-red-200 text-red-800",
  prompt_pattern: "bg-green-50 border-green-200 text-green-800",
  agent_performance: "bg-yellow-50 border-yellow-200 text-yellow-800",
  context_pack: "bg-indigo-50 border-indigo-200 text-indigo-800",
  blocker: "bg-orange-50 border-orange-200 text-orange-800",
};

const TYPE_BADGE: Record<MonitorMemoryNote["type"], string> = {
  session_summary: "bg-blue-100 text-blue-700",
  decision: "bg-purple-100 text-purple-700",
  failure: "bg-red-100 text-red-700",
  prompt_pattern: "bg-green-100 text-green-700",
  agent_performance: "bg-yellow-100 text-yellow-700",
  context_pack: "bg-indigo-100 text-indigo-700",
  blocker: "bg-orange-100 text-orange-700",
};

interface MonitorMemoryPreviewProps {
  note: MonitorMemoryNote;
}

export function MonitorMemoryPreview({ note }: MonitorMemoryPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const colorClass = TYPE_COLORS[note.type];
  const badgeClass = TYPE_BADGE[note.type];

  async function handleCopy() {
    const markdown = renderHermesMemoryMarkdown(note);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`rounded-lg border-2 p-4 ${colorClass}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badgeClass} mb-1 inline-block`}>
            {TYPE_LABELS[note.type]}
          </span>
          <h3 className="text-sm font-semibold">{note.title}</h3>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs px-2 py-1 bg-white bg-opacity-60 rounded border border-current opacity-70 hover:opacity-100 transition-opacity"
          >
            {showRaw ? "요약" : "MD"}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 bg-white bg-opacity-80 rounded border border-current hover:opacity-100 opacity-80 transition-opacity"
          >
            {copied ? "✓" : "복사"}
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="text-xs bg-white bg-opacity-70 rounded p-3 overflow-auto max-h-48 font-mono border border-current border-opacity-20">
          {renderHermesMemoryMarkdown(note)}
        </pre>
      ) : (
        <>
          {/* Content */}
          <p className="text-xs opacity-90 mb-3 line-clamp-3">{note.content}</p>

          {/* Tags */}
          {note.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.tags.map((tag, i) => (
                <span key={i} className="text-xs px-1.5 py-0.5 bg-white bg-opacity-50 rounded">
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Files */}
          {note.relatedFiles.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {note.relatedFiles.map((f, i) => (
                <code key={i} className="text-xs px-1 py-0.5 bg-white bg-opacity-50 rounded font-mono">
                  {f.split("/").pop()}
                </code>
              ))}
            </div>
          )}
        </>
      )}

      {/* Obsidian Path */}
      <div className="mt-2 pt-2 border-t border-current border-opacity-20">
        <p className="text-xs opacity-60">
          Obsidian: <code className="font-mono">{note.obsidianPath}</code>
        </p>
        <p className="text-xs opacity-50 mt-0.5">
          {new Date(note.createdAt).toLocaleString("ko-KR")}
        </p>
      </div>
    </div>
  );
}
