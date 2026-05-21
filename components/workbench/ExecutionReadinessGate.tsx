"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  ShieldCheck,
  Lock,
  ChevronRight,
} from "lucide-react";
import { WorkbenchRunPanel } from "./WorkbenchRunPanel";
import type { PlanTask, PlanTaskStatus, AgentType } from "@/lib/types";

const STATUS_CONFIG: Record<
  PlanTaskStatus,
  { label: string; color: string; bg: string }
> = {
  planned: { label: "계획됨", color: "text-gray-400", bg: "bg-surface-2" },
  ready: { label: "준비됨", color: "text-pink-primary", bg: "bg-pink-primary/10" },
  running: { label: "실행중", color: "text-sky-400", bg: "bg-sky-500/10" },
  done: { label: "완료", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  partial: { label: "부분완료", color: "text-amber-400", bg: "bg-amber-500/10" },
  blocked: { label: "블로킹됨", color: "text-red-400", bg: "bg-red-500/10" },
  needs_review: {
    label: "검토필요",
    color: "text-purple-400",
    bg: "bg-purple-500/10",
  },
};

const AGENT_COLOR: Record<AgentType, string> = {
  "claude-code": "bg-violet-100 text-violet-700",
  codex: "bg-sky-100 text-sky-700",
  antigravity: "bg-fuchsia-100 text-fuchsia-700",
};

const AGENT_EXECUTION_MODE: Record<AgentType, { type: 'executable' | 'manual' | 'background'; label: string; description: string }> = {
  "claude-code": {
    type: 'executable',
    label: '로컬 실행 가능',
    description: '이 작업은 로컬 머신에서 실행됩니다. 승인 후 자동으로 진행되며 실시간으로 로그를 볼 수 있습니다.'
  },
  codex: {
    type: 'manual',
    label: '수동 핸드오프 필요',
    description: '이 작업은 현재 로컬 자동 실행을 지원하지 않습니다. 복사된 프롬프트로 Codex를 별도 실행하세요.'
  },
  antigravity: {
    type: 'manual',
    label: '수동 핸드오프 필요',
    description: '이 UI/시각 작업은 현재 로컬 자동 실행을 지원하지 않습니다. 복사된 프롬프트로 Antigravity를 별도 실행하세요.'
  }
};

interface ExecutionReadinessGateProps {
  task: PlanTask;
  planId: string;
  projectPath: string;
}

export function ExecutionReadinessGate({
  task,
  planId,
  projectPath,
}: ExecutionReadinessGateProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [checks, setChecks] = useState({
    riskAck: false,
    forbiddenFiles: false,
    verifyCommands: false,
    finalApproval: false,
  });

  const toggleCheck = (key: keyof typeof checks) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const autoChecks = {
    taskSelected: true,
    agentAssigned: Boolean(task.assignedAgent),
    agentSupported: task.assignedAgent === "claude-code",
    promptGenerated: Boolean(task.generatedPrompt),
    projectPathSet: Boolean(projectPath),
  };

  const allAutoChecksPassed = Object.values(autoChecks).every(Boolean);
  const allManualsChecked = Object.values(checks).every(Boolean);
  const gateOpen = allAutoChecksPassed && allManualsChecked;

  const cfg = STATUS_CONFIG[task.status];
  const agentCfg = AGENT_COLOR[task.assignedAgent];

  return (
    <div className="space-y-6">
      {/* Checklist section (hidden when gate opens) */}
      {!gateOpen && (
        <div className="space-y-4">
          {/* Task info card */}
          <div className="rounded-xl border bg-surface border-border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-text-primary">
                  {task.title}
                </h2>
                {task.description && (
                  <p className="mt-2 text-sm text-text-secondary line-clamp-3 leading-relaxed">
                    {task.description}
                  </p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span
                  className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
                >
                  {cfg.label}
                </span>
                <span className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${agentCfg}`}>
                  {task.assignedAgent}
                </span>
              </div>
            </div>
          </div>

          {/* Acceptance Criteria */}
          {task.acceptanceCriteria && task.acceptanceCriteria.length > 0 && (
            <div className="rounded-lg border border-border bg-surface-2 p-4">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-2">
                완료 조건 (수락 기준)
              </span>
              <ul className="space-y-1">
                {task.acceptanceCriteria.map((criterion, idx) => (
                  <li key={idx} className="text-xs text-gray-600 flex gap-2">
                    <span className="shrink-0">•</span>
                    <span>{criterion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prompt preview */}
          <div className="rounded-lg border border-border bg-surface-2 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                생성된 프롬프트
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => setShowPrompt(!showPrompt)}
                  className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                  title={showPrompt ? "숨기기" : "보기"}
                >
                  {showPrompt ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
                {task.generatedPrompt && (
                  <button
                    onClick={async () => {
                      await navigator.clipboard.writeText(task.generatedPrompt!);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                    title="복사"
                  >
                    {copiedPrompt ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </div>
            {task.generatedPrompt ? (
              showPrompt ? (
                <pre className="text-xs text-gray-700 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap leading-relaxed overflow-auto max-h-48">
                  {task.generatedPrompt}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">클릭해서 프롬프트 보기</p>
              )
            ) : (
              <p className="text-xs text-gray-300">프롬프트가 아직 생성되지 않았습니다</p>
            )}
          </div>

          {/* Agent execution mode banner */}
          {task.assignedAgent && (
            <div className={`rounded-lg border p-4 space-y-2 ${
              AGENT_EXECUTION_MODE[task.assignedAgent].type === 'executable'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-start gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide flex-1">
                  {AGENT_EXECUTION_MODE[task.assignedAgent].label}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded ${
                  AGENT_EXECUTION_MODE[task.assignedAgent].type === 'executable'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {task.assignedAgent}
                </span>
              </div>
              <p className={`text-sm leading-relaxed ${
                AGENT_EXECUTION_MODE[task.assignedAgent].type === 'executable'
                  ? 'text-emerald-700'
                  : 'text-amber-700'
              }`}>
                {AGENT_EXECUTION_MODE[task.assignedAgent].description}
              </p>
            </div>
          )}

          {/* Auto-checks */}
          <div className="rounded-lg border border-border bg-surface-2 p-4 space-y-2">
            <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide block mb-3">
              자동 확인
            </span>
            {[
              {
                check: autoChecks.taskSelected,
                label: "작업이 선택되었습니다",
              },
              {
                check: autoChecks.agentAssigned,
                label: `에이전트가 배정되었습니다 — ${task.assignedAgent}`,
              },
              {
                check: autoChecks.agentSupported,
                label: AGENT_EXECUTION_MODE[task.assignedAgent]?.type === 'executable'
                  ? `✅ ${task.assignedAgent}는 로컬 실행을 지원합니다`
                  : `⚠️ ${task.assignedAgent}는 수동 핸드오프만 지원합니다`,
              },
              {
                check: autoChecks.promptGenerated,
                label: "프롬프트가 생성되었습니다",
              },
              {
                check: autoChecks.projectPathSet,
                label: `프로젝트 경로가 설정되었습니다 — ${projectPath || "미설정"}`,
              },
            ].map((item, idx) => (
              <div key={idx} className="flex items-start gap-2">
                {item.check ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <span className="text-sm text-text-secondary">{item.label}</span>
              </div>
            ))}
          </div>

          {/* Manual checkboxes */}
          {allAutoChecksPassed && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
              <span className="text-xs font-semibold text-amber-800 uppercase tracking-wide block">
                사용자 확인 필요
              </span>

              {AGENT_EXECUTION_MODE[task.assignedAgent]?.type === 'executable' ? (
                [
                  {
                    key: "riskAck" as const,
                    label:
                      "파일 수정 확인: 이 로컬 실행은 프로젝트 파일을 수정할 수 있습니다. 아래 프롬프트를 반드시 검토한 후 진행하세요.",
                  },
                  {
                    key: "forbiddenFiles" as const,
                    label:
                      "금지 파일 확인: 패키지 파일(.json), 환경 파일(.env), 데이터베이스 마이그레이션 스크립트는 수정되지 않습니다.",
                  },
                  {
                    key: "verifyCommands" as const,
                    label:
                      "검증 명령어: 실행 완료 후 터미널에서 npm run typecheck && npm run lint && npm run test && npm run build를 직접 실행해야 합니다.",
                  },
                  {
                    key: "finalApproval" as const,
                    label:
                      "최종 승인: Claude Code에 이미 로그인되어 있으며, 실행에 동의합니다.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={checks[item.key]}
                      onChange={() => toggleCheck(item.key)}
                      className="mt-0.5 accent-pink-primary w-4 h-4 rounded"
                    />
                    <span className="text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                      {item.label}
                    </span>
                  </label>
                ))
              ) : (
                [
                  {
                    key: "riskAck" as const,
                    label:
                      "프롬프트 검토: 아래의 프롬프트를 복사하여 {task.assignedAgent}에서 실행합니다. 파일 수정 위험을 이해합니다.",
                  },
                  {
                    key: "forbiddenFiles" as const,
                    label:
                      "핸드오프 준비: 결과와 diff를 저장하고 복사할 준비가 되었습니다.",
                  },
                  {
                    key: "verifyCommands" as const,
                    label:
                      "다음 단계 이해: 실행 후 결과를 복사하여 세션 리포트를 작성합니다.",
                  },
                  {
                    key: "finalApproval" as const,
                    label:
                      "최종 승인: 수동 핸드오프 방식을 이해했으며, {task.assignedAgent}를 별도로 실행합니다.",
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-start gap-3 cursor-pointer group"
                  >
                    <input
                      type="checkbox"
                      checked={checks[item.key]}
                      onChange={() => toggleCheck(item.key)}
                      className="mt-0.5 accent-pink-primary w-4 h-4 rounded"
                    />
                    <span className="text-sm text-text-secondary leading-relaxed group-hover:text-text-primary transition-colors">
                      {item.label.replace('{task.assignedAgent}', task.assignedAgent)}
                    </span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Gate open for executable agents */}
      {gateOpen && task.assignedAgent === "claude-code" && (
        <>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-emerald-700">
                모든 조건이 충족되었습니다
              </p>
              <p className="text-xs text-emerald-600 mt-1">
                로컬 실행 영역이 활성화되었습니다. 이 러너는 기본적으로 유료 API를 호출하지 않으며, 로컬 도구에서만 실행됩니다.
              </p>
            </div>
          </div>

          <hr className="border-border" />

          {/* Execution panel */}
          <WorkbenchRunPanel
            task={task}
            planId={planId}
            projectPath={projectPath}
            approvalChecklist={checks}
          />
        </>
      )}

      {/* Gate open for manual handoff agents */}
      {gateOpen && AGENT_EXECUTION_MODE[task.assignedAgent]?.type === 'manual' && (
        <>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">
                수동 핸드오프 준비됨
              </p>
              <p className="text-xs text-amber-600 mt-1">
                {task.assignedAgent}는 현재 로컬 자동 실행을 지원하지 않습니다. 아래의 프롬프트를 복사하여 {task.assignedAgent}를 별도로 실행하세요.
              </p>
            </div>
          </div>

          <hr className="border-border" />

          {/* Manual handoff panel */}
          <div className="space-y-4 rounded-lg border border-border bg-surface-2/50 p-4">
            <div className="space-y-2">
              <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                프롬프트 (복사하여 {task.assignedAgent} 실행)
              </span>
              {task.generatedPrompt ? (
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded border border-border bg-surface p-3 text-xs leading-relaxed text-text-secondary">
                  {task.generatedPrompt}
                </pre>
              ) : (
                <p className="text-xs text-gray-400 italic">프롬프트가 없습니다</p>
              )}
            </div>

            {/* Manual action buttons */}
            <div className="flex flex-wrap gap-2 pt-2">
              {task.generatedPrompt && (
                <button
                  onClick={async () => {
                    await navigator.clipboard.writeText(task.generatedPrompt!);
                    setCopiedPrompt(true);
                    setTimeout(() => setCopiedPrompt(false), 2000);
                  }}
                  className="inline-flex items-center gap-1 rounded bg-pink-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-pink-soft transition-colors"
                >
                  {copiedPrompt ? (
                    <Check className="h-3.5 w-3.5 text-emerald-300" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  {copiedPrompt ? "복사됨" : "프롬프트 복사"}
                </button>
              )}

              <Link
                href="/hermes-packets"
                className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronRight className="h-3.5 w-3.5" />
                핸드오프 초안 준비
              </Link>
            </div>

            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-700 space-y-1">
              <p className="font-semibold">실행 후:</p>
              <ol className="list-decimal list-inside space-y-0.5">
                <li>{task.assignedAgent}에서 작업을 완료합니다</li>
                <li>결과/diff를 저장하고 복사합니다</li>
                <li>이 페이지로 돌아와 세션 리포트를 작성합니다</li>
              </ol>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
