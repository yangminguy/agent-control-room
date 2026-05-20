"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AgentType } from "@/lib/types";

interface RunnerLogViewProps {
  planId: string;
  taskId: string;
  prompt: string;
  agent: AgentType;
  projectPath: string;
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

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleExecute}
          disabled={isRunning || isComplete}
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isRunning ? "실행 중..." : "Execute"}
        </button>

        {!isRunning && (
          <div className="text-sm text-gray-600">
            Branch:{" "}
            <code className="rounded bg-gray-100 px-2 py-1">
              {actualBranchName || branchName}
            </code>
          </div>
        )}

        {isComplete && (
          <div className="flex items-center gap-2">
            <span className={`text-lg font-semibold ${exitCode === 0 ? "text-green-600" : "text-red-600"}`}>
              {exitCode === 0 ? "✅ Done" : "❌ Failed"}
            </span>
            <span className="text-sm text-gray-600">Exit code: {exitCode}</span>
          </div>
        )}
      </div>

      <div className="rounded border border-gray-300 bg-black p-4 font-mono text-sm text-green-400">
        <div className="max-h-96 overflow-y-auto space-y-0 whitespace-pre-wrap break-words">
          {logs.length === 0 && !isRunning && (
            <div className="text-gray-500">실행을 시작하려면 Execute 버튼을 클릭하세요.</div>
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
  );
}
