import React from 'react';
import { Check, X } from 'lucide-react';

interface AgentCapabilityListProps {
  bestFor: string[];
  notFor?: string[];
}

export function AgentCapabilityList({ bestFor, notFor }: AgentCapabilityListProps) {
  return (
    <div className="flex flex-col gap-2">
      {bestFor.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Best For</p>
          <ul className="flex flex-wrap gap-1.5">
            {bestFor.map((item, idx) => (
              <li key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-xs dark:bg-slate-800 dark:text-slate-300">
                <Check className="w-3 h-3 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {notFor && notFor.length > 0 && (
        <div className="space-y-1.5 mt-1">
          <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Warnings</p>
          <ul className="flex flex-wrap gap-1.5">
            {notFor.map((item, idx) => (
              <li key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-50 text-rose-700 text-xs dark:bg-rose-950/30 dark:text-rose-400">
                <X className="w-3 h-3 text-rose-500" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
