"use client";

/**
 * ContextPackPreview
 * Phase 40: Full Orchestration Layer
 *
 * Context Pack 내용을 미리보기 형식으로 표시하고 Markdown 복사 기능을 제공한다.
 */

import { useState } from "react";
import type { ContextPack } from "@/lib/orchestration/types";
import { renderContextPackMarkdown as renderContextPackMarkdownV2 } from "@/lib/orchestration/context-pack-builder";

const AGENT_LABELS: Record<string, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  antigravity: "Antigravity",
  hermes: "Hermes",
  "vibe-kanban": "Vibe Kanban",
  "manual-user": "Manual/User",
};

interface ContextPackPreviewProps {
  pack: ContextPack;
}

export function ContextPackPreview({ pack }: ContextPackPreviewProps) {
  const [copied, setCopied] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  async function handleCopy() {
    const markdown = renderContextPackMarkdownV2(pack);
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-purple-900">Context Pack</h3>
          <p className="text-xs text-purple-700 opacity-75">
            → {AGENT_LABELS[pack.requestedAgent] ?? pack.requestedAgent}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 transition-colors"
          >
            {showRaw ? "요약 보기" : "Markdown 보기"}
          </button>
          <button
            onClick={handleCopy}
            className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
          >
            {copied ? "복사됨 ✓" : "복사"}
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="text-xs bg-white rounded p-3 overflow-auto max-h-64 text-gray-700 font-mono border border-purple-100">
          {renderContextPackMarkdownV2(pack)}
        </pre>
      ) : (
        <div className="space-y-2 text-xs">
          {/* Goal */}
          <Section label="목표" text={pack.goal} />

          {/* Reason for Relay */}
          <div className="bg-purple-100 rounded p-2">
            <span className="text-purple-600 font-medium">전달 이유: </span>
            <span className="text-purple-800">{pack.reasonForRelay}</span>
          </div>

          {/* Completed Work */}
          {pack.completedWork.length > 0 && (
            <Section
              label={`완료된 작업 (${pack.completedWork.length})`}
              items={pack.completedWork}
              itemColor="text-green-700"
            />
          )}

          {/* Remaining Work */}
          {pack.remainingWork.length > 0 && (
            <Section
              label={`남은 작업 (${pack.remainingWork.length})`}
              items={pack.remainingWork}
              itemColor="text-orange-700"
            />
          )}

          {/* Changed Files */}
          {pack.changedFiles.length > 0 && (
            <div>
              <p className="font-medium text-purple-800 mb-1">변경 파일</p>
              <div className="flex flex-wrap gap-1">
                {pack.changedFiles.map((f, i) => (
                  <code key={i} className="text-xs bg-white px-1.5 py-0.5 rounded border border-purple-100 font-mono text-purple-700">
                    {f.split("/").pop()}
                  </code>
                ))}
              </div>
            </div>
          )}

          {/* Blockers */}
          {pack.currentBlockers.length > 0 && (
            <Section
              label={`차단 요소 (${pack.currentBlockers.length})`}
              items={pack.currentBlockers}
              itemColor="text-red-700"
            />
          )}
        </div>
      )}

      <p className="text-xs text-purple-500 mt-3 opacity-75">
        생성: {new Date(pack.createdAt).toLocaleString("ko-KR")}
      </p>
    </div>
  );
}

function Section({
  label,
  text,
  items,
  itemColor = "text-gray-700",
}: {
  label: string;
  text?: string;
  items?: string[];
  itemColor?: string;
}) {
  return (
    <div>
      <p className="font-medium text-purple-800 mb-1">{label}</p>
      {text && <p className="text-purple-700">{text}</p>}
      {items && (
        <ul className="space-y-0.5">
          {items.map((item, i) => (
            <li key={i} className={`${itemColor}`}>• {item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
