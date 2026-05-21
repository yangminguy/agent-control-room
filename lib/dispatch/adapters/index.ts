import type { AgentResult, AgentType, DispatchJob } from "../../types";
import { ClaudeCodeCliAdapter } from "./claude-code-cli-adapter";
import { CodexCliAdapter } from "./codex-cli-adapter";
import { AntigravityCliAdapter } from "./antigravity-cli-adapter";

export type { AgentResult, DispatchJob };

export interface AgentAdapter {
  dispatch(job: DispatchJob): Promise<AgentResult>;
}

export function getAdapter(agentId: AgentType, mockMode?: boolean): AgentAdapter {
  switch (agentId) {
    case "claude-code":
      return new ClaudeCodeCliAdapter(mockMode);
    case "codex":
      return new CodexCliAdapter(mockMode);
    case "antigravity":
      return new AntigravityCliAdapter(mockMode);
    default: {
      const exhaustive: never = agentId;
      throw new Error(`Unknown agent: ${exhaustive}`);
    }
  }
}

export { ClaudeCodeCliAdapter, CodexCliAdapter, AntigravityCliAdapter };
