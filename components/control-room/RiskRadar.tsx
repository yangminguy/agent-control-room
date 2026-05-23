import React from "react";
import { ShieldAlert, CheckCircle, ShieldCheck, Database, GitBranch, AlertTriangle } from "lucide-react";

interface RiskRadarProps {
  stages: { id: string; title: string; status: string; tasks: any[] }[];
  agents: { id: string; name: string; availability: string }[];
}

export function RiskRadar({ stages, agents }: RiskRadarProps) {
  // 1. Gather actual risks
  const blockedStages = stages.filter((s) => s.status === "blocked" || s.status === "failed");
  const userInputStages = stages.filter((s) => s.status === "user_input_required");
  
  const problematicAgents = agents.filter((a) =>
    ["blocked", "token_limited", "context_overloaded", "disconnected", "approval_required"].includes(
      a.availability
    )
  );

  // Check if any QA phase is incomplete
  const pendingQaStage = stages.find(
    (s) =>
      (s.title.toLowerCase().includes("qa") || s.title.toLowerCase().includes("test")) &&
      s.status !== "completed"
  );

  const hasRisks =
    blockedStages.length > 0 ||
    userInputStages.length > 0 ||
    problematicAgents.length > 0 ||
    pendingQaStage;

  return (
    <div className="rounded-xl border border-border bg-surface p-5 animate-fade-in space-y-4">
      <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-pink-primary" />
        시스템 리스크 감시
      </h3>

      <div className="space-y-3">
        {/* Actual Risks */}
        {blockedStages.map((stage) => (
          <div
            key={stage.id}
            className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs"
          >
            <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">작업 막힘</p>
              <p className="text-text-secondary mt-1">{stage.title} 단계가 진행 불가 상태입니다.</p>
            </div>
          </div>
        ))}

        {userInputStages.map((stage) => (
          <div
            key={stage.id}
            className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs"
          >
            <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5 animate-status-ping" />
            <div>
              <p className="font-semibold text-amber-200">사용자 입력 대기</p>
              <p className="text-text-secondary mt-1">{stage.title} 단계에서 사용자 결정이 지연되고 있습니다.</p>
            </div>
          </div>
        ))}

        {problematicAgents.map((agent) => (
          <div
            key={agent.id}
            className="flex items-start gap-3 rounded-lg border border-red-500/20 bg-red-500/5 p-3 text-xs"
          >
            <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-200">에이전트 경고: {agent.name}</p>
              <p className="text-text-secondary mt-1">상태: {agent.availability} (동작 제한 또는 승인 대기 중)</p>
            </div>
          </div>
        ))}

        {pendingQaStage && (
          <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-200">QA / 검증 대기</p>
              <p className="text-text-secondary mt-1">
                QA/검증 단계인 &quot;{pendingQaStage.title}&quot;가 미완료 상태입니다.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic placeholders showing clean status where no signals are available */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-border/40">
          <div className="rounded-lg bg-surface-2 p-2.5 flex items-center justify-between border border-border/60">
            <div className="flex items-center gap-2">
              <Database className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[10px] text-text-secondary font-medium">API 비용 한도</span>
            </div>
            <span className="text-[10px] text-text-secondary/60">현재 감지된 신호 없음</span>
          </div>

          <div className="rounded-lg bg-surface-2 p-2.5 flex items-center justify-between border border-border/60">
            <div className="flex items-center gap-2">
              <GitBranch className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[10px] text-text-secondary font-medium">Git 충돌</span>
            </div>
            <span className="text-[10px] text-text-secondary/60">현재 감지된 신호 없음</span>
          </div>

          <div className="rounded-lg bg-surface-2 p-2.5 flex items-center justify-between border border-border/60">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-text-secondary" />
              <span className="text-[10px] text-text-secondary font-medium">배포 리스크</span>
            </div>
            <span className="text-[10px] text-text-secondary/60">현재 감지된 신호 없음</span>
          </div>
        </div>

        {!hasRisks && (
          <div className="flex items-center gap-2.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 justify-center text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="text-emerald-300 font-medium">모든 시스템 안정 · 감지된 위험 없음</span>
          </div>
        )}
      </div>
    </div>
  );
}
