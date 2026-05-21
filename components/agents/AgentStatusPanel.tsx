import React from 'react';
import { AgentStatus } from './types';
import { AgentStatusCard } from './AgentStatusCard';
import { Server, Activity, AlertTriangle, Cpu } from 'lucide-react';

interface AgentStatusPanelProps {
  agents: AgentStatus[];
}

export function AgentStatusPanel({ agents }: AgentStatusPanelProps) {
  const totalAgents = agents.length;
  const availableCount = agents.filter(a => ['available', 'idle', 'background_worker'].includes(a.availability)).length;
  const workingCount = agents.filter(a => a.availability === 'working').length;
  const blockedCount = agents.filter(a => ['blocked', 'token_limited', 'context_overloaded', 'disconnected'].includes(a.availability)).length;
  const approvalCount = agents.filter(a => a.availability === 'approval_required').length;

  return (
    <div className="w-full space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <Server className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Total Systems</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mt-1">{totalAgents}</p>
          </div>
        </div>
        
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Ready / Active</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mt-1">{availableCount + workingCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <Cpu className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Awaiting Approval</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mt-1">{approvalCount}</p>
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium uppercase tracking-wider">Blocked / Limited</p>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100 leading-none mt-1">{blockedCount}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {agents.map((agent) => (
          <AgentStatusCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
