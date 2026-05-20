"use client";

import { useState } from "react";
import { Check, Copy, ArrowRight } from "lucide-react";
import type { Handoff } from "@/lib/types";
import { generateHandoffMarkdown } from "@/lib/orchestration/handoff-generator";

export function HandoffPreview({ handoff }: { handoff: Handoff }) {
  const [copied, setCopied] = useState(false);
  const markdown = generateHandoffMarkdown(handoff);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 bg-gray-50 border-b flex items-center justify-between">
        <div className="flex items-center gap-3 font-medium">
          <span className="capitalize px-2 py-1 bg-gray-200 rounded text-sm">
            {handoff.fromAgent.replace("-", " ")}
          </span>
          <ArrowRight className="w-4 h-4 text-gray-400" />
          <span className="capitalize px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
            {handoff.toAgent.replace("-", " ")}
          </span>
        </div>
        <button
          onClick={handleCopy}
          className="flex items-center gap-2 text-sm bg-white border px-3 py-1.5 rounded-md hover:bg-gray-50 transition shadow-sm"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-green-500" />
              <span className="text-green-600">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-gray-500" />
              <span>Copy Markdown</span>
            </>
          )}
        </button>
      </div>
      <div className="p-6 overflow-auto max-h-[600px] bg-gray-900 text-gray-100">
        <pre className="text-sm font-mono whitespace-pre-wrap">
          {markdown}
        </pre>
      </div>
    </div>
  );
}
