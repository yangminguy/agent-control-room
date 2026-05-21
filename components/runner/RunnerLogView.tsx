"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentType } from "@/lib/types";

interface RunnerLogViewProps {
  planId: string;
  taskId: string;
  prompt: string;
  agent: AgentType;
  projectPath: string;
  approvalToken: string;
  onComplete?: (status: "done" | "failed", branchName?: string) => void;
}

interface LogEntry {
  log: string;
  type: "stdout" | "stderr" | "system";
}

function generateBranchPreview(taskId: string): string {
  const now = new Date();
  const yyyymmdd = now.toISOString().split("T")[0].replace(/-/g, "");
  const hhmm =
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0");

  return `acr/${taskId}-${yyyymmdd}-${hhmm}`;
}

export function RunnerLogView({
  planId,
  taskId,
  prompt,
  agent,
  projectPath,
  approvalToken,
  onComplete,
}: RunnerLogViewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [exitCode, setExitCode] = useState<number | null>(null);
  const [actualBranchName, setActualBranchName] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const branchName = generateBranchPreview(taskId);

  const scrollToBottom = useCallback(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [logs, scrollToBottom]);

  const handleExecute = async () => {
    if (isRunning) return;

    setIsRunning(true);
    setLogs([]);
    setExitCode(null);
    setActualBranchName(null);

    try {
      const response = await fetch("/api/runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId,
          taskId,
          prompt,
          cwd: projectPath,
          agent,
          approvalToken,
        }),
      });

      if (!response.ok) {
        setLogs((prev) => [
          ...prev,
          { log: `[ERROR] API returned ${response.status}`, type: "system" },
        ]);
        setIsRunning(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        setLogs((prev) => [
          ...prev,
          { log: "[ERROR] No response body", type: "system" },
        ]);
        setIsRunning(false);
        return;
      }

      const decoder = new TextDecoder();
      let buffer = "";
      let completedBranchName: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");

        for (let i = 0; i < lines.length - 1; i++) {
          const line = lines[i];
          if (line.startsWith("data: ")) {
            try {
              const jsonStr = line.slice("data: ".length);
              const entry = JSON.parse(jsonStr) as LogEntry;
              setLogs((prev) => [...prev, entry]);

              if (entry.log.startsWith("[INFO] Branch created: ")) {
                completedBranchName = entry.log.replace("[INFO] Branch created: ", "");
                setActualBranchName(completedBranchName);
              }

              if (entry.log.startsWith("[DONE]") || entry.log.startsWith("[ERROR]")) {
                const match = entry.log.match(/Exit code: (\d+)/);
                if (match) {
                  const code = parseInt(match[1], 10);
                  setExitCode(code);
                  const status = code === 0 ? "done" : "failed";
                  onComplete?.(status, completedBranchName || branchName);
                  setIsRunning(false);
                }
              }
            } catch (error) {
              console.error("Failed to parse SSE message:", error);
            }
          }
        }

        buffer = lines[lines.length - 1];
      }

      setIsRunning(false);
    } catch (error) {
      setLogs((prev) => [
        ...prev,
        {
          log: `[ERROR] ${error instanceof Error ? error.message : String(error)}`,
          type: "system",
        },
      ]);
      setIsRunning(false);
    }
  };

  const isComplete = exitCode !== null;
  const isSuccess = isComplete && exitCode === 0;

  return (
    <div className="space-y-4">
      {/* Execution control and status */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-lg border border-border bg-surface-2">
        <button
          onClick={handleExecute}
          disabled={isRunning || isComplete}
          className="rounded bg-pink-primary px-4 py-2 text-white hover:bg-pink-soft disabled:bg-gray-400 disabled:cursor-not-allowed font-medium text-sm"
        >
          {isRunning ? "실행 중..." : isComplete ? "완료됨" : "승인 후 에이전트 실행"}
        </button>

        <div className="flex items-center gap-4">
          {!isRunning && actualBranchName && (
            <div className="text-xs text-gray-600">
              Branch: <code className="rounded bg-gray-100 px-2 py-0.5 font-mono">{actualBranchName}</code>
            </div>
          )}

          {isComplete && (
            <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${
              isSuccess
                ? 'bg-emerald-50 border border-emerald-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <span className={`text-sm font-semibold ${
                isSuccess ? 'text-emerald-700' : 'text-red-700'
              }`}>
                {isSuccess ? "✅ 성공" : "❌ 실패"}
              </span>
              <span className={`text-xs ${
                isSuccess ? 'text-emerald-600' : 'text-red-600'
              }`}>
                종료 코드: {exitCode}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Execution log */}
      <div className="space-y-2">
        <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
          실행 로그
        </span>
        <div className="rounded border border-gray-300 bg-black p-4 font-mono text-sm">
          <div className="max-h-96 overflow-y-auto space-y-0 whitespace-pre-wrap break-words">
            {logs.length === 0 && !isRunning && (
              <div className="text-gray-500">실행을 시작하려면 위의 버튼을 클릭하세요.</div>
            )}
            {logs.map((entry, i) => (
              <div
                key={i}
                className={`${
                  entry.type === "stderr"
                    ? "text-red-400"
                    : entry.type === "system"
                    ? "text-yellow-400"
                    : "text-green-400"
                }`}
              >
                {entry.log}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Status summary for completion */}
      {isComplete && (
        <div className={`rounded-lg border p-4 space-y-2 ${
          isSuccess
            ? 'border-emerald-200 bg-emerald-50'
            : 'border-red-200 bg-red-50'
        }`}>
          <p className={`text-sm font-semibold ${
            isSuccess ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {isSuccess ? "실행이 성공했습니다" : "실행이 실패했습니다"}
          </p>
          <p className={`text-xs ${
            isSuccess ? 'text-emerald-600' : 'text-red-600'
          }`}>
            {isSuccess
              ? "아래의 분석 결과를 확인하고 다음 단계를 진행하세요."
              : "위의 로그를 확인하여 오류를 파악하고 조치하세요."}
          </p>
        </div>
      )}
    </div>
  );
}
