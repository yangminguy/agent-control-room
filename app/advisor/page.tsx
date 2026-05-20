"use client";

import { useState } from "react";
import AdvisorForm from "@/components/advisor/AdvisorForm";
import AdvisorResultView from "@/components/advisor/AdvisorResultView";
import type { AdvisorInput, AdvisorResponse } from "@/lib/types";
import Link from "next/link";

export default function AdvisorPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<AdvisorResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (input: AdvisorInput) => {
    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        throw new Error("Failed to get advisor response");
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Technical Advisor</h1>
          <p className="text-slate-600 mt-2">
            Ask technical questions and get structured advice before taking action.
          </p>
        </div>
        <Link href="/" className="text-pink-primary hover:underline">
          Back to Dashboard
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-8">
        <section>
          <AdvisorForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
          {error && (
            <div className="mt-4 p-4 bg-red-50 text-red-700 border border-red-200 rounded-md">
              {error}
            </div>
          )}
        </section>

        {result && (
          <section>
            <AdvisorResultView result={result} />
          </section>
        )}
      </div>
    </div>
  );
}
