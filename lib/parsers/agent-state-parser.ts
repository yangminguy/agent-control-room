import { promises as fs } from "fs";
import path from "path";
import { AgentType, AgentStatus, AgentStatusValue } from "../types";

export interface AgentStateData {
  currentGoal: string;
  activePhase: string;
  activeTask: string;
  currentAgent?: AgentType;
  recommendedNextAgent?: AgentType;
  reason: string;
  agentStatuses: AgentStatus[];
  blockers: string[];
  assumptions: string[];
  nextTask: string;
  nextPromptTarget?: AgentType;
  nextPrompt: string;
  lastUpdated: string;
}

export function parseAgentType(val: string): AgentType | undefined {
  const normalized = val.toLowerCase().trim();
  if (normalized === "claude code" || normalized === "claude-code") return "claude-code";
  if (normalized === "codex") return "codex";
  if (normalized === "antigravity") return "antigravity";
  return undefined;
}

export function parseAgentStatusValue(val: string): AgentStatusValue | undefined {
  const valid: AgentStatusValue[] = ["available", "limited", "cooling_down", "blocked", "manual_only"];
  const normalized = val.toLowerCase().trim() as AgentStatusValue;
  if (valid.includes(normalized)) return normalized;
  return undefined;
}

export async function parseAgentState(): Promise<AgentStateData> {
  const filePath = path.join(process.cwd(), "docs", "AGENT_STATE.md");
  let content = "";
  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch (e) {
    return createEmptyAgentState();
  }

  const lines = content.split('\n');
  const state = createEmptyAgentState();
  let currentSection = "";
  let sectionContent: string[] = [];

  const saveSection = () => {
    if (!currentSection) return;
    const text = sectionContent.join('\n').trim();
    if (currentSection === "current_goal") state.currentGoal = text;
    else if (currentSection === "active_phase") state.activePhase = text;
    else if (currentSection === "active_task") state.activeTask = text;
    else if (currentSection === "current_agent") state.currentAgent = parseAgentType(text);
    else if (currentSection === "recommended_next_agent") state.recommendedNextAgent = parseAgentType(text);
    else if (currentSection === "reason") state.reason = text;
    else if (currentSection === "agent_statuses") {
      const tableLines = sectionContent.filter(l => l.trim().startsWith('|'));
      if (tableLines.length > 2) {
        for (let i = 2; i < tableLines.length; i++) {
          const cols = tableLines[i].split('|').map(c => c.trim());
          if (cols.length >= 4) {
            const agent = parseAgentType(cols[1]);
            const status = parseAgentStatusValue(cols[2]);
            const reason = cols[3];
            if (agent && status) {
              state.agentStatuses.push({
                agent,
                status,
                reason
              });
            }
          }
        }
      }
    }
    else if (currentSection === "blockers") {
      state.blockers = sectionContent.filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());
    }
    else if (currentSection === "assumptions") {
      state.assumptions = sectionContent.filter(l => l.trim().startsWith('-')).map(l => l.replace(/^-\s*/, '').trim());
    }
    else if (currentSection === "next_task") state.nextTask = text;
    else if (currentSection === "next_prompt_target") state.nextPromptTarget = parseAgentType(text);
    else if (currentSection === "next_prompt") {
      const match = text.match(/```[a-z]*\n([\s\S]*?)```/);
      if (match) {
        state.nextPrompt = match[1].trim();
      } else {
        state.nextPrompt = text.replace(/```txt/g, '').replace(/```/g, '').trim();
      }
    }
    else if (currentSection === "last_updated") state.lastUpdated = text;
  };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      saveSection();
      currentSection = line.replace("## ", "").trim();
      sectionContent = [];
    } else {
      sectionContent.push(line);
    }
  }
  saveSection();

  return state;
}

function createEmptyAgentState(): AgentStateData {
  return {
    currentGoal: "",
    activePhase: "",
    activeTask: "",
    currentAgent: undefined,
    recommendedNextAgent: undefined,
    reason: "",
    agentStatuses: [],
    blockers: [],
    assumptions: [],
    nextTask: "",
    nextPromptTarget: undefined,
    nextPrompt: "",
    lastUpdated: ""
  };
}
