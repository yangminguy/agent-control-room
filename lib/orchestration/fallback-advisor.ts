import { AdvisorInput, AdvisorResponse } from "../types";

export function getFallbackAdvisorResponse(input: AdvisorInput): AdvisorResponse {
  return {
    problemSummary: "Unable to process the request via AI. This is a fallback response.",
    likelyCauses: [
      "The OpenAI API key might be missing or invalid.",
      "The service might be temporarily unavailable.",
    ],
    options: [
      "Check your environment variables for OPENAI_API_KEY.",
      "Try again later.",
      "Proceed with manual troubleshooting."
    ],
    recommendation: "Check your OPENAI_API_KEY environment variable. If you don't have one, the orchestrator cannot perform dynamic technical analysis.",
    risks: [
      "Without the AI orchestrator, you will need to manually write prompts for the AI coding tools."
    ],
    nextPrompt: `# Task for Claude Code or Codex\n\n## Context\nFallback triggered for Advisor Mode.\n\n## User Question\n${input.question}\n\n## Action Required\nPlease analyze the above question and provide a structured technical response.`
  };
}
