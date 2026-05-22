"use client";

import React, { useState } from "react";
import { Copy, Check, Eye, Code } from "lucide-react";
import { MonitorPacket } from "@/lib/monitor/types";
import { renderMonitorPacketMarkdown } from "@/lib/monitor/task-packets";
import { HERMES_PACKET_KINDS } from "@/lib/monitor/task-packets";

interface PacketDraftCardProps {
  packet: MonitorPacket;
}

export function PacketDraftCard({ packet }: PacketDraftCardProps) {
  const [viewMode, setViewMode] = useState<"markdown" | "json">("markdown");
  const [copied, setCopied] = useState(false);

  const markdown = renderMonitorPacketMarkdown(packet);
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
    <div className="rounded-xl border border-border/60 bg-surface-2 hover:border-pink-primary/30 transition-all overflow-hidden flex flex-col h-full group">
      {/* Header */}
      <div className="border-b border-border/50 px-6 py-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="inline-block px-3 py-1 rounded-full bg-pink-primary/10 border border-pink-primary/30 text-pink-primary text-[10px] uppercase font-bold tracking-wider mb-3">
              {kindLabel}
            </div>
            <h3 className="text-lg font-bold text-text-primary truncate">
              {packet.title}
            </h3>
            <p className="text-sm text-text-secondary mt-1.5 line-clamp-2 leading-relaxed">
              {packet.description}
            </p>
          </div>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="border-b border-border/50 px-6 flex gap-0">
        <button
          onClick={() => setViewMode("markdown")}
          className={`flex-1 py-3 px-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 outline-none ${
            viewMode === "markdown"
              ? "text-pink-primary border-b-2 border-pink-primary bg-pink-primary/5"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-2/80"
          }`}
        >
          <Eye className="w-4 h-4" />
          <span className="hidden sm:inline">Markdown</span>
        </button>
        <button
          onClick={() => setViewMode("json")}
          className={`flex-1 py-3 px-4 text-sm font-bold transition-colors flex items-center justify-center gap-2 outline-none ${
            viewMode === "json"
              ? "text-pink-primary border-b-2 border-pink-primary bg-pink-primary/5"
              : "text-text-secondary hover:text-text-primary hover:bg-surface-2/80"
          }`}
        >
          <Code className="w-4 h-4" />
          <span className="hidden sm:inline">JSON</span>
        </button>
      </div>

      {/* Content Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <pre className="flex-1 overflow-auto px-6 py-5 text-xs text-text-secondary bg-surface font-mono leading-relaxed whitespace-pre-wrap break-words">
          {content}
        </pre>
      </div>

      {/* Footer Actions */}
      <div className="border-t border-border/50 px-6 py-4 bg-surface-2">
        <button
          onClick={() => handleCopy(content)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-pink-primary hover:bg-pink-soft text-white font-bold transition-colors shadow-lg shadow-pink-primary/20"
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
