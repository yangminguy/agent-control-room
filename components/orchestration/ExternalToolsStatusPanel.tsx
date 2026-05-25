"use client";

import { useOrchestration } from "@/lib/dispatch/orchestration-context";

type ToolStatus = "실제" | "승인 필요" | "미활성" | "미구현" | "백로그";

interface ExternalTool {
  id: string;
  name: string;
  description: string;
  status: ToolStatus;
  isMock: boolean;
}

export function ExternalToolsStatusPanel() {
  const { isDemoMode } = useOrchestration();

  const tools: ExternalTool[] = [
    {
      id: "discord",
      name: "Discord Webhook",
      description: "에이전트 진행 상황 및 승인 요청 알림",
      status: "백로그",
      isMock: true,
    },
    {
      id: "telegram",
      name: "Telegram Bot",
      description: "승인 봇, 모바일 워크플로우 연동",
      status: "백로그",
      isMock: true,
    },
    {
      id: "obsidian",
      name: "Obsidian Sync",
      description: "로컬 마크다운 파일시스템 백업 및 메모리 동기화",
      status: "백로그",
      isMock: true,
    },
    {
      id: "supabase",
      name: "Supabase",
      description: "Durable storage 및 리얼타임 데이터베이스",
      status: "백로그",
      isMock: true,
    },
    {
      id: "github-pr",
      name: "GitHub PR",
      description: "PR 생성, 리뷰 요청, 병합 자동화",
      status: "백로그",
      isMock: true,
    },
    {
      id: "deploy",
      name: "Production Deploy",
      description: "프로덕션 배포 및 롤백 자동화",
      status: "미구현",
      isMock: true,
    }
  ];

  const getStatusColor = (status: ToolStatus) => {
    switch (status) {
      case "실제":
        return "bg-green-100 text-green-800 border-green-200";
      case "승인 필요":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "미활성":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "미구현":
        return "bg-red-100 text-red-800 border-red-200";
      case "백로그":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold text-gray-800">외부 툴 연동 상태</h3>
          <p className="text-xs text-gray-500 mt-1">외부 툴 연동 상태를 확인합니다.</p>
        </div>
        {isDemoMode && (
          <span className="px-2 py-1 bg-yellow-400 text-yellow-900 text-[10px] font-bold rounded uppercase">
            개발자용 데모 모드
          </span>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {tools.map((tool) => (
          <div key={tool.id} className="border border-gray-200 rounded p-3 bg-white flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-start mb-1">
                <span className="font-medium text-sm text-gray-900">{tool.name}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusColor(tool.status)} font-semibold`}>
                  [{tool.status}]
                </span>
              </div>
              <p className="text-xs text-gray-500">{tool.description}</p>
            </div>
            {tool.isMock && (
              <div className="mt-3 text-[10px] text-gray-400 bg-gray-50 p-1.5 rounded text-center border border-dashed border-gray-200">
                샘플 표시: UI 상태 안내용이며 실제 연결이 아닙니다
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
