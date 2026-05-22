"use client";

/**
 * ExecutionBoundaryCard
 * Phase 40: Full Orchestration Layer
 *
 * 에이전트 실행 경계(파일 허용/금지, 명령어, Do-Not-Do 규칙)를 표시한다.
 */

import { useState } from "react";
import type { FileBoundary } from "@/lib/orchestration/types";

type Tab = "files" | "commands" | "rules";

interface ExecutionBoundaryCardProps {
  boundary: FileBoundary;
}

export function ExecutionBoundaryCard({ boundary }: ExecutionBoundaryCardProps) {
  const [activeTab, setActiveTab] = useState<Tab>("files");

  const tabs: { id: Tab; label: string; count: number }[] = [
    {
      id: "files",
      label: "파일",
      count:
        boundary.filesToInspect.length +
        boundary.filesAllowedToEdit.length +
        boundary.filesBlockedFromEditing.length,
    },
    {
      id: "commands",
      label: "명령어",
      count: boundary.commandsAllowed.length + boundary.commandsBlocked.length,
    },
    {
      id: "rules",
      label: "규칙",
      count: boundary.doNotDoRules.length,
    },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-3">실행 경계</h3>

      {/* Tabs */}
      <div className="flex gap-1 mb-3 border-b border-gray-100 pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              activeTab === tab.id
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 opacity-70">({tab.count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Files Tab */}
      {activeTab === "files" && (
        <div className="space-y-3">
          {boundary.filesToInspect.length > 0 && (
            <FileSection
              label="먼저 확인"
              files={boundary.filesToInspect}
              colorClass="text-blue-700 bg-blue-50"
              icon="👁️"
            />
          )}
          {boundary.filesAllowedToEdit.length > 0 && (
            <FileSection
              label="수정 가능"
              files={boundary.filesAllowedToEdit}
              colorClass="text-green-700 bg-green-50"
              icon="✅"
            />
          )}
          {boundary.filesBlockedFromEditing.length > 0 && (
            <FileSection
              label="수정 금지"
              files={boundary.filesBlockedFromEditing}
              colorClass="text-red-700 bg-red-50"
              icon="⛔"
            />
          )}
          {boundary.filesToInspect.length === 0 &&
            boundary.filesAllowedToEdit.length === 0 &&
            boundary.filesBlockedFromEditing.length === 0 && (
              <p className="text-xs text-gray-400">파일 경계 미지정</p>
            )}
        </div>
      )}

      {/* Commands Tab */}
      {activeTab === "commands" && (
        <div className="space-y-3">
          {boundary.commandsAllowed.length > 0 && (
            <CommandSection
              label="허용 명령어"
              commands={boundary.commandsAllowed}
              colorClass="text-green-700 bg-green-50"
            />
          )}
          {boundary.commandsBlocked.length > 0 && (
            <CommandSection
              label="금지 명령어"
              commands={boundary.commandsBlocked}
              colorClass="text-red-700 bg-red-50"
            />
          )}
        </div>
      )}

      {/* Rules Tab */}
      {activeTab === "rules" && (
        <div className="space-y-1">
          {boundary.doNotDoRules.length > 0 ? (
            boundary.doNotDoRules.map((rule, i) => (
              <div key={i} className="flex items-start gap-2 text-xs p-1.5 rounded bg-red-50">
                <span className="text-red-500 mt-0.5">❌</span>
                <span className="text-red-700">{rule}</span>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400">Do-Not-Do 규칙 미지정</p>
          )}
        </div>
      )}
    </div>
  );
}

function FileSection({
  label,
  files,
  colorClass,
  icon,
}: {
  label: string;
  files: string[];
  colorClass: string;
  icon: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">
        {icon} {label}
      </p>
      <div className="space-y-0.5">
        {files.map((f, i) => (
          <code
            key={i}
            className={`block text-xs px-2 py-1 rounded font-mono ${colorClass}`}
          >
            {f}
          </code>
        ))}
      </div>
    </div>
  );
}

function CommandSection({
  label,
  commands,
  colorClass,
}: {
  label: string;
  commands: string[];
  colorClass: string;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-600 mb-1">{label}</p>
      <div className="space-y-0.5">
        {commands.map((c, i) => (
          <code
            key={i}
            className={`block text-xs px-2 py-1 rounded font-mono ${colorClass}`}
          >
            {c}
          </code>
        ))}
      </div>
    </div>
  );
}
