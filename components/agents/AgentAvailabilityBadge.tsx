import React from 'react';
import { AgentAvailability } from './types';
import { CheckCircle, Clock, Loader2, XCircle, ShieldAlert, ZapOff, Activity, AlertCircle, PowerOff } from 'lucide-react';

interface AgentAvailabilityBadgeProps {
  status: AgentAvailability;
  className?: string;
}

const statusConfig: Record<AgentAvailability, { label: string; colorClass: string; Icon: React.ElementType }> = {
  available: { label: '사용 가능', colorClass: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800', Icon: CheckCircle },
  working: { label: '작업 중', colorClass: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800', Icon: Loader2 },
  idle: { label: '대기 중', colorClass: 'bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700', Icon: Clock },
  cooling_down: { label: '쿨다운', colorClass: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800', Icon: Activity },
  token_limited: { label: '토큰 제한', colorClass: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800', Icon: ZapOff },
  context_overloaded: { label: '컨텍스트 과부하', colorClass: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:border-rose-800', Icon: AlertCircle },
  blocked: { label: '막힘', colorClass: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800', Icon: XCircle },
  background_worker: { label: '백그라운드', colorClass: 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800', Icon: Loader2 },
  approval_required: { label: '승인 필요', colorClass: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800', Icon: ShieldAlert },
  disconnected: { label: '연결 안 됨', colorClass: 'bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:border-gray-700', Icon: PowerOff },
};

export function AgentAvailabilityBadge({ status, className = '' }: AgentAvailabilityBadgeProps) {
  const config = statusConfig[status];
  if (!config) return null;
  const { label, colorClass, Icon } = config;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorClass} ${className}`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'working' || status === 'background_worker' ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}
