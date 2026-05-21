"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, Code } from "lucide-react";
import { HermesPacket } from "@/lib/hermes/types";
import { renderHermesPacketMarkdown } from "@/lib/hermes/task-packets";
import { HERMES_PACKET_KINDS } from "@/lib/hermes/task-packets";

interface PacketDraftCardProps {
  packet: HermesPacket;
}

export function PacketDraftCard({ packet }: PacketDraftCardProps) {
  const [viewMode, setViewMode] = useState<"markdown" | "json">("markdown");
  const [copied, setCopied] = useState(false);

  const markdown = renderHermesPacketMarkdown(packet);
  const json = JSON.stringify(packet, null, 2);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const content = viewMode === "markdown" ? markdown : json;
  const kindLabel =
    HERMES_PACKET_KINDS[packet.kind]?.label || packet.kind;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="inline-block px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-xs font-semibold mb-2">
              {kindLabel}
            </div>
            <h3 className="text-lg font-bold text-slate-900 truncate">
              {packet.title}
            </h3>
            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
              {packet.description}
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="border-b border-slate-100 px-6 flex gap-0">
        <button
          onClick={() => setViewMode("markdown")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            viewMode === "markdown"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Markdown</span>
        </button>
        <button
          onClick={() => setViewMode("json")}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
            viewMode === "json"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Code className="w-4 h-4" />
          <span className="hidden sm:inline">JSON</span>
        </button>
      </div>

      {/* Content Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <pre className="flex-1 overflow-auto px-6 py-4 text-xs text-slate-700 bg-slate-50 font-mono leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-slate-100 px-6 py-4 bg-slate-50">
        <button
          onClick={() => handleCopy(content)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium transition-colors"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4" />
              복사됨!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              {viewMode === "markdown" ? "마크다운 복사" : "JSON 복사"}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
