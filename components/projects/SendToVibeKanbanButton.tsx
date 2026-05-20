"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import type { Task, Project } from "@/lib/types";

export function SendToVibeKanbanButton({ project, task }: { project: Project; task: Task }) {
  const [isSending, setIsSending] = useState(false);

  const handleSend = async () => {
    setIsSending(true);
    try {
      const response = await fetch("/api/vibe-kanban/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectName: project.name,
          projectContext: project.description || "",
          direction: task.userIntent,
          task,
          assumptions: ["Assumed Next.js environment", "Assumed basic setup complete"], // Mock values for MVP
          risks: ["Integration tests pending"],
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(`성공적으로 Vibe Kanban에 이슈를 생성했습니다!\nIssue ID: ${data.issueId}`);
      } else {
        alert(`이슈 생성 실패: ${data.message}`);
      }
    } catch (error: any) {
      alert(`오류 발생: ${error.message}`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <button
      onClick={handleSend}
      disabled={isSending}
      className={`mt-2 flex items-center gap-1 text-xs px-3 py-1.5 rounded border transition-colors ${
        isSending
          ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
          : "bg-white text-purple-600 border-purple-200 hover:bg-purple-50"
      }`}
    >
      <Send className="w-3 h-3" />
      {isSending ? "전송 중..." : "Vibe Kanban 전송"}
    </button>
  );
}
