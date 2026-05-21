"use client";

import { useState, useEffect } from "react";
import { Send, CheckCircle, XCircle, RefreshCw, X, Loader2 } from "lucide-react";
import type { Task, Project } from "@/lib/types";

type SendStatus =
  | { type: "idle" }
  | { type: "sending" }
  | { type: "success"; issueId: string; mode: "mock" | "real" }
  | { type: "error"; message: string };

type VibeProject = { id: string; name: string };
type VibeStatus = { id: string; name: string };

export function SendToVibeKanbanButton({ project, task }: { project: Project; task: Task }) {
  const [status, setStatus] = useState<SendStatus>({ type: "idle" });
  const [showDialog, setShowDialog] = useState(false);

  const [orgId, setOrgId] = useState<string>(
    process.env.NEXT_PUBLIC_VIBE_KANBAN_ORG_ID ?? ""
  );
  const [projects, setProjects] = useState<VibeProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [statuses, setStatuses] = useState<VibeStatus[]>([]);
  const [selectedStatusId, setSelectedStatusId] = useState<string>("");
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [fetchError, setFetchError] = useState<string>("");

  const fetchProjects = async (id: string) => {
    if (!id.trim()) return;
    setLoadingProjects(true);
    setFetchError("");
    setProjects([]);
    setSelectedProjectId("");
    setStatuses([]);
    setSelectedStatusId("");
    try {
      const res = await fetch(`/api/vibe-kanban/projects?orgId=${encodeURIComponent(id)}`);
      if (!res.ok) throw new Error("프로젝트 목록 조회 실패");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "프로젝트 목록 조회 실패";
      setFetchError(message);
    } finally {
      setLoadingProjects(false);
    }
  };

  const fetchStatuses = async (projectId: string) => {
    if (!projectId) return;
    setLoadingStatuses(true);
    setFetchError("");
    setStatuses([]);
    setSelectedStatusId("");
    try {
      const res = await fetch(
        `/api/vibe-kanban/statuses?projectId=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) throw new Error("상태 목록 조회 실패");
      const data = await res.json();
      setStatuses(data.statuses ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "상태 목록 조회 실패";
      setFetchError(message);
    } finally {
      setLoadingStatuses(false);
    }
  };

  const handleOpenDialog = () => {
    setShowDialog(true);
    setFetchError("");
    // orgId가 이미 있으면 프로젝트 목록 자동 로드
    if (orgId.trim()) {
      fetchProjects(orgId);
    }
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setFetchError("");
  };

  const handleOrgIdBlur = () => {
    fetchProjects(orgId);
  };

  const handleProjectChange = (projectId: string) => {
    setSelectedProjectId(projectId);
    fetchStatuses(projectId);
  };

  const handleConfirm = async () => {
    if (!selectedProjectId || !selectedStatusId) return;
    setStatus({ type: "sending" });
    setShowDialog(false);
    try {
      const response = await fetch("/api/vibe-kanban/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          projectContext: project.description || "",
          direction: task.userIntent,
          task,
          assumptions: ["Assumed Next.js environment", "Assumed basic setup complete"],
          risks: ["Integration tests pending"],
          projectId: selectedProjectId,
          statusId: selectedStatusId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setStatus({
          type: "success",
          issueId: data.issueId ?? "unknown",
          mode: data.mode === "mock" ? "mock" : "real",
        });
      } else {
        setStatus({ type: "error", message: data.message ?? "Unknown error" });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error";
      setStatus({ type: "error", message });
    }
  };

  const handleRetry = () => {
    setStatus({ type: "idle" });
  };

  if (status.type === "success") {
    return (
      <div className="mt-2 flex items-center gap-2 text-xs">
        <CheckCircle className="w-3 h-3 text-green-500 shrink-0" />
        <span className="text-green-700">
          {status.mode === "mock"
            ? `Mock draft 생성됨 (ID: ${status.issueId}) — VIBE_KANBAN_URL 설정 시 실제 이슈 생성`
            : `Vibe Kanban 이슈 생성 완료 (ID: ${status.issueId})`}
        </span>
      </div>
    );
  }

  if (status.type === "error") {
    return (
      <div className="mt-2 flex items-start gap-2 text-xs">
        <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
        <span className="text-red-700 flex-1">{status.message}</span>
        <button
          onClick={handleRetry}
          className="flex items-center gap-1 px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 transition-colors shrink-0"
        >
          <RefreshCw className="w-3 h-3" />
          재시도
        </button>
      </div>
    );
  }

  return (
    <>
      <button
        onClick={handleOpenDialog}
        disabled={status.type === "sending"}
        className={`mt-2 flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors ${
          status.type === "sending"
            ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
            : "bg-surface-2 text-purple-600 border-purple-200 hover:bg-purple-50"
        }`}
      >
        <Send className="w-3 h-3" />
        {status.type === "sending" ? "전송 중..." : "Vibe Kanban 전송"}
      </button>

      {showDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) handleCloseDialog();
          }}
        >
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm mx-4 p-5">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-800">Vibe Kanban 이슈 생성</h2>
              <button
                onClick={handleCloseDialog}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* orgId 입력 — 환경변수 없을 때만 표시 */}
              {!process.env.NEXT_PUBLIC_VIBE_KANBAN_ORG_ID && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    조직 ID
                  </label>
                  <input
                    type="text"
                    placeholder="조직 ID 입력"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    onBlur={handleOrgIdBlur}
                    className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300"
                  />
                </div>
              )}

              {/* 프로젝트 선택 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  프로젝트
                </label>
                <div className="relative">
                  <select
                    value={selectedProjectId}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    disabled={loadingProjects || !orgId.trim()}
                    className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:bg-gray-50 disabled:text-gray-400 appearance-none pr-8"
                  >
                    <option value="">
                      {loadingProjects ? "로딩 중..." : "프로젝트 선택"}
                    </option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  {loadingProjects && (
                    <Loader2 className="absolute right-2 top-2 w-3 h-3 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* 상태 선택 */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  상태
                </label>
                <div className="relative">
                  <select
                    value={selectedStatusId}
                    onChange={(e) => setSelectedStatusId(e.target.value)}
                    disabled={loadingStatuses || !selectedProjectId}
                    className="w-full text-xs border border-gray-200 rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-purple-300 disabled:bg-gray-50 disabled:text-gray-400 appearance-none pr-8"
                  >
                    <option value="">
                      {loadingStatuses ? "로딩 중..." : "상태 선택"}
                    </option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  {loadingStatuses && (
                    <Loader2 className="absolute right-2 top-2 w-3 h-3 text-gray-400 animate-spin" />
                  )}
                </div>
              </div>

              {/* 에러 메시지 */}
              {fetchError && (
                <p className="text-xs text-red-600 flex items-center gap-1">
                  <XCircle className="w-3 h-3 shrink-0" />
                  {fetchError}
                </p>
              )}

              {/* 버튼 */}
              <div className="flex gap-2 justify-end pt-1">
                <button
                  onClick={handleCloseDialog}
                  className="text-xs px-3 py-1.5 rounded border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={!selectedProjectId || !selectedStatusId}
                  className="text-xs px-3 py-1.5 rounded bg-purple-600 text-white hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
                >
                  이슈 생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
