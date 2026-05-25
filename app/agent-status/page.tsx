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
  available: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  limited: "bg-amber-50 text-amber-700 border border-amber-200",
  cooling_down: "bg-orange-50 text-orange-700 border border-orange-200",
  blocked: "bg-red-50 text-red-700 border border-red-200",
  manual_only: "bg-zinc-50 text-zinc-600 border border-zinc-200",
};

const STATUS_DESCRIPTIONS: Record<AgentStatusValue, { korean: string; can: string; cannot: string; next: string }> = {
  available: {
    korean: "사용 가능",
    can: "모든 작업 자동 실행 가능",
    cannot: "없음",
    next: "작업 할당 시 자동 실행됩니다",
  },
  limited: {
    korean: "사용량 제한",
    can: "수동으로 지정된 작업만 실행",
    cannot: "자동 작업 할당",
    next: "쿼터 회복 후 사용 가능 상태로 복원해주세요",
  },
  cooling_down: {
    korean: "회복 중",
    can: "없음",
    cannot: "모든 작업 (자동/수동 포함)",
    next: "예상 시간 이후 자동으로 복구될 예정입니다",
  },
  blocked: {
    korean: "차단됨",
    can: "없음",
    cannot: "모든 작업",
    next: "문제 해결 후 상태를 복구해주세요",
  },
  manual_only: {
    korean: "수동 제어 전용",
    can: "명시적으로 지정된 작업만 실행",
    cannot: "자동 작업 할당",
    next: "기획 UI에서 명확히 지정할 때만 실행됩니다",
  },
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
        <h1 className="text-2xl font-bold text-text-primary">에이전트 상태</h1>
        <p className="text-text-secondary mt-1 text-sm">
          에이전트 상태를 관리하고 필요시 자동 핸드오프를 생성합니다.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {["claude-code", "codex", "antigravity"].map((agent) => {
          const agentType = agent as AgentType;
          const currentStatus = statuses.find((s) => s.agent === agentType);
          return (
            <div key={agent} className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                {AGENT_DISPLAY_NAMES[agentType]}
              </p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    STATUS_COLORS[currentStatus?.status || "available"]
                  }`}
                >
                  {STATUS_DESCRIPTIONS[currentStatus?.status || "available"].korean}
                </span>
                <span className="text-xs text-zinc-500">다음: {STATUS_DESCRIPTIONS[currentStatus?.status || "available"].next}</span>
              </div>
            </div>
          );
        })}
      </section>

      <div className="flex flex-col border border-zinc-200 bg-white rounded-xl overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="hidden lg:grid grid-cols-[180px_1fr_120px_340px] items-center gap-4 px-6 py-3 border-b border-zinc-200 bg-zinc-50 text-xs font-bold text-zinc-500 uppercase tracking-wider">
          <div>에이전트 정보</div>
          <div>할 수 있는 일 / 제한 / 다음 행동</div>
          <div>상태</div>
          <div>상태 제어</div>
        </div>

        {/* Rows */}
        <div className="divide-y divide-zinc-200 bg-white">
          {["claude-code", "codex", "antigravity"].map((agent) => {
            const agentType = agent as AgentType;
            const currentStatus = statuses.find((s) => s.agent === agentType);
            const handoff = generatedHandoffs[agentType];
            const recommendation = recommendations[agentType];

            return (
              <div key={agent} className="flex flex-col">
                <div className="grid grid-cols-1 lg:grid-cols-[180px_1fr_120px_340px] items-center gap-4 px-6 py-4">
                  {/* 에이전트 이름 및 설명 */}
                  <div className="min-w-0">
                    <h2 className="text-base font-bold text-text-primary">
                      {AGENT_DISPLAY_NAMES[agentType]}
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {agentType === "claude-code"
                        ? "Architecture & Reasoning"
                        : agentType === "codex"
                        ? "Implementation & QA"
                        : "UI/UX & Frontend"}
                    </p>
                  </div>

                  {/* 할 수 있는 일 / 제한되는 일 / 다음 행동 */}
                  <div className="space-y-1 text-xs">
                    <div>
                      <span className="text-text-tertiary font-medium">할 수 있는 일: </span>
                      <span className="text-text-secondary">{STATUS_DESCRIPTIONS[currentStatus?.status || "available"].can}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary font-medium">제한되는 일: </span>
                      <span className="text-text-secondary">{STATUS_DESCRIPTIONS[currentStatus?.status || "available"].cannot}</span>
                    </div>
                    <div>
                      <span className="text-text-tertiary font-medium">다음 행동: </span>
                      <span className="text-text-secondary">{STATUS_DESCRIPTIONS[currentStatus?.status || "available"].next}</span>
                    </div>
                    {currentStatus?.reason && (
                      <p className="text-xs text-pink-primary mt-1 italic font-medium">
                        &quot;{currentStatus.reason}&quot;
                      </p>
                    )}
                    {currentStatus?.nextAvailableAt && (
                      <p className="text-[11px] text-text-tertiary mt-0.5">
                        ⏰ 예상 복구: {new Date(currentStatus.nextAvailableAt).toLocaleString("ko-KR")}
                      </p>
                    )}
                  </div>

                  {/* 상태 배지 */}
                  <div>
                    <span
                      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        STATUS_COLORS[currentStatus?.status || "available"]
                      }`}
                    >
                      {STATUS_DESCRIPTIONS[currentStatus?.status || "available"].korean}
                    </span>
                  </div>

                  {/* 상태 변경 폼 */}
                  <div className="space-y-2 border-t border-dashed border-border/60 lg:border-t-0 pt-3 lg:pt-0">
                    <div className="flex gap-2">
                      <select
                        value={selectedStatuses[agentType]}
                        onChange={(e) =>
                          setSelectedStatuses({
                            ...selectedStatuses,
                            [agentType]: e.target.value as AgentStatusValue,
                          })
                        }
                        className="text-xs px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 focus:border-pink-primary outline-none max-w-[140px]"
                      >
                        <option value="available">사용 가능</option>
                        <option value="limited">사용량 제한</option>
                        <option value="cooling_down">회복 중</option>
                        <option value="blocked">차단됨</option>
                        <option value="manual_only">수동 전용</option>
                      </select>
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
                        className="text-xs px-2 py-1.5 rounded-lg border border-zinc-200 bg-white text-zinc-900 placeholder-text-tertiary focus:border-pink-primary outline-none flex-1"
                      />
                    </div>

                    {["cooling_down", "blocked"].includes(
                      selectedStatuses[agentType]
                    ) && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-text-secondary shrink-0">복구 예상:</span>
                        <input
                          type="datetime-local"
                          value={nextAvailableTimes[agentType]}
                          onChange={(e) =>
                            setNextAvailableTimes({
                              ...nextAvailableTimes,
                              [agentType]: e.target.value,
                            })
                          }
                          className="text-[10px] px-2 py-1 rounded border border-zinc-200 bg-white text-zinc-900 focus:border-pink-primary outline-none w-full [color-scheme:light]"
                        />
                      </div>
                    )}

                    <button
                      onClick={() => handleUpdateStatus(agentType)}
                      disabled={updatingAgent === agentType}
                      className="w-full text-xs font-semibold py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white transition-colors disabled:opacity-40 border border-zinc-950 shadow-sm"
                    >
                      {updatingAgent === agentType ? "업데이트 중..." : "상태 업데이트"}
                    </button>
                  </div>
                </div>

                {/* 추천 및 핸드오프 정보 */}
                {(recommendation || handoff) && (
                  <div className="px-6 py-3 bg-pink-primary/5 border-t border-border flex flex-col gap-2">
                    {recommendation && (
                      <div className="flex items-start gap-2 text-xs text-pink-primary">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-none" />
                        <div>
                          <p className="leading-relaxed font-medium">{recommendation.reason}</p>
                          {recommendation.agent && (
                            <p className="flex items-center gap-2 font-bold mt-1 text-pink-primary">
                              <span>{AGENT_DISPLAY_NAMES[agentType]}</span>
                              <ArrowRight className="h-3 w-3" />
                              <span>{AGENT_DISPLAY_NAMES[recommendation.agent]}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                    {handoff && (
                      <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
                        <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                        아래에 에이전트 핸드오프 프롬프트가 추가로 로드되었습니다.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {Object.values(generatedHandoffs).some(Boolean) && (
        <section className="space-y-4 pt-6 border-t border-border">
          <div>
            <h2 className="text-xl font-bold text-text-primary">생성된 핸드오프</h2>
            <p className="mt-1 text-xs text-text-secondary">
              상태 변경 과정에서 추출된 자동 복구 및 핸드오프 지시 프롬프트입니다.
            </p>
          </div>
          <div className="space-y-4">
            {Object.entries(generatedHandoffs).map(([agent, handoff]) =>
              handoff ? (
                <div key={agent} className="space-y-2 bg-white p-4 rounded-xl border border-zinc-200">
                  <h3 className="font-bold text-sm text-text-primary">
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
