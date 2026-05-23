"use client";

import React, { useState } from "react";
import Link from "next/link";
import { AlertCircle, HelpCircle, ArrowRight, Check, Eye } from "lucide-react";

interface DecisionItem {
  id: string;
  question: string;
  options: string[];
  stageId: string;
  stageTitle: string;
}

interface BlockerItem {
  id: string;
  title: string;
  description: string;
  stageId: string;
  stageTitle: string;
}

interface YourNextMoveProps {
  userDecisions: DecisionItem[];
  blockers: BlockerItem[];
  approvalRequired: boolean;
  workbenchUrl?: string;
}

export function YourNextMove({
  userDecisions,
  blockers,
  approvalRequired,
  workbenchUrl,
}: YourNextMoveProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [completedActions, setCompletedActions] = useState<Record<string, string>>({});

  const handleSelectOption = (decisionId: string, option: string) => {
    setSelectedOptions((prev) => ({ ...prev, [decisionId]: option }));
  };

  const handleConfirmDecision = (decisionId: string) => {
    const option = selectedOptions[decisionId];
    if (!option) return;

    setLoading((prev) => ({ ...prev, [decisionId]: true }));
    setTimeout(() => {
      setLoading((prev) => ({ ...prev, [decisionId]: false }));
      setCompletedActions((prev) => ({
        ...prev,
        [decisionId]: `선택됨: ${option} (Manual action required in chat to submit)`,
      }));
    }, 600);
  };

  const hasItems = userDecisions.length > 0 || blockers.length > 0 || approvalRequired || !!workbenchUrl;

  return (
    <div className="rounded-xl border border-pink-primary/20 bg-surface p-5 shadow-lg relative overflow-hidden animate-fade-in">
      {/* Accent glow line at top */}
      <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-pink-primary via-pink-soft to-pink-primary opacity-60" />

      <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
        <span className="flex h-2 w-2 rounded-full bg-pink-primary animate-status-ping" />
        다음 자동 실행 작업
      </h2>

      {!hasItems ? (
        <div className="mt-4 py-6 text-center rounded-lg border border-dashed border-border bg-surface-2/40">
          <p className="text-sm text-text-secondary">
            대기 중인 피드백이나 승인이 없습니다. 에이전트가 정상적으로 작동 중입니다.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* 1. Active Run Resume */}
          {workbenchUrl && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <ArrowRight className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-emerald-200">
                    진행 중인 작업 이어가기
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    현재 로컬 러너에서 실행 중인 작업이 있습니다. 워크벤치에서 실시간으로 모니터링할 수 있습니다.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Link
                  href={workbenchUrl}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 hover:border-emerald-500/50 transition-colors"
                >
                  워크벤치에서 계속하기
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {/* 2. Approval Required from Hermes */}
          {approvalRequired && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-amber-200">
                    고위험 작업 승인 대기
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    현재 실행 작업 대기열에 고위험 작업이 승인 대기 중입니다. 계속하려면 변경된 내용 확인 후 승인을 진행하세요.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Link
                  href="/orchestration"
                  className="inline-flex items-center gap-1.5 rounded bg-amber-500/20 border border-amber-500/40 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/50 transition-colors"
                >
                  <ArrowRight className="w-3.5 h-3.5" />
                  승인 확인
                </Link>
                <Link
                  href="/result-review"
                  className="inline-flex items-center gap-1 rounded bg-pink-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-soft transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" />
                  변경된 파일 내용 확인
                </Link>
              </div>
            </div>
          )}

          {/* 3. User Decisions Needed */}
          {userDecisions.map((decision) => {
            const isDone = completedActions[decision.id];
            return (
              <div
                key={decision.id}
                className="rounded-lg border border-border bg-surface-2/60 p-4 space-y-3"
              >
                <div className="flex items-start gap-3">
                  <HelpCircle className="w-5 h-5 text-pink-primary shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary/60">
                      의사결정 필요 · {decision.stageTitle}
                    </span>
                    <h3 className="text-sm font-semibold text-text-primary mt-0.5 leading-relaxed">
                      {decision.question}
                    </h3>
                  </div>
                </div>

                {isDone ? (
                  <p className="text-xs font-medium text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                    <Check className="w-4 h-4 shrink-0" />
                    {completedActions[decision.id]}
                  </p>
                ) : (
                  <div className="space-y-3 pt-2">
                    <div className="flex flex-wrap gap-2">
                      {decision.options.map((opt) => {
                        const isSelected = selectedOptions[decision.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleSelectOption(decision.id, opt)}
                            className={`px-3 py-1.5 rounded text-xs font-medium border transition-all ${
                              isSelected
                                ? "bg-pink-primary/10 border-pink-primary text-pink-primary"
                                : "bg-surface border-border text-text-secondary hover:text-text-primary hover:bg-surface-2"
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                      <button
                        type="button"
                        onClick={() => handleConfirmDecision(decision.id)}
                        disabled={!selectedOptions[decision.id] || loading[decision.id]}
                        className="inline-flex items-center gap-1.5 rounded bg-pink-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-soft transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {loading[decision.id] ? "선택 저장 중..." : "결정 확인"}
                      </button>
                      <a
                        href={`#phase-${decision.stageId}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-pink-soft transition-colors"
                      >
                        상세 보기
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* 4. Blockers */}
          {blockers.map((blocker) => (
            <div
              key={blocker.id}
              className="rounded-lg border border-red-500/20 bg-red-500/5 p-4 space-y-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-400/80">
                    차단됨 (Blocker) · {blocker.stageTitle}
                  </span>
                  <h3 className="text-sm font-semibold text-text-primary mt-0.5">
                    {blocker.title}
                  </h3>
                  <p className="text-xs text-text-secondary mt-1">
                    {blocker.description}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                <Link
                  href="/"
                  className="inline-flex items-center gap-1 rounded bg-pink-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-pink-soft transition-colors"
                >
                  기획 채팅에서 논의하기
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a
                  href={`#phase-${blocker.stageId}`}
                  className="inline-flex items-center gap-1 rounded bg-surface-2 border border-border px-3 py-1.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
                >
                  상세 보기
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
