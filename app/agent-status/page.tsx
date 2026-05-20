"use client";

import { useEffect, useState } from "react";
import { ArrowRight, CircleAlert } from "lucide-react";
import { HandoffPreview } from "@/components/handoffs/HandoffPreview";
import type { AgentStatus, AgentStatusValue, AgentType, Handoff } from "@/lib/types";

const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  antigravity: "Antigravity",
};

const STATUS_COLORS: Record<AgentStatusValue, string> = {
  available: "bg-green-100 text-green-800",
  limited: "bg-yellow-100 text-yellow-800",
  cooling_down: "bg-orange-100 text-orange-800",
  blocked: "bg-red-100 text-red-800",
  manual_only: "bg-gray-100 text-gray-800",
};

type AgentStatusResponse = {
  updated: AgentStatus;
  recommendedAgent?: AgentType | null;
  recommendationReason?: string;
  handoff?: Handoff;
};

export default function AgentStatusPage() {
  const [statuses, setStatuses] = useState<AgentStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingAgent, setUpdatingAgent] = useState<AgentType | null>(null);
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<AgentType, AgentStatusValue>
  >({
    "claude-code": "available",
    codex: "available",
    antigravity: "manual_only",
  });
  const [reasons, setReasons] = useState<Record<AgentType, string>>({
    "claude-code": "",
    codex: "",
    antigravity: "",
  });
  const [nextAvailableTimes, setNextAvailableTimes] = useState<
    Record<AgentType, string>
  >({
    "claude-code": "",
    codex: "",
    antigravity: "",
  });
  const [generatedHandoffs, setGeneratedHandoffs] = useState<Record<
    AgentType,
    Handoff | undefined
  >>({
    "claude-code": undefined,
    codex: undefined,
    antigravity: undefined,
  });
  const [recommendations, setRecommendations] = useState<Record<
    AgentType,
    { agent: AgentType | null; reason: string } | undefined
  >>({
    "claude-code": undefined,
    codex: undefined,
    antigravity: undefined,
  });

  // 초기 상태 로드
  useEffect(() => {
    const fetchStatuses = async () => {
      try {
        const response = await fetch("/api/agent-status");
        const data = await response.json();
        setStatuses(data.statuses || []);

        // 현재 상태 초기화
        const statusMap: Record<AgentType, AgentStatusValue> = {
          "claude-code": "available",
          codex: "available",
          antigravity: "manual_only",
        };

        data.statuses?.forEach((status: AgentStatus) => {
          statusMap[status.agent] = status.status;
        });

        setSelectedStatuses(statusMap);
        setReasons({
          "claude-code":
            data.statuses?.find((status: AgentStatus) => status.agent === "claude-code")
              ?.reason || "",
          codex:
            data.statuses?.find((status: AgentStatus) => status.agent === "codex")
              ?.reason || "",
          antigravity:
            data.statuses?.find((status: AgentStatus) => status.agent === "antigravity")
              ?.reason || "",
        });
      } catch (error) {
        console.error("Failed to fetch agent statuses:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStatuses();
  }, []);

  const handleUpdateStatus = async (agent: AgentType) => {
    setUpdatingAgent(agent);
    try {
      const response = await fetch("/api/agent-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent,
          status: selectedStatuses[agent],
          reason: reasons[agent] || undefined,
          nextAvailableAt: nextAvailableTimes[agent] || undefined,
        }),
      });

      const data = (await response.json()) as AgentStatusResponse;

      if (data.updated) {
        // 상태 목록 업데이트
        setStatuses((prev) =>
          prev.some((s) => s.agent === agent)
            ? prev.map((s) => (s.agent === agent ? data.updated : s))
            : [...prev, data.updated]
        );
        setRecommendations((prev) => ({
          ...prev,
          [agent]: data.recommendationReason
            ? {
                agent: data.recommendedAgent ?? null,
                reason: data.recommendationReason,
              }
            : undefined,
        }));

        // 핸드오프가 생성되었으면 표시
        if (data.handoff) {
          setGeneratedHandoffs((prev) => ({
            ...prev,
            [agent]: data.handoff,
          }));
        } else {
          setGeneratedHandoffs((prev) => ({
            ...prev,
            [agent]: undefined,
          }));
        }
      }
    } catch (error) {
      console.error("Failed to update agent status:", error);
    } finally {
      setUpdatingAgent(null);
    }
  };

  if (loading) {
    return <div className="p-4">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold">Agent Status</h1>
        <p className="text-gray-600 mt-2">
          에이전트 상태를 관리하고 필요시 자동 핸드오프를 생성합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {["claude-code", "codex", "antigravity"].map((agent) => {
          const agentType = agent as AgentType;
          const currentStatus = statuses.find((s) => s.agent === agentType);
          const handoff = generatedHandoffs[agentType];
          const recommendation = recommendations[agentType];

          return (
            <div key={agent} className="rounded-lg border border-gray-200 p-6">
              {/* 헤더 */}
              <div className="mb-4">
                <h2 className="text-xl font-semibold">
                  {AGENT_DISPLAY_NAMES[agentType]}
                </h2>
                <div className="mt-2 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      STATUS_COLORS[currentStatus?.status || "available"]
                    }`}
                  >
                    {currentStatus?.status || "available"}
                  </span>
                </div>
                {currentStatus?.reason && (
                  <p className="text-sm text-gray-600 mt-2">
                    {currentStatus.reason}
                  </p>
                )}
                {currentStatus?.nextAvailableAt && (
                  <p className="text-sm text-gray-600 mt-1">
                    복구 예상:{" "}
                    {new Date(currentStatus.nextAvailableAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* 상태 변경 폼 */}
              <div className="space-y-3 border-t pt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    상태 변경
                  </label>
                  <select
                    value={selectedStatuses[agentType]}
                    onChange={(e) =>
                      setSelectedStatuses({
                        ...selectedStatuses,
                        [agentType]: e.target.value as AgentStatusValue,
                      })
                    }
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="available">Available</option>
                    <option value="limited">Limited</option>
                    <option value="cooling_down">Cooling Down</option>
                    <option value="blocked">Blocked</option>
                    <option value="manual_only">Manual Only</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    사유 (선택사항)
                  </label>
                  <input
                    type="text"
                    placeholder="상태 변경 이유"
                    value={reasons[agentType]}
                    onChange={(e) =>
                      setReasons({
                        ...reasons,
                        [agentType]: e.target.value,
                      })
                    }
                    className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>

                {["cooling_down", "blocked"].includes(
                  selectedStatuses[agentType]
                ) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      복구 예상 시간 (선택사항)
                    </label>
                    <input
                      type="datetime-local"
                      value={nextAvailableTimes[agentType]}
                      onChange={(e) =>
                        setNextAvailableTimes({
                          ...nextAvailableTimes,
                          [agentType]: e.target.value,
                        })
                      }
                      className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                )}

                <button
                  onClick={() => handleUpdateStatus(agentType)}
                  disabled={updatingAgent === agentType}
                  className="w-full rounded bg-pink-primary px-4 py-2 text-white hover:bg-pink-soft disabled:bg-gray-400"
                >
                  {updatingAgent === agentType
                    ? "업데이트 중..."
                    : "Update Status"}
                </button>
              </div>

              {recommendation && (
                <div className="mt-4 rounded border border-100 bg-surface-2 p-3 text-sm text-pink-primary">
                  <div className="flex items-start gap-2">
                    <CircleAlert className="mt-0.5 h-4 w-4 flex-none" />
                    <div className="space-y-1">
                      <p>{recommendation.reason}</p>
                      {recommendation.agent && (
                        <p className="flex items-center gap-2 font-medium">
                          <span>{AGENT_DISPLAY_NAMES[agentType]}</span>
                          <ArrowRight className="h-4 w-4" />
                          <span>
                            {AGENT_DISPLAY_NAMES[recommendation.agent]}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {handoff && (
                <div className="mt-4 rounded border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                  Handoff prompt generated below.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.values(generatedHandoffs).some(Boolean) && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold">Generated Handoffs</h2>
            <p className="mt-1 text-sm text-gray-600">
              Copy-ready prompts created from the latest manual status changes.
            </p>
          </div>
          <div className="space-y-6">
            {Object.entries(generatedHandoffs).map(([agent, handoff]) =>
              handoff ? (
                <div key={agent} className="space-y-2">
                  <h3 className="font-medium">
                    {AGENT_DISPLAY_NAMES[agent as AgentType]} status handoff
                  </h3>
                  <HandoffPreview handoff={handoff} />
                </div>
              ) : null
            )}
          </div>
        </section>
      )}
    </div>
  );
}
