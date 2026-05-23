"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { AgentStatus } from './types';
import { AgentAvailabilityBadge } from './AgentAvailabilityBadge';
import { AgentCapabilityList } from './AgentCapabilityList';
import { Bot, User, Wrench, Terminal, Database, Sparkles, ArrowRight, FileText, ChevronDown, ChevronUp, AlertOctagon } from 'lucide-react';

interface AgentStatusCardProps {
  agent: AgentStatus;
}

const getAgentIcon = (type: string) => {
  switch (type) {
    case 'claude_code': return <Terminal className="w-5 h-5 text-pink-primary" />;
    case 'codex': return <Bot className="w-5 h-5 text-blue-400" />;
    case 'antigravity': return <Sparkles className="w-5 h-5 text-amber-400" />;
    case 'hermes': return <Database className="w-5 h-5 text-indigo-400" />;
    case 'vibe_kanban': return <Wrench className="w-5 h-5 text-slate-400" />;
    case 'manual_user': return <User className="w-5 h-5 text-emerald-400" />;
    default: return <Bot className="w-5 h-5 text-slate-400" />;
  }
};

export function AgentStatusCard({ agent }: AgentStatusCardProps) {
  const [showCapabilities, setShowCapabilities] = useState(false);

  const isBackground = agent.availability === 'background_worker';
  const isWorking = agent.availability === 'working';
  const isBlocked = ['blocked', 'token_limited', 'context_overloaded', 'disconnected'].includes(agent.availability);
  const isApprovalRequired = agent.availability === 'approval_required';
  const isIdle = ['idle', 'available', 'cooling_down'].includes(agent.availability);

  // Set card boundary glows using globals.css animation utility classes
  let cardStyle = 'border-border bg-surface';
  if (isBackground) cardStyle = 'border-indigo-500/20 bg-surface animate-breathing-indigo';
  else if (isWorking) cardStyle = 'border-blue-500/20 bg-surface animate-breathing-blue';
  else if (isBlocked) cardStyle = 'border-red-500/20 bg-surface animate-breathing-red';
  else if (isApprovalRequired) cardStyle = 'border-amber-500/20 bg-surface animate-breathing-amber';
  else if (isIdle) cardStyle = 'border-border bg-surface/80 opacity-90';

  // Infer Risk Level
  let riskLevel = "Safe";
  let riskColor = "text-emerald-400";
  if (isBlocked) {
    riskLevel = "Critical Blocker";
    riskColor = "text-red-400 font-bold";
  } else if (isApprovalRequired) {
    riskLevel = "Action/Approval Required";
    riskColor = "text-amber-400 font-semibold";
  } else if (agent.availability === 'cooling_down') {
    riskLevel = "Moderate Risk";
    riskColor = "text-yellow-400";
  }

  return (
    <div className={`flex flex-col p-5 rounded-xl border transition-all duration-300 hover:border-pink-primary/30 hover:-translate-y-0.5 hover:shadow-lg ${cardStyle}`}>
      {/* 1. Current Status Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-surface-2 border border-border`}>
            {getAgentIcon(agent.type)}
          </div>
          <div>
            <h3 className="font-semibold text-text-primary leading-tight">{agent.name}</h3>
            <p className="text-xs text-text-secondary mt-0.5">{agent.role}</p>
          </div>
        </div>
        <AgentAvailabilityBadge status={agent.availability} />
      </div>

      {/* 2. Current Mission (Task) */}
      <div className="mb-4 flex-1">
        <div className="p-3 rounded-lg bg-surface-2/60 border border-border/80">
          <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider mb-1">Current Mission</p>
          {agent.currentTask ? (
            <p className="text-xs text-text-primary leading-relaxed line-clamp-2">{agent.currentTask}</p>
          ) : (
            <p className="text-xs text-text-secondary/50 italic leading-relaxed">No active mission</p>
          )}
        </div>
      </div>

      {/* 3. Risk Level / Approval Needed */}
      <div className="mb-4 flex items-center gap-2 text-xs bg-surface-2/40 border border-border/40 p-2.5 rounded-lg">
        <AlertOctagon className={`w-4 h-4 shrink-0 ${riskColor}`} />
        <span className="text-text-secondary">Risk Status:</span>
        <span className={`font-medium ${riskColor}`}>{riskLevel}</span>
      </div>

      {/* 4. Next Recommended Action */}
      {agent.nextRecommendedAction && (
        <div className="mb-4">
          <div className="flex items-start gap-2.5 text-xs text-pink-primary font-medium bg-pink-primary/5 p-2.5 rounded-lg border border-pink-primary/10">
            <ArrowRight className="w-3.5 h-3.5 mt-0.5 shrink-0 animate-status-ping" />
            <span className="leading-snug">Next Action: {agent.nextRecommendedAction}</span>
          </div>
        </div>
      )}

      {/* Additional Actions (Handoffs, Prompts) */}
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 text-xs">
        {agent.type === 'hermes' && (
          <Link href="/hermes-packets" className="inline-flex items-center gap-1.5 font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
            <FileText className="w-3.5 h-3.5" />
            패킷 드래프트 보기
          </Link>
        )}

        <Link href="/prompt-compiler" className="inline-flex items-center gap-1.5 font-medium text-pink-primary hover:text-pink-soft transition-colors">
          <Sparkles className="w-3.5 h-3.5" />
          프롬프트 컴파일러 이동
        </Link>
      </div>

      {/* 5. Capability Explanation (Collapsible Bottom) */}
      <div className="border-t border-border/50 pt-3 mt-auto">
        <button
          type="button"
          onClick={() => setShowCapabilities(!showCapabilities)}
          className="w-full flex items-center justify-between text-xs text-text-secondary hover:text-text-primary transition-colors"
        >
          <span>Capabilities & Limits</span>
          {showCapabilities ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showCapabilities && (
          <div className="mt-2.5 space-y-2 text-xs text-text-secondary animate-fade-in bg-surface-2/40 p-2.5 rounded-lg border border-border/40">
            <AgentCapabilityList bestFor={agent.bestFor} notFor={agent.notFor} />
          </div>
        )}
      </div>
    </div>
  );
}
