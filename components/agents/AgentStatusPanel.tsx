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
    <div className="w-full space-y-6 animate-fade-in">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Systems */}
        <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-4">
          <div className="p-3 bg-surface-2 rounded-lg border border-border/55">
            <Server className="w-5 h-5 text-text-secondary" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Total Systems</p>
            <p className="text-xl font-bold text-text-primary leading-none mt-1">{totalAgents}</p>
          </div>
        </div>
        
        {/* Ready / Active */}
        <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
            <Activity className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Ready / Active</p>
            <p className="text-xl font-bold text-text-primary leading-none mt-1">{availableCount + workingCount}</p>
          </div>
        </div>

        {/* Awaiting Approval */}
        <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
            <Cpu className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Awaiting Approval</p>
            <p className="text-xl font-bold text-text-primary leading-none mt-1">{approvalCount}</p>
          </div>
        </div>

        {/* Blocked / Limited */}
        <div className="p-4 rounded-xl border border-border bg-surface flex items-center gap-4">
          <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Blocked / Limited</p>
            <p className="text-xl font-bold text-text-primary leading-none mt-1">{blockedCount}</p>
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

