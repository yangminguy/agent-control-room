"use client";

import { useState, useEffect } from "react";
import type { HermesPacket } from "@/lib/types";
import { useOrchestration } from "@/lib/dispatch/orchestration-context";
import { Loader2 } from "lucide-react";

export function ExecutionPacketPanel() {
  const { isDemoMode } = useOrchestration();
  const [packets, setPackets] = useState<HermesPacket[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPackets() {
      setIsLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/execution-packets");
        if (!res.ok) throw new Error("Failed to load packets");
        const data = await res.json() as { packets: HermesPacket[] };
        setPackets(data.packets || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setIsLoading(false);
      }
    }
    loadPackets();
  }, []);

  const samplePacket = {
    packet_id: "packet-demo-001",
    packet_type: "phase_success_packet",
    source: "hermes",
    task_id: "task-demo-001",
    phase_id: "phase-demo-001",
    plan_id: "plan-demo-001",
    assigned_agent: "codex",
    execution_status: "success",
    log_summary: "개발자용 샘플 성공 요약입니다.",
    changed_files: ["components/example.tsx"],
    checks_result: { typecheck: "pass", lint: "pass", test: "pass" },
    risk_level: "safe",
    pm_summary: "샘플 작업이 성공한 것처럼 표시되는 개발자용 데이터입니다.",
    recommended_next_action: "샘플 데이터입니다. 실제 실행 판단에 사용하지 마세요.",
    decision: "pass",
    decision_reason: "샘플 판정입니다.",
    confidence: 95,
    next_action: "샘플 다음 액션입니다.",
    created_at: new Date().toISOString(),
  } satisfies HermesPacket;

  function renderPacketCard(p: HermesPacket, label?: string) {
    return (
      <div key={p.packet_id} className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm hover:border-gray-300 transition-colors">
        <div className="flex justify-between items-start mb-2">
          <div>
            {label && (
              <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-900 text-xs font-bold rounded mr-2">
                {label}
              </span>
            )}
            <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 text-xs font-bold rounded mr-2">
              {p.packet_type}
            </span>
            <span className="text-sm font-semibold text-gray-900">{p.task_id}</span>
          </div>
          <span className="text-xs text-gray-500">
            {new Date(p.created_at).toLocaleString("ko-KR")}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mb-2">
          <div><span className="font-semibold">계획 ID:</span> {p.plan_id}</div>
          <div><span className="font-semibold">판정:</span> {p.decision}</div>
          <div><span className="font-semibold">위험도:</span> {p.risk_level}</div>
          <div><span className="font-semibold">권장 다음 액션:</span> {p.recommended_next_action}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">최근 실행 패킷 (Hermes)</h3>
        {isDemoMode && (
          <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-xs font-bold rounded">
            개발자용 샘플 데이터
          </span>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-gray-500 py-4">
          <Loader2 className="h-4 w-4 animate-spin" />
          패킷 목록 불러오는 중...
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
          오류가 발생했습니다: {error}
        </div>
      ) : packets.length === 0 ? (
        <div className="p-8 border border-dashed border-gray-300 rounded-lg text-center bg-gray-50">
          <p className="text-gray-500 text-sm">
            아직 저장된 실행 패킷이 없습니다. 작업 실행 후 이곳에 Hermes 판단 결과가 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {packets.slice(0, 5).map((packet) => renderPacketCard(packet))}
        </div>
      )}

      {isDemoMode && (
        <div className="space-y-2 border-t border-dashed border-yellow-300 pt-4">
          <p className="text-xs font-bold text-yellow-900">개발자용 샘플 데이터</p>
          {renderPacketCard(samplePacket, "샘플")}
        </div>
      )}
    </div>
  );
}
