import React from 'react';
import Link from 'next/link';
import { AgentStatus } from './types';
import { AgentAvailabilityBadge } from './AgentAvailabilityBadge';
import { AgentCapabilityList } from './AgentCapabilityList';
import { Bot, User, Wrench, Terminal, Database, Sparkles, ArrowRight, FileText } from 'lucide-react';

interface AgentStatusCardProps {
  agent: AgentStatus;
}

const getAgentIcon = (type: string) => {
  switch (type) {
    case 'claude_code': return <Terminal className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
    case 'codex': return <Bot className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
    case 'antigravity': return <Sparkles className="w-5 h-5 text-amber-500 dark:text-amber-400" />;
    case 'hermes': return <Database className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />;
    case 'vibe_kanban': return <Wrench className="w-5 h-5 text-slate-600 dark:text-slate-400" />;
    case 'manual_user': return <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />;
    default: return <Bot className="w-5 h-5 text-slate-500" />;
  }
};

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const isBackground = agent.availability === 'background_worker';
  const isWorking = agent.availability === 'working';
  const isBlocked = agent.availability === 'blocked' || agent.availability === 'token_limited' || agent.availability === 'context_overloaded' || agent.availability === 'disconnected';
  const isApprovalRequired = agent.availability === 'approval_required';
  const isIdle = agent.availability === 'idle' || agent.availability === 'available' || agent.availability === 'cooling_down';

  let cardStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm';
  if (isBackground) cardStyle = 'border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 opacity-85';
  else if (isWorking) cardStyle = 'border-blue-300 dark:border-blue-700/50 bg-blue-50/20 dark:bg-blue-900/10 shadow-md ring-1 ring-blue-400/20';
  else if (isBlocked) cardStyle = 'border-red-300 dark:border-red-800/50 bg-red-50/20 dark:bg-red-900/10 shadow-sm ring-1 ring-red-400/20';
  else if (isApprovalRequired) cardStyle = 'border-amber-300 dark:border-amber-700/50 bg-amber-50/20 dark:bg-amber-900/10 shadow-sm ring-1 ring-amber-400/20';
  else if (isIdle) cardStyle = 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 opacity-95 grayscale-[15%] shadow-sm';
  
  return (
    <div className={`flex flex-col p-4 rounded-xl border transition-all duration-200 hover:shadow-md ${cardStyle}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isBackground ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'bg-slate-100 dark:bg-slate-900'}`}>
            {getAgentIcon(agent.type)}
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100 leading-tight">{agent.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{agent.role}</p>
          </div>
        </div>
        <AgentAvailabilityBadge status={agent.availability} />
      </div>

      {agent.currentTask && (
        <div className="mb-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Current Task</p>
          <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-2 leading-relaxed">{agent.currentTask}</p>
        </div>
      )}

      <div className="flex-1 mb-4">
        <AgentCapabilityList bestFor={agent.bestFor} notFor={agent.notFor} />
      </div>

      {agent.nextRecommendedAction && (
        <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-start gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/30 p-2.5 rounded-lg">
            <ArrowRight className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="leading-snug">{agent.nextRecommendedAction}</span>
          </div>

          {agent.type === 'hermes' && (
            <Link href="/hermes-packets" className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              <FileText className="w-3.5 h-3.5" />
              패킷 드래프트 보기
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
