"use client";

import type { AdvisorResponse } from "@/lib/types";
import { useState } from "react";

export default function AdvisorResultView({
  result,
}: {
  result: AdvisorResponse;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.nextPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy", err);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl bg-white p-6 rounded-lg shadow-sm border border-slate-200 mt-6">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-2">Advisor Analysis</h2>
      
      <section>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Problem Summary</h3>
        <p className="text-slate-600 bg-slate-50 p-4 rounded-md border border-slate-100">
          {result.problemSummary}
        </p>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Likely Causes</h3>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          {result.likelyCauses.map((cause, idx) => (
            <li key={idx}>{cause}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">Options</h3>
        <ul className="list-disc pl-5 space-y-1 text-slate-600">
          {result.options.map((opt, idx) => (
            <li key={idx}>{opt}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-pink-primary mb-2 flex items-center">
          <span className="mr-2">💡</span> Recommendation
        </h3>
        <div className="bg-surface-2 p-4 rounded-md border border-100 text-pink-primary">
          {result.recommendation}
        </div>
      </section>

      <section>
        <h3 className="text-lg font-semibold text-red-700 mb-2 flex items-center">
          <span className="mr-2">⚠️</span> Risks
        </h3>
        <ul className="list-disc pl-5 space-y-1 text-red-800 bg-red-50 p-4 rounded-md border border-red-100">
          {result.risks.map((risk, idx) => (
            <li key={idx}>{risk}</li>
          ))}
        </ul>
      </section>

      <section>
        <div className="flex justify-between items-center mb-2 mt-8">
          <h3 className="text-lg font-semibold text-slate-700">Next Prompt</h3>
          <button
            onClick={handleCopy}
            className="text-sm px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors"
          >
            {copied ? "Copied!" : "Copy Prompt"}
          </button>
        </div>
        <div className="relative">
          <pre className="bg-slate-900 text-slate-50 p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap">
            {result.nextPrompt}
          </pre>
        </div>
      </section>
    </div>
  );
}
