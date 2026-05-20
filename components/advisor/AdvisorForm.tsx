"use client";

import { useState } from "react";
import type { AdvisorInput, AdvisorResponse } from "@/lib/types";

export default function AdvisorForm({
  onSubmit,
  isSubmitting,
}: {
  onSubmit: (input: AdvisorInput) => void;
  isSubmitting: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [projectContext, setProjectContext] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    onSubmit({ question, projectContext });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl bg-white p-6 rounded-lg shadow-sm border border-slate-200">
      <div>
        <h2 className="text-lg font-semibold mb-4 text-slate-800">Advisor Mode</h2>
        <p className="text-sm text-slate-600 mb-4">
          Ask a technical question or describe a problem you are facing. The system will analyze the issue and provide recommendations.
        </p>
      </div>

      <div>
        <label htmlFor="question" className="block text-sm font-medium text-slate-700 mb-1">
          Your Question
        </label>
        <textarea
          id="question"
          rows={3}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="e.g., Why is my Supabase query failing with RLS error?"
          className="w-full p-3 border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-500"
          required
        />
      </div>

      <div>
        <label htmlFor="projectContext" className="block text-sm font-medium text-slate-700 mb-1">
          Project Context (Optional)
        </label>
        <textarea
          id="projectContext"
          rows={4}
          value={projectContext}
          onChange={(e) => setProjectContext(e.target.value)}
          placeholder="Paste relevant AGENT_STATE.md, logs, or code snippets here..."
          className="w-full p-3 font-mono text-sm border border-slate-300 rounded-md shadow-sm focus:ring-pink-500 focus:border-500 bg-slate-50"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting || !question.trim()}
        className="w-full py-2 px-4 bg-pink-primary hover:bg-pink-soft text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isSubmitting ? "Analyzing..." : "Get Technical Advice"}
      </button>
    </form>
  );
}
