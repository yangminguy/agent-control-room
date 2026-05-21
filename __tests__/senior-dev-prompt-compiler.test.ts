import { compileSeniorDevPrompt, getAgentRole, canAgentExecuteCode, isSafeToRunInParallel } from "@/lib/prompts/senior-dev-prompt-compiler";
import type { PromptCompilerInput } from "@/lib/prompts/senior-dev-compiler.types";

describe("Senior Dev Prompt Compiler", () => {
  describe("compileSeniorDevPrompt", () => {
    it("should generate a copy-ready markdown prompt with all required sections", async () => {
      const input: PromptCompilerInput = {
        projectName: "Agent Control Room",
        projectContext: "AI Development Control Tower for non-developer PMs",
        userRequest: "Add a new UI component for roadmap visualization",
        taskTitle: "Implement RoadmapVisualization component",
        acceptanceCriteria: [
          "Component displays roadmap stages",
          "Stages show completion percentage",
          "UI is responsive",
        ],
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.generatedPromptMarkdown).toContain("# Implement RoadmapVisualization component");
      expect(result.generatedPromptMarkdown).toContain("## Context");
      expect(result.generatedPromptMarkdown).toContain("## Goal");
      expect(result.generatedPromptMarkdown).toContain("## Scope");
      expect(result.generatedPromptMarkdown).toContain("## Allowed Files to Edit");
      expect(result.generatedPromptMarkdown).toContain("## Do Not Touch");
      expect(result.generatedPromptMarkdown).toContain("## Required Work");
      expect(result.generatedPromptMarkdown).toContain("## Do Not Do");
      expect(result.generatedPromptMarkdown).toContain("## Acceptance Criteria");
      expect(result.generatedPromptMarkdown).toContain("## Validation");
      expect(result.generatedPromptMarkdown).toContain("## Final Handoff Output");
    });

    it("should route UI work to Antigravity", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Implement a responsive UI component for the dashboard with visual polish",
        taskTitle: "UI Component",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.targetAgent).toBe("antigravity");
      expect(result.generatedPromptMarkdown).toContain("Antigravity");
    });

    it("should route isolated implementation to Codex", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Write tests for the storage layer and fix type errors",
        taskTitle: "Tests and Type Fixes",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.targetAgent).toBe("codex");
    });

    it("should route architecture/integration work to Claude Code", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Redesign the architecture to integrate Supabase with the existing JSON storage layer",
        taskTitle: "Architecture Integration",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.targetAgent).toBe("claude-code");
    });

    it("should route summary/context work to Hermes", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Generate a session summary and context pack for handoff",
        taskTitle: "Session Summary",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.targetAgent).toBe("hermes");
    });

    it("should detect high-risk deployment work", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Deploy the application to production",
        taskTitle: "Deploy to Production",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.riskLevel).toBe("high");
      expect(result.highRiskActions).toContain("deployment");
      expect(result.userApprovalRequired).toBe(true);
      expect(result.generatedPromptMarkdown).toContain("⚠️ User Approval Required");
    });

    it("should detect high-risk database migration work", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Migrate the database schema to support new features",
        taskTitle: "DB Migration",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.riskLevel).toBe("high");
      expect(result.highRiskActions).toContain("db-migration");
      expect(result.userApprovalRequired).toBe(true);
    });

    it("should detect high-risk security changes", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Update authentication and add new security encryption",
        taskTitle: "Security Update",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.riskLevel).toBe("high");
      expect(result.highRiskActions).toContain("auth-security");
      expect(result.userApprovalRequired).toBe(true);
    });

    it("should detect Hermes autonomous execution restrictions", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Auto-execute Hermes background worker for monitoring",
        taskTitle: "Hermes Auto Execution",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.riskLevel).toBe("high");
      expect(result.highRiskActions).toContain("hermes-autonomous");
      expect(result.userApprovalRequired).toBe(true);
    });

    it("should respect Codex token-limited status by offering fallback", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Fix type errors in the codebase",
        taskTitle: "Type Fixes",
      };

      const result = await compileSeniorDevPrompt(input);

      // The result should suggest Codex but indicate token limitation awareness
      expect(result.targetAgent).toBe("codex");
      // In a full implementation, this would include handoff info about token limits
    });

    it("should mark high-risk work as unsafe for parallel execution", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Deploy to production while adding new packages",
        taskTitle: "Deploy and Add Packages",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(isSafeToRunInParallel(result)).toBe(false);
      expect(result.parallelSafety).toBe("unsafe");
      expect(result.conflictRisk).toBe("high");
    });

    it("should mark UI work as safe for parallel execution", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Polish the UI and make it responsive",
        taskTitle: "UI Polish",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(isSafeToRunInParallel(result)).toBe(true);
      expect(result.parallelSafety).toBe("safe");
      expect(result.conflictRisk).toBe("low");
    });

    it("should never recommend Hermes for primary coding", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Implement the new authentication system",
        taskTitle: "Auth Implementation",
      };

      const result = await compileSeniorDevPrompt(input);

      // Hermes should never be the primary recommendation for coding work
      expect(result.targetAgent).not.toBe("hermes");
    });

    it("should include do-not-do rules in generated prompt", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Add a new feature to the system",
        taskTitle: "New Feature",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.doNotDoRules).toContain("Do not execute agents automatically");
      expect(result.doNotDoRules).toContain("Do not add runner/spawn-runner changes");
      expect(result.doNotDoRules).toContain("Do not change database schema");
      expect(result.doNotDoRules).toContain("Do not deploy or push to git");
    });

    it("should not recommend manual/user approval for low-risk work", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test Project",
        projectContext: "Test context",
        userRequest: "Add a simple utility function",
        taskTitle: "Utility Function",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(result.riskLevel).toBe("low");
      expect(result.userApprovalRequired).toBe(false);
    });
  });

  describe("getAgentRole", () => {
    it("should return correct role for Claude Code", () => {
      const role = getAgentRole("claude-code");

      expect(role).toBeDefined();
      expect(role?.name).toBe("Claude Code");
      expect(role?.isExecutionAgent).toBe(true);
      expect(role?.isBackgroundWorker).toBe(false);
      expect(role?.bestFor).toContain("architecture decisions");
    });

    it("should return correct role for Hermes as background worker only", () => {
      const role = getAgentRole("hermes");

      expect(role).toBeDefined();
      expect(role?.name).toBe("Hermes");
      expect(role?.isExecutionAgent).toBe(false);
      expect(role?.isBackgroundWorker).toBe(true);
      expect(role?.bestFor).toContain("background monitoring");
      expect(role?.bestFor).not.toContain("primary coding");
    });

    it("should return correct role for Antigravity", () => {
      const role = getAgentRole("antigravity");

      expect(role).toBeDefined();
      expect(role?.name).toBe("Antigravity");
      expect(role?.isExecutionAgent).toBe(true);
      expect(role?.bestFor).toContain("UI polish");
    });

    it("should return undefined for unknown agent", () => {
      const role = getAgentRole("unknown-agent");

      expect(role).toBeUndefined();
    });
  });

  describe("canAgentExecuteCode", () => {
    it("should return true for execution agents", () => {
      expect(canAgentExecuteCode("claude-code")).toBe(true);
      expect(canAgentExecuteCode("codex")).toBe(true);
      expect(canAgentExecuteCode("antigravity")).toBe(true);
    });

    it("should return false for background workers and approval gates", () => {
      expect(canAgentExecuteCode("hermes")).toBe(false);
      expect(canAgentExecuteCode("manual")).toBe(false);
      expect(canAgentExecuteCode("vibe-kanban")).toBe(false);
    });

    it("should return false for unknown agents", () => {
      expect(canAgentExecuteCode("unknown-agent")).toBe(false);
    });
  });

  describe("isSafeToRunInParallel", () => {
    it("should return true for low-risk UI work", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test",
        projectContext: "Test",
        userRequest: "Add UI polish",
        taskTitle: "UI",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(isSafeToRunInParallel(result)).toBe(true);
    });

    it("should return false for high-risk work", async () => {
      const input: PromptCompilerInput = {
        projectName: "Test",
        projectContext: "Test",
        userRequest: "Deploy to production",
        taskTitle: "Deploy",
      };

      const result = await compileSeniorDevPrompt(input);

      expect(isSafeToRunInParallel(result)).toBe(false);
    });
  });
});
