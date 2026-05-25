"use client";

import { useState } from "react";
import { OrchestrationDecisionCard } from "./OrchestrationDecisionCard";
import { ApprovalGateCard } from "./ApprovalGateCard";
import { ExecutionBoundaryCard } from "./ExecutionBoundaryCard";
import { ContextPackPreview } from "./ContextPackPreview";
import { MonitorMemoryPreview } from "./MonitorMemoryPreview";
import type { OrchestrationDecision, ContextPack, MonitorMemoryNote } from "@/lib/orchestration/types";

interface OrchestrationDecisionPanelProps {
  decision?: OrchestrationDecision;
  contextPack?: ContextPack;
  memoryNote?: MonitorMemoryNote;
}

export function OrchestrationDecisionPanel({
  decision,
  contextPack,
  memoryNote,
}: OrchestrationDecisionPanelProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [filePaths, setFilePaths] = useState("");
  const [taskType, setTaskType] = useState("bug-fix");

  const [currentDecision, setCurrentDecision] = useState<OrchestrationDecision | null>(decision ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateDecision = async () => {
    if (!title.trim()) {
      setError("작업 제목을 입력하세요.");
      return;
    }

    if (!description.trim()) {
      setError("작업 설명을 입력하세요.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/orchestration/decision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          filePaths: filePaths
            .split("\n")
            .map((f) => f.trim())
            .filter(Boolean),
          taskType,
        }),
      });

      if (!response.ok) {
        throw new Error(`API 오류: ${response.statusText}`);
      }

      const result = await response.json();
      setCurrentDecision(result.decision);
    } catch (err) {
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="rounded-lg border border-border bg-surface-1 p-4 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary">오케스트레이션 결정 생성</h2>
          <p className="text-xs text-text-secondary mt-0.5">
            작업 정보를 입력하면 위험도, 에이전트, 실행 모드, 승인 게이트 등을 자동으로 판단합니다.
          </p>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">작업 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: Fix TypeScript errors in orchestration module"
            className="w-full rounded border border-border bg-surface-2 text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pink-primary"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">작업 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="작업의 상세 설명, 변경 사항, 영향 범위 등"
            rows={4}
            className="w-full rounded border border-border bg-surface-2 text-text-primary text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-pink-primary"
          />
        </div>

        {/* File Paths */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">변경 파일 (한 줄씩)</label>
          <textarea
            value={filePaths}
            onChange={(e) => setFilePaths(e.target.value)}
            placeholder="lib/orchestration/decision-engine.ts&#10;lib/orchestration/agent-router.ts"
            rows={3}
            className="w-full rounded border border-border bg-surface-2 text-text-primary text-sm px-3 py-2 font-mono resize-none focus:outline-none focus:ring-1 focus:ring-pink-primary"
          />
        </div>

        {/* Task Type */}
        <div>
          <label className="block text-xs font-medium text-text-primary mb-1">작업 유형</label>
          <select
            value={taskType}
            onChange={(e) => setTaskType(e.target.value)}
            className="w-full rounded border border-border bg-surface-2 text-text-primary text-sm px-3 py-2 focus:outline-none focus:ring-1 focus:ring-pink-primary"
          >
            <option value="bug-fix">버그 수정</option>
            <option value="feature">새 기능</option>
            <option value="refactor">리팩토링</option>
            <option value="test">테스트</option>
            <option value="database">DB 마이그레이션</option>
            <option value="deployment">배포</option>
            <option value="ui">UI/UX</option>
            <option value="api">API 개발</option>
          </select>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-700 bg-red-950 p-3">
            <p className="text-sm text-red-200">{error}</p>
          </div>
        )}

        {/* Button */}
        <button
          type="button"
          onClick={handleGenerateDecision}
          disabled={isLoading}
          className="w-full px-4 py-2 rounded bg-zinc-900 border border-zinc-950 text-white text-sm font-medium hover:bg-zinc-800 transition-colors disabled:opacity-50"
        >
          {isLoading ? "생성 중..." : "결정 생성"}
        </button>
      </div>

      {/* Decision Result Section */}
      {currentDecision && (
        <div className="space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary">오케스트레이션 결정 결과</h2>
            <p className="text-xs text-text-secondary mt-0.5">
              위험도, 에이전트, 실행 모드, 승인 게이트, 실행 경계, 메모리 제안을 확인하세요.
            </p>
          </div>

          {/* Decision Card */}
          <div className="rounded-lg border-2 border-pink-700 bg-pink-950 p-4">
            <OrchestrationDecisionCard decision={currentDecision} />
          </div>

          {/* Approval Gate Card */}
          <div>
            <h3 className="text-xs font-semibold text-text-primary mb-2">승인 게이트</h3>
            <ApprovalGateCard gate={currentDecision.approvalGate} riskLevel={currentDecision.riskLevel} />
          </div>

          {/* Execution Boundary Card */}
          <div>
            <h3 className="text-xs font-semibold text-text-primary mb-2">실행 경계</h3>
            <ExecutionBoundaryCard boundary={currentDecision.fileBoundary} />
          </div>

          {/* Context Pack Preview */}
          {contextPack && (
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-2">Context Pack</h3>
              <ContextPackPreview pack={contextPack} />
            </div>
          )}

          {/* Hermes Memory Preview */}
          {memoryNote && (
            <div>
              <h3 className="text-xs font-semibold text-text-primary mb-2">Hermes 메모리</h3>
              <MonitorMemoryPreview note={memoryNote} />
            </div>
          )}

          {/* Decision JSON */}
          <div className="rounded-lg border border-border bg-surface-2 p-3">
            <button
              type="button"
              className="text-xs font-medium text-text-secondary hover:text-text-primary mb-2"
              onClick={() => {
                const text = JSON.stringify(currentDecision, null, 2);
                navigator.clipboard.writeText(text);
              }}
            >
              📋 JSON 복사
            </button>
            <pre className="text-xs overflow-x-auto max-h-48 overflow-y-auto font-mono text-text-secondary">
              {JSON.stringify(currentDecision, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
