"use client";

import type { ReactNode } from "react";

interface PackTabsProps {
  contextPackSlot?: ReactNode;
  handoffPackSlot?: ReactNode;
}

export function PackTabs({ contextPackSlot, handoffPackSlot }: PackTabsProps) {
  return (
    <div className="p-4 border border-dashed border-border rounded">
      <div className="space-y-4">
        {contextPackSlot && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Context Pack</h3>
            {contextPackSlot}
          </div>
        )}
        {handoffPackSlot && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Handoff Pack</h3>
            {handoffPackSlot}
          </div>
        )}
      </div>
    </div>
  );
}
