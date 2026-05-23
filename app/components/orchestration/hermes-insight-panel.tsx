"use client";

import type { HermesInsight } from "@/lib/hermes/insight-recorder";

interface HermesInsightPanelProps {
  insights: HermesInsight[];
}

export function HermesInsightPanel({ insights }: HermesInsightPanelProps) {
  if (!insights || insights.length === 0) {
    return (
      <div className="border rounded-lg p-6 bg-gray-50">
        <h3 className="text-lg font-bold text-gray-900 mb-2">
          Hermes 인사이트
        </h3>
        <p className="text-gray-500">현재 인사이트가 없습니다.</p>
      </div>
    );
  }

  const severityColor: Record<string, string> = {
    info: "bg-blue-50 border-blue-200 text-blue-900",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-900",
    critical: "bg-red-50 border-red-200 text-red-900",
  };

  const severityIcon: Record<string, string> = {
    info: "ℹ️",
    warning: "⚠️",
    critical: "🔴",
  };

  return (
    <div className="border rounded-lg p-6 bg-white shadow-sm">
      <h3 className="text-lg font-bold text-gray-900 mb-4">
        Hermes 인사이트
      </h3>

      <div className="space-y-3">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className={`border rounded p-4 ${severityColor[insight.severity]}`}
          >
            {/* 헤더 */}
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-2 flex-1">
                <span className="text-lg">{severityIcon[insight.severity]}</span>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">
                    {insight.summary}
                  </p>
                  {insight.frequency && insight.frequency > 1 && (
                    <p className="text-xs text-gray-600 mt-1">
                      반복 횟수: {insight.frequency}회
                    </p>
                  )}
                </div>
              </div>
              {insight.patternType && (
                <span className="text-xs px-2 py-1 bg-white bg-opacity-50 rounded">
                  {insight.patternType}
                </span>
              )}
            </div>

            {/* 상세 설명 */}
            <p className="text-sm text-gray-700 mb-2">
              {insight.details}
            </p>

            {/* 증거 */}
            {insight.evidence.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-semibold text-gray-700 mb-1">
                  증거:
                </p>
                <ul className="text-xs text-gray-600 space-y-1">
                  {insight.evidence.map((evidence, i) => (
                    <li key={i} className="flex items-start">
                      <span className="mr-1">•</span>
                      <span>{evidence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 권고사항 */}
            <div className="bg-white bg-opacity-50 rounded p-2 mt-2">
              <p className="text-sm font-semibold text-gray-900 mb-1">
                권고사항:
              </p>
              <p className="text-sm text-gray-800">
                {insight.recommendation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
