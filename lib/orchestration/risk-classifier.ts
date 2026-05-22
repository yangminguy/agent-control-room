/**
 * Risk Classification Engine for Hermes
 * Classifies tasks by risk level (Low/Medium/High)
 * Hermes document section 12 implementation
 */

import { DispatchJob, RiskLevel, RiskClassificationResult, AgentType } from "@/lib/types";

export class RiskClassifier {
  private fileOwners: Map<string, Set<AgentType>> = new Map();
  private highRiskPatterns = [
    // Git operations
    /git\s+(push|merge|rebase|reset|clean|force)/i,
    // Database operations
    /(prisma|supabase|psql|mysql).*(migrate|push)/i,
    // Deployment operations
    /(vercel|heroku|fly|aws|gcp|azure).*(prod|production|deploy|release)/i,
    /(docker|podman).*(push|deploy)/i,
    // Package management
    /(npm|yarn|pnpm)\s+(add|remove|install)\s+/i,
  ];

  private mediumRiskPatterns = [
    // Local git operations
    /git\s+(add|commit|stash|tag)/i,
    // Local build operations
    /(pnpm|npm|yarn)\s+(build|lint|typecheck)/i,
    // Preview deployment
    /vercel\s+deploy/i,
    // Test operations
    /(pnpm|npm|yarn)\s+test/i,
  ];

  private lowRiskPatterns = [
    // Read-only operations
    /git\s+(status|diff|log|branch|show|blame)/i,
    /(ls|cat|grep|find|head|tail)/i,
  ];

  /**
   * Classify a dispatch job by risk level
   */
  classifyJob(job: DispatchJob): RiskClassificationResult {
    const riskLevel = this._classifyRiskLevel(job.prompt || "");
    const conflictRisk = this._detectConflictRisk(job);

    const requiresTelegramApproval = ["high", "critical"].includes(riskLevel);
    const requiresUserApproval = riskLevel === "high" || conflictRisk === "high";

    return {
      task_id: job.taskId,
      risk_level: riskLevel as RiskLevel,
      classification_reason: this._getClassificationReason(riskLevel),
      conflict_risk: conflictRisk,
      conflicting_files: this._getConflictingFiles(job),
      conflicting_agents: this._getConflictingAgents(job),
      requires_user_approval: requiresUserApproval,
      requires_telegram_approval: requiresTelegramApproval,
      approval_required_reason: this._getApprovalReason(riskLevel, conflictRisk),
      recommendations: this._getRecommendations(riskLevel, conflictRisk),
      classified_at: new Date().toISOString(),
    };
  }

  /**
   * Register file ownership for conflict detection
   */
  registerFileOwner(filePath: string, agent: AgentType): void {
    if (!this.fileOwners.has(filePath)) {
      this.fileOwners.set(filePath, new Set());
    }
    this.fileOwners.get(filePath)!.add(agent);
  }

  /**
   * Detect if a job conflicts with other active jobs
   */
  detectFileConflict(
    filePath: string,
    currentAgent: AgentType,
    activeAgents: AgentType[]
  ): boolean {
    const owners = this.fileOwners.get(filePath) || new Set();

    for (const agent of activeAgents) {
      if (agent !== currentAgent && owners.has(agent)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Classify command by risk level
   */
  private _classifyRiskLevel(command: string): string {
    // High Risk
    for (const pattern of this.highRiskPatterns) {
      if (pattern.test(command)) {
        return "high";
      }
    }

    // Medium Risk
    for (const pattern of this.mediumRiskPatterns) {
      if (pattern.test(command)) {
        return "medium";
      }
    }

    // Low Risk
    for (const pattern of this.lowRiskPatterns) {
      if (pattern.test(command)) {
        return "low";
      }
    }

    // Default: Medium Risk if unknown
    return "medium";
  }

  /**
   * Detect conflict risk based on file patterns
   */
  private _detectConflictRisk(job: DispatchJob): "none" | "low" | "medium" | "high" {
    const prompt = (job.prompt || "").toLowerCase();

    // High-risk files that should never be parallel edited
    const criticalPatterns = [
      /package\.json/,
      /tsconfig\.json/,
      /\.env/,
      /auth\//,
      /security\//,
      /runner\//,
      /approval-token-store/,
    ];

    for (const pattern of criticalPatterns) {
      if (pattern.test(prompt)) {
        return "high";
      }
    }

    // Page-level files (app/*/page.tsx) should be carefully handled
    if (prompt.includes("page.tsx")) {
      return "medium";
    }

    return "none";
  }

  private _getConflictingFiles(job: DispatchJob): string[] | undefined {
    const criticalFiles = [
      "package.json",
      "tsconfig.json",
      ".env",
      "auth/",
      "security/",
      "runner/",
      "approval-token-store.ts",
    ];

    if (job.prompt) {
      const mentionedFiles = job.prompt.match(/[\w\-./]+\.(ts|tsx|json|env)/gi) || [];
      return mentionedFiles.filter((f) =>
        criticalFiles.some((cf) => f.includes(cf))
      );
    }

    return undefined;
  }

  private _getConflictingAgents(job: DispatchJob): AgentType[] | undefined {
    // Simplified: In production, would check against active jobs
    return undefined;
  }

  private _getClassificationReason(riskLevel: string): string {
    switch (riskLevel) {
      case "high":
        return "This operation affects production systems, critical files, or requires remote changes. Telegram approval required.";
      case "medium":
        return "This operation makes local changes or deployments to non-production. Monitor required.";
      case "low":
        return "Read-only or local verification operation. Safe to execute automatically.";
      default:
        return "Unknown risk classification.";
    }
  }

  private _getApprovalReason(riskLevel: string, conflictRisk: string): string | undefined {
    const reasons: string[] = [];

    if (riskLevel === "high") {
      reasons.push("High-risk operation (Git push, DB migration, production deploy)");
    } else if (riskLevel === "medium") {
      reasons.push("Medium-risk operation (local changes, build, preview deploy)");
    }

    if (conflictRisk === "high") {
      reasons.push("High conflict risk with critical files");
    } else if (conflictRisk === "medium") {
      reasons.push("Potential conflict with route-level files");
    }

    return reasons.length > 0 ? reasons.join("; ") : undefined;
  }

  private _getRecommendations(riskLevel: string, conflictRisk: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel === "high") {
      recommendations.push("Requires Telegram approval before execution");
      recommendations.push("Ensure all tests pass before approval");
      recommendations.push("Review deployment checklist");
    }

    if (riskLevel === "medium") {
      recommendations.push("Send Telegram status report after execution");
      recommendations.push("Monitor for errors in logs");
    }

    if (conflictRisk === "high") {
      recommendations.push("Sequential execution recommended");
      recommendations.push("No parallel execution with other agents");
    } else if (conflictRisk === "medium") {
      recommendations.push("Restrict parallel agents to isolated components");
    }

    return recommendations;
  }
}

let riskClassifier: RiskClassifier | null = null;

export function getRiskClassifier(): RiskClassifier {
  if (!riskClassifier) {
    riskClassifier = new RiskClassifier();
  }
  return riskClassifier;
}

export function resetRiskClassifier(): void {
  riskClassifier = null;
}
