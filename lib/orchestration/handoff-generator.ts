import type { AgentType, Handoff } from "@/lib/types";

export function generateStatusChangeHandoff(options: {
  fromAgent: AgentType;
  toAgent: AgentType;
  reason: string;
  currentTask?: string;
}): Omit<Handoff, "id" | "createdAt"> {
  return {
    projectId: "project-agent-control-room",
    taskId: "auto-status-change",
    fromAgent: options.fromAgent,
    toAgent: options.toAgent,
    reason: options.reason,
    completedWork: options.currentTask ? [options.currentTask] : [],
    remainingWork: ["이전 작업 이어서 진행", "현재 컨텍스트 파악 후 시작"],
    changedFiles: [],
    forbiddenFiles: [],
    nextPrompt: `이전 에이전트(${options.fromAgent})가 ${options.reason}으로 인해 상태 변경됨. ${options.toAgent}가 이어서 진행해라.`,
  };
}

export function generateHandoffMarkdown(handoff: Handoff): string {
  return `# Agent Handoff Document

**From:** ${handoff.fromAgent}
**To:** ${handoff.toAgent}
**Reason for Handoff:** ${handoff.reason}

## 1. Completed Work
${handoff.completedWork.map(w => `- ${w}`).join("\n")}

## 2. Changed Files
${handoff.changedFiles.map(f => `- \`${f}\``).join("\n")}

## 3. Remaining Work
${handoff.remainingWork.map(w => `- ${w}`).join("\n")}

## 4. Forbidden Files (Do NOT modify)
${handoff.forbiddenFiles.length > 0 
  ? handoff.forbiddenFiles.map(f => `- \`${f}\``).join("\n")
  : "- None specified."}

## 5. Next Prompt for ${handoff.toAgent}
\`\`\`text
${handoff.nextPrompt}
\`\`\`
`;
}
