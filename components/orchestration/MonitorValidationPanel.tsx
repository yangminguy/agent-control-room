"use client";

import { useState } from "react";
import { MonitorValidationRequest, MonitorValidationResult } from "@/lib/types";
import { AlertCircle, CheckCircle, XCircle, Clock } from "lucide-react";

type ValidationState = "idle" | "validating" | "completed" | "error";

export interface MonitorValidationPanelProps {
  request?: MonitorValidationRequest;
  onValidation?: (result: MonitorValidationResult) => void;
}

export function MonitorValidationPanel({ request, onValidation }: MonitorValidationPanelProps) {
  const [state, setstate] = useState<ValidationState>("idle");
  const [validationResult, setValidationResult] = useState<MonitorValidationResult | null>(null);
  const [error, setError] = useState<string>("");

  const handleValidate = async (request: MonitorValidationRequest) => {
    setstate("validating");
    setError("");

    try {
      const response = await fetch("/api/orchestration/validation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Validation failed: ${response.statusText}`);
      }

      const result = await response.json();
      setValidationResult(result);
      setstate("completed");
      onValidation?.(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setstate("error");
    }
  };

  const getStatusColor = (confidence: number): string => {
    if (confidence >= 80) return "text-green-600";
    if (confidence >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="border rounded-lg p-4 bg-slate-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-lg">Hermes LLM Validation</h3>
        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
          Auto Decision Engine
        </span>
      </div>

      {state === "idle" && (
        <div className="text-center py-8 text-slate-500">
          <Clock className="mx-auto mb-2 opacity-50" size={32} />
          <p>{request ? "Ready for validation" : "No validation request selected"}</p>
          {request && (
            <button
              type="button"
              onClick={() => handleValidate(request)}
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Run Validation
            </button>
          )}
        </div>
      )}

      {state === "validating" && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin">
            <Clock size={32} className="text-blue-600" />
          </div>
          <p className="mt-2 text-sm text-slate-600">Validating stage...</p>
        </div>
      )}

      {state === "error" && (
        <div className="bg-red-50 border border-red-200 rounded p-3 flex items-start gap-2">
          <XCircle size={20} className="text-red-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-900">Validation Error</p>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {state === "completed" && validationResult && (
        <div className="space-y-4">
          {/* Confidence Score */}
          <div className={`p-3 rounded-lg border ${
            validationResult.isValid ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Confidence Score</span>
              <span className={`text-2xl font-bold ${getStatusColor(validationResult.confidenceScore)}`}>
                {validationResult.confidenceScore}%
              </span>
            </div>
            <div className="mt-2 bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  validationResult.isValid ? "bg-green-500" : "bg-red-500"
                }`}
                style={{ width: `${validationResult.confidenceScore}%` }}
              />
            </div>
          </div>

          {/* Suggested Action */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <p className="text-xs font-medium text-blue-900 mb-1">Suggested Action</p>
            <p className="text-sm font-semibold text-blue-800 capitalize">
              {validationResult.suggestedAction}
            </p>
          </div>

          {/* Reasoning */}
          <div>
            <p className="text-xs font-medium text-slate-600 mb-1">Reasoning</p>
            <p className="text-sm text-slate-700 bg-white p-2 rounded border">
              {validationResult.reasoning}
            </p>
          </div>

          {/* Risks */}
          {validationResult.risks && validationResult.risks.length > 0 && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-xs font-medium text-amber-900 mb-1">Detected Risks</p>
                  <ul className="text-xs text-amber-800 space-y-0.5">
                    {validationResult.risks.map((risk, idx) => (
                      <li key={idx}>• {risk}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {validationResult.recommendations && validationResult.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-slate-600 mb-2">Recommendations</p>
              <ul className="text-xs text-slate-700 space-y-1">
                {validationResult.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-2">
                    <CheckCircle size={14} className="text-green-600 mt-0.5 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Metadata */}
          <div className="text-xs text-slate-500 border-t pt-2">
            <p>ID: {validationResult.validationId.slice(0, 12)}...</p>
            <p>Validated: {new Date(validationResult.timestamp).toLocaleString()}</p>
          </div>
        </div>
      )}
    </div>
  );
}
