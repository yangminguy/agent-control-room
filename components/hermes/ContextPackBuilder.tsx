"use client";

interface ContextPackBuilderProps {
  projectName?: string;
  currentPhase?: string;
  defaultContext?: { completedWork?: string[]; blockers?: string[] };
}

export function ContextPackBuilder({
  projectName,
  currentPhase,
  defaultContext,
}: ContextPackBuilderProps) {
  return (
    <div className="p-4 border border-dashed border-border rounded">
      <p className="text-sm text-text-secondary">ContextPackBuilder component</p>
      {projectName && <p className="text-xs mt-2">Project: {projectName}</p>}
      {currentPhase && <p className="text-xs">Phase: {currentPhase}</p>}
    </div>
  );
}
