"use client";

import { useEffect, useState } from "react";
import { ArrowRight, AlertCircle } from "lucide-react";
import { HandoffPreview } from "@/components/handoffs/HandoffPreview";
import type { AgentStatus, AgentStatusValue, AgentType, Handoff } from "@/lib/types";

const AGENT_DISPLAY_NAMES: Record<AgentType, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  antigravity: "Antigravity",
};

const STATUS_COLORS: Record<AgentStatusValue, string> = {
  available: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  limited: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
  cooling_down: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
  blocked: "bg-red-500/10 text-red-400 border border-red-500/20",
  manual_only: "bg-surface-2 text-text-secondary border border-border/60",
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
    return <div className="p-4 text-text-secondary">로딩 중...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold text-text-primary">에이전트 상태</h1>
        <p className="text-text-secondary mt-2">
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
            <div key={agent} className="rounded-xl border border-border bg-surface-2 p-6">
              {/* 헤더 */}
              <div className="mb-4">
                <h2 className="text-xl font-bold text-text-primary">
                  {AGENT_DISPLAY_NAMES[agentType]}
                </h2>
                <div className="mt-3 flex items-center gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      STATUS_COLORS[currentStatus?.status || "available"]
                    }`}
                  >
                    {(currentStatus?.status || "available").replace("_", " ")}
                  </span>
                </div>
                {currentStatus?.reason && (
                  <p className="text-sm text-text-secondary mt-3">
                    {currentStatus.reason}
                  </p>
                )}
                {currentStatus?.nextAvailableAt && (
                  <p className="text-sm text-text-tertiary mt-2">
                    복구 예상:{" "}
                    {new Date(currentStatus.nextAvailableAt).toLocaleString()}
                  </p>
                )}
              </div>

              {/* 상태 변경 폼 */}
              <div className="space-y-4 border-t border-border/50 pt-5 mt-2">
                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
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
                    className="block w-full rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm text-text-primary focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/30 outline-none transition-colors"
                  >
                    <option value="available">사용 가능 (Available)</option>
                    <option value="limited">사용량 제한 (Limited)</option>
                    <option value="cooling_down">회복 중 (Cooling Down)</option>
                    <option value="blocked">차단됨 (Blocked)</option>
                    <option value="manual_only">수동 제어 전용 (Manual Only)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-text-primary mb-1.5">
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
                    className="block w-full rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm text-text-primary placeholder-text-tertiary focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/30 outline-none transition-colors"
                  />
                </div>

                {["cooling_down", "blocked"].includes(
                  selectedStatuses[agentType]
                ) && (
                  <div>
                    <label className="block text-sm font-semibold text-text-primary mb-1.5">
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
                      className="block w-full rounded-lg border border-border/60 bg-surface px-3 py-2 text-sm text-text-primary focus:border-pink-primary focus:ring-1 focus:ring-pink-primary/30 outline-none transition-colors [color-scheme:dark]"
                    />
                  </div>
                )}

                <button
                  onClick={() => handleUpdateStatus(agentType)}
                  disabled={updatingAgent === agentType}
                  className="w-full rounded-lg bg-pink-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-pink-soft disabled:bg-surface-2 disabled:text-text-tertiary disabled:border disabled:border-border transition-colors"
                >
                  {updatingAgent === agentType
                    ? "업데이트 중..."
                    : "상태 업데이트"}
                </button>
              </div>

              {recommendation && (
                <div className="mt-5 rounded-lg border border-pink-primary/30 bg-pink-primary/5 p-4 text-sm text-pink-primary">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 flex-none" />
                    <div className="space-y-1.5">
                      <p className="leading-relaxed">{recommendation.reason}</p>
                      {recommendation.agent && (
                        <p className="flex items-center gap-2 font-bold mt-2 text-pink-primary">
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
                <div className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm font-medium text-text-secondary flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-400" />
                  아래에 핸드오프 프롬프트가 생성되었습니다.
                </div>
              )}
            </div>
          );
        })}
      </div>

      {Object.values(generatedHandoffs).some(Boolean) && (
        <section className="space-y-5 pt-8 border-t border-border">
          <div>
            <h2 className="text-2xl font-bold text-text-primary">생성된 핸드오프</h2>
            <p className="mt-1.5 text-sm text-text-secondary">
              최근 수동 상태 변경으로 생성된 프롬프트입니다. 복사하여 사용할 수 있습니다.
            </p>
          </div>
          <div className="space-y-6">
            {Object.entries(generatedHandoffs).map(([agent, handoff]) =>
              handoff ? (
                <div key={agent} className="space-y-3 bg-surface-2 p-6 rounded-xl border border-border">
                  <h3 className="font-bold text-lg text-text-primary">
                    {AGENT_DISPLAY_NAMES[agent as AgentType]} 상태 핸드오프
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
