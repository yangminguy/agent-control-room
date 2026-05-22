"use client";

interface HandoffPackBuilderProps {
  projectName?: string;
}

export function HandoffPackBuilder({ projectName }: HandoffPackBuilderProps) {
  return (
    <div className="p-4 border border-dashed border-border rounded">
      <p className="text-sm text-text-secondary">HandoffPackBuilder component</p>
      {projectName && <p className="text-xs mt-2">Project: {projectName}</p>}
    </div>
  );
}
