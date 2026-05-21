/**
 * T-AUTO-011: Token/Context Limit Auto-Management
 *
 * Tests for context budget tracking, token limit detection,
 * fallback agent recommendation, and context pack generation.
 */

import {
  ContextBudgetTracker,
  getContextBudgetTracker,
  resetContextBudgetTracker,
} from "@/lib/dispatch/context-budget-tracker";
import {
  recommendFallbackAgent,
  getFallbackChain,
} from "@/lib/agents/agent-fallback-selector";
import { generateContextPackMarkdown } from "@/lib/orchestration/context-pack-generator";
import { generateObsidianNote } from "@/lib/memory/obsidian-note-generator";
import type { AgentType } from "@/lib/types";

describe("T-AUTO-011: Context Budget Tracking", () => {
  beforeEach(() => {
    resetContextBudgetTracker();
  });

  describe("ContextBudgetTracker", () => {
    it("should initialize with empty budget", () => {
      const tracker = new ContextBudgetTracker();
      expect(tracker.getAll()).toHaveLength(0);
    });

    it("should track prompt + output chars and estimate tokens", () => {
      const tracker = new ContextBudgetTracker();
      const budget = tracker.track("claude-code", 4000, 2000);

      expect(budget.agentId).toBe("claude-code");
      expect(budget.promptChars).toBe(4000);
      expect(budget.outputChars).toBe(2000);
      expect(budget.jobCount).toBe(1);
      expect(budget.estimatedTokens).toBe(1500); // (4000 + 2000) / 4
    });

    it("should accumulate across multiple jobs", () => {
      const tracker = new ContextBudgetTracker();

      tracker.track("claude-code", 4000, 2000); // Job 1: 1500 tokens
      const budget2 = tracker.track("claude-code", 4000, 2000); // Job 2: +1500 tokens

      expect(budget2.jobCount).toBe(2);
      expect(budget2.estimatedTokens).toBe(3000); // 1500 + 1500
    });

    it("should track multiple agents independently", () => {
      const tracker = new ContextBudgetTracker();

      tracker.track("claude-code", 4000, 2000);
      tracker.track("codex", 2000, 1000);

      const claude = tracker.get("claude-code");
      const codex = tracker.get("codex");

      expect(claude?.estimatedTokens).toBe(1500);
      expect(codex?.estimatedTokens).toBe(750);
    });

    it("should detect 80% threshold for claude-code", () => {
      const tracker = new ContextBudgetTracker();

      // claude-code threshold: 150000 tokens
      // 80% of 150000 = 120000 tokens
      // Need to accumulate ~480000 chars (120000 * 4)

      tracker.track("claude-code", 240000, 240000); // 120000 tokens (80%)

      expect(tracker.isApproachingLimit("claude-code")).toBe(true);
      expect(tracker.getPercentageUsed("claude-code")).toBe(80);
    });

    it("should not flag as approaching before 80%", () => {
      const tracker = new ContextBudgetTracker();

      // 79% of 150000
      tracker.track("claude-code", 158000, 79000);

      const percentage = tracker.getPercentageUsed("claude-code");
      expect(percentage).toBeLessThan(80);
      expect(tracker.isApproachingLimit("claude-code")).toBe(false);
    });

    it("should detect 80% threshold for codex", () => {
      const tracker = new ContextBudgetTracker();

      // codex threshold: 100000 tokens
      // 80% = 80000 tokens
      tracker.track("codex", 160000, 160000); // 80000 tokens (80%)

      expect(tracker.isApproachingLimit("codex")).toBe(true);
    });

    it("should handle zero budget", () => {
      const tracker = new ContextBudgetTracker();
      expect(tracker.isApproachingLimit("claude-code")).toBe(false);
      expect(tracker.getPercentageUsed("claude-code")).toBe(0);
    });

    it("should return threshold for agent", () => {
      const tracker = new ContextBudgetTracker();
      expect(tracker.getThreshold("claude-code")).toBe(150000);
      expect(tracker.getThreshold("codex")).toBe(100000);
      expect(tracker.getThreshold("antigravity")).toBe(50000);
    });

    it("should clear single agent budget", () => {
      const tracker = new ContextBudgetTracker();
      tracker.track("claude-code", 4000, 2000);
      tracker.track("codex", 2000, 1000);

      tracker.clearAgent("claude-code");

      expect(tracker.get("claude-code")).toBeUndefined();
      expect(tracker.get("codex")).toBeDefined();
    });

    it("should clear all budgets", () => {
      const tracker = new ContextBudgetTracker();
      tracker.track("claude-code", 4000, 2000);
      tracker.track("codex", 2000, 1000);

      tracker.clear();

      expect(tracker.getAll()).toHaveLength(0);
    });
  });

  describe("Global ContextBudgetTracker", () => {
    it("should return same singleton instance", () => {
      const tracker1 = getContextBudgetTracker();
      const tracker2 = getContextBudgetTracker();

      expect(tracker1).toBe(tracker2);
    });

    it("should reset global tracker", () => {
      const tracker1 = getContextBudgetTracker();
      tracker1.track("claude-code", 4000, 2000);

      resetContextBudgetTracker();

      const tracker2 = getContextBudgetTracker();
      expect(tracker2.getAll()).toHaveLength(0);
      expect(tracker1).not.toBe(tracker2);
    });
  });

  describe("Agent Fallback Selector", () => {
    it("should recommend fallback for claude-code → codex", () => {
      const fallback = recommendFallbackAgent("claude-code");
      expect(fallback).toBe("codex");
    });

    it("should recommend fallback for codex → claude-code", () => {
      const fallback = recommendFallbackAgent("codex");
      expect(fallback).toBe("claude-code");
    });

    it("should recommend fallback for antigravity → claude-code", () => {
      const fallback = recommendFallbackAgent("antigravity");
      expect(fallback).toBe("claude-code");
    });

    it("should return null for unknown agent", () => {
      const fallback = recommendFallbackAgent("unknown-agent" as AgentType);
      expect(fallback).toBeNull();
    });

    it("should generate fallback chain for claude-code", () => {
      const chain = getFallbackChain("claude-code");

      // claude-code -> codex -> claude-code (cycles up to 3 levels)
      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0]).toBe("codex");
      expect(chain).toContain("codex");
    });

    it("should generate fallback chain for antigravity", () => {
      const chain = getFallbackChain("antigravity");

      // antigravity -> claude-code -> codex
      expect(chain.length).toBeGreaterThan(0);
      expect(chain[0]).toBe("claude-code");
    });
  });

  describe("Context Pack Generation with Token Limit Status", () => {
    it("should generate context pack without token limit status", () => {
      const markdown = generateContextPackMarkdown({
        projectName: "Test Project",
        currentPhase: "Phase 1",
        completedWork: ["Task 1"],
        changedFiles: ["file.ts"],
        importantDecisions: ["Use TypeScript"],
        blockers: [],
        nextTask: "Implement feature",
        acceptanceCriteria: ["Should work"],
      });

      expect(markdown).toContain("# Context Pack — Test Project");
      expect(markdown).not.toContain("Context Limit Status");
    });

    it("should generate context pack with token limit status", () => {
      const markdown = generateContextPackMarkdown({
        projectName: "Test Project",
        currentPhase: "Phase 1",
        completedWork: ["Task 1"],
        changedFiles: ["file.ts"],
        importantDecisions: ["Use TypeScript"],
        blockers: [],
        nextTask: "Implement feature",
        acceptanceCriteria: ["Should work"],
        contextLimitStatus: {
          tokensUsed: 120000,
          tokenLimit: 150000,
          percentage: 80,
          recommendedFallbackAgent: "codex",
        },
      });

      expect(markdown).toContain("## Context Limit Status");
      expect(markdown).toContain("120000 / 150000 (80%)");
      expect(markdown).toContain("⚠️ Context limit is approaching");
      expect(markdown).toContain("codex");
    });
  });

  describe("Obsidian Note Generation for Context Limit", () => {
    it("should generate context-limit-event note", () => {
      const note = generateObsidianNote("context-limit-event", {
        agentId: "claude-code",
        tokensUsed: 120000,
        tokenLimit: 150000,
        percentage: 80,
        completedJobs: 5,
        contextPackId: "pack-001",
        recommendations: [
          "Switch to fallback agent",
          "Save context pack",
        ],
      });

      expect(note).toContain("# Context Limit Event: claude-code");
      expect(note).toContain("120000 / 150000 (80%)");
      expect(note).toContain("**Jobs Completed:**");
      expect(note).toContain("pack-001");
      expect(note).toContain("## Recommendations");
      expect(note).toContain("Switch to fallback agent");
    });

    it("should handle context-limit-event without optional fields", () => {
      const note = generateObsidianNote("context-limit-event", {
        agentId: "codex",
        tokensUsed: 80000,
        tokenLimit: 100000,
      });

      expect(note).toContain("# Context Limit Event: codex");
      expect(note).toContain("80000 / 100000 (80%)");
    });
  });

  describe("Integration: Token Limit Detection → Context Pack → Obsidian", () => {
    it("should detect limit, generate pack, and create note", () => {
      const tracker = new ContextBudgetTracker();

      // Simulate reaching 80% context limit
      tracker.track("claude-code", 240000, 240000); // 120000 tokens

      expect(tracker.isApproachingLimit("claude-code")).toBe(true);

      const budget = tracker.get("claude-code");
      const fallback = recommendFallbackAgent("claude-code");

      // Generate context pack
      const contextPack = generateContextPackMarkdown({
        projectName: "My Project",
        currentPhase: "Phase 5",
        completedWork: ["Implemented auth", "Added tests"],
        changedFiles: ["auth.ts", "test.ts"],
        importantDecisions: ["Use JWT"],
        blockers: [],
        nextTask: "Implement dashboard",
        acceptanceCriteria: ["All tests pass"],
        contextLimitStatus: {
          tokensUsed: budget!.estimatedTokens,
          tokenLimit: 150000,
          percentage: tracker.getPercentageUsed("claude-code"),
          recommendedFallbackAgent: fallback ?? undefined,
        },
      });

      expect(contextPack).toContain("Context Limit Status");
      expect(contextPack).toContain("120000 / 150000");
      expect(contextPack).toContain("codex");

      // Generate Obsidian note
      const obsidianNote = generateObsidianNote("context-limit-event", {
        agentId: "claude-code",
        tokensUsed: budget!.estimatedTokens,
        tokenLimit: 150000,
        percentage: 80,
        completedJobs: 1,
        recommendations: [
          `Switch to ${fallback}`,
          "Save context pack and resume in new session",
        ],
      });

      expect(obsidianNote).toContain("Context Limit Event: claude-code");
      expect(obsidianNote).toContain("Switch to codex");
    });
  });
});
