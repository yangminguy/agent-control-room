import { Bot, AlertCircle, CheckCircle, Clock } from "lucide-react";
import type { AgentStatus } from "@/lib/types";

export function AgentStatusCard({ status }: { status: AgentStatus }) {
  const getStatusIcon = () => {
    switch (status.status) {
      case "available": return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "cooling_down": return <Clock className="w-5 h-5 text-yellow-500" />;
      case "limited": return <AlertCircle className="w-5 h-5 text-orange-500" />;
      case "blocked": return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "manual_only": return <Bot className="w-5 h-5 text-gray-500" />;
      default: return <Bot className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case "available": return "border-green-200 bg-green-50";
      case "cooling_down": return "border-yellow-200 bg-yellow-50";
      case "limited": return "border-orange-200 bg-orange-50";
      case "blocked": return "border-red-200 bg-red-50";
      case "manual_only": return "border-gray-200 bg-gray-50";
      default: return "border-gray-200 bg-gray-50";
    }
  };

  return (
    <div className={`border rounded-lg p-4 flex flex-col justify-between ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 font-semibold capitalize text-gray-900">
          <Bot className="w-5 h-5" />
          {status.agent.replace("-", " ")}
        </div>
        {getStatusIcon()}
      </div>
      <div className="mt-2 text-sm text-gray-700 capitalize">
        Status: <span className="font-medium">{status.status.replace("_", " ")}</span>
      </div>
      {status.reason && (
        <div className="mt-1 text-xs text-gray-600 line-clamp-2">
          {status.reason}
        </div>
      )}
    </div>
  );
}
