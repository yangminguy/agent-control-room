"use client";

import { useState } from "react";
import { conversationToTasks } from "@/lib/dispatch/conversation-to-task-engine";
import { useOrchestration } from "@/lib/dispatch/orchestration-context";
import type { DispatchJob } from "@/lib/types";

// ── Risk level badge colors ───────────────────────────────────────────────────

const RISK_COLORS: Record<string, string> = {
  safe: "bg-emerald-900 text-emerald-200 border border-emerald-700",
  low: "bg-blue-900 text-blue-200 border border-blue-700",
  medium: "bg-yellow-900 text-yellow-200 border border-yellow-700",
  high: "bg-orange-900 text-orange-200 border border-orange-700",
  critical: "bg-red-900 text-red-200 border border-red-700",
};

// ── Component ─────────────────────────────────────────────────────────────────

export function ConversationToJobPanel() {
  const { addJob } = useOrchestration();

  const [prompt, setPrompt] = useState("");
  const [previewJobs, setPreviewJobs] = useState<DispatchJob[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [addedCount, setAddedCount] = useState(0);

  const handleGenerate = async () => {
    const trimmed = prompt.trim();
    if (!trimmed) {
      setError("Please enter a prompt before generating jobs.");
      return;
    }

    setError(null);
    setIsGenerating(true);
    setPreviewJobs([]);
    setAddedCount(0);

    try {
      const result = await conversationToTasks({ userPrompt: trimmed });
      if (!result.jobs || result.jobs.length === 0) {
        setError("No jobs could be extracted from the prompt. Try using bullet points (- task description).");
        return;
      }
      setPreviewJobs(result.jobs);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to generate jobs: ${message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAddAll = () => {
    previewJobs.forEach((job) => addJob(job));
    setAddedCount(previewJobs.length);
    setPreviewJobs([]);
    setPrompt("");
  };

  const handleClear = () => {
    setPreviewJobs([]);
    setError(null);
    setAddedCount(0);
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">
          Generate Jobs from Natural Language
        </h2>
        <p className="text-xs text-text-secondary mt-0.5">
          Describe tasks in plain language. Use bullet points for multiple jobs.
          Each job will be previewed before being added to the dispatch queue.
        </p>
      </div>

      {/* Textarea */}
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder={`- Fix TypeScript errors in result-classifier module\n- Add UI component for dispatch status\n- Write tests for the feedback loop`}
        rows={5}
        className="w-full rounded border border-border bg-surface-2 text-text-primary text-sm placeholder:text-text-secondary px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-pink-primary"
      />

      {/* Actions */}
      <div className="flex gap-2 items-center">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !prompt.trim()}
          className="px-4 py-2 rounded bg-zinc-900 border border-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {isGenerating ? "Generating..." : "Generate Jobs"}
        </button>
        {previewJobs.length > 0 && (
          <>
            <button
              type="button"
              onClick={handleClear}
              className="px-3 py-2 rounded border border-border text-text-secondary text-sm hover:text-text-primary hover:bg-surface-2 transition-colors"
            >
              Clear Preview
            </button>
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded border border-red-700 bg-red-950 px-3 py-2 text-xs text-red-300">
          {error}
        </div>
      )}

      {/* Success notice */}
      {addedCount > 0 && (
        <div className="rounded border border-emerald-700 bg-emerald-950 px-3 py-2 text-xs text-emerald-300">
          {addedCount} job{addedCount > 1 ? "s" : ""} added to the dispatch queue.
        </div>
      )}

      {/* Preview cards */}
      {previewJobs.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-secondary">
              Preview — {previewJobs.length} job{previewJobs.length > 1 ? "s" : ""} detected
            </p>
            <button
              type="button"
              onClick={handleAddAll}
              className="px-3 py-1.5 rounded bg-emerald-800 text-emerald-200 border border-emerald-700 text-xs font-medium hover:bg-emerald-700 transition-colors"
            >
              Add All to Queue
            </button>
          </div>

          <div className="space-y-2">
            {previewJobs.map((job) => (
              <div
                key={job.id}
                className="rounded border border-border bg-surface-2 px-3 py-2.5 flex items-start gap-3"
              >
                {/* Risk badge */}
                <span
                  className={`inline-block mt-0.5 rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap shrink-0 ${
                    RISK_COLORS[job.riskLevel] ?? "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {job.riskLevel}
                </span>

                {/* Agent + Prompt */}
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-primary">
                    {job.agentId}
                  </p>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">
                    {job.prompt ? job.prompt.substring(0, 60) + (job.prompt.length > 60 ? "..." : "") : "(no prompt)"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
