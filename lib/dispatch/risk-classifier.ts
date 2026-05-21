import { RiskLevel, PlanTask } from "../types";
import { detectDestructivePatterns } from "./destructive-pattern-detector";

/**
 * T041: Risk Classifier
 * Analyze task properties and return risk level: safe | low | medium | high | critical
 */

const CRITICAL_KEYWORDS = [
  "deploy",
  "deployment",
  "production",
  "migrate",
  "migration",
  "drop table",
  "delete table",
  "git push",
  "git merge",
  "force push",
  "reset --hard",
  "environment variable",
  "secret",
  "api key",
];

const HIGH_KEYWORDS = [
  "authentication",
  "auth",
  "password",
  "token",
  "security",
  "permission",
  "access control",
  "encryption",
  "certificate",
  "ssl",
  "tls",
];

const MEDIUM_KEYWORDS = [
  "install",
  "package",
  "dependency",
  "npm install",
  "schema",
  "database",
  "migration",
  "api route",
  "endpoint",
  "config",
  "configuration",
];

const LOW_KEYWORDS = [
  "type",
  "interface",
  "refactor",
  "rename",
  "format",
  "lint",
  "style",
  "documentation",
  "readme",
  "comment",
];

const SAFE_KEYWORDS = [
  "test",
  "jest",
  "unit",
  "spec",
  "type check",
  "lint check",
  "format check",
];

/**
 * Score a task's risk based on keywords and properties.
 * Returns a risk level from safe to critical.
 */
export function classifyRisk(input: {
  title: string;
  description?: string;
  changedFiles?: string[];
  allowedFiles?: string[];
  doNotTouchFiles?: string[];
  prompt?: string;
}): RiskLevel {
  const { title, description, changedFiles, allowedFiles, doNotTouchFiles, prompt } =
    input;

  const combinedText = [
    title,
    description || "",
    changedFiles?.join(" ") || "",
    allowedFiles?.join(" ") || "",
    doNotTouchFiles?.join(" ") || "",
    prompt || "",
  ]
    .join(" ")
    .toLowerCase();

  // T-AUTO-010: Check for destructive patterns first (auto-escalate to critical)
  const destructive = detectDestructivePatterns(combinedText);
  if (destructive.detected) {
    return "critical";
  }

  // Check for critical markers
  if (CRITICAL_KEYWORDS.some((k) => combinedText.includes(k))) {
    return "critical";
  }

  // Check for high-risk markers
  if (HIGH_KEYWORDS.some((k) => combinedText.includes(k))) {
    return "high";
  }

  // Check for medium-risk markers
  if (MEDIUM_KEYWORDS.some((k) => combinedText.includes(k))) {
    return "medium";
  }

  // Check file boundaries: violations bump to high
  if (
    doNotTouchFiles &&
    doNotTouchFiles.length > 0 &&
    changedFiles &&
    changedFiles.some((f) =>
      doNotTouchFiles.some((pattern) => matchFilePattern(f, pattern))
    )
  ) {
    return "high";
  }

  // Check for safe markers (test-only tasks)
  if (SAFE_KEYWORDS.some((k) => combinedText.includes(k))) {
    return "safe";
  }

  // Check for low-risk markers
  if (LOW_KEYWORDS.some((k) => combinedText.includes(k))) {
    return "low";
  }

  // Default: low risk for unclassified work
  return "low";
}

/**
 * Classify a plan task for autonomous dispatch.
 */
export function classifyPlanTaskRisk(task: PlanTask): RiskLevel {
  return classifyRisk({
    title: task.title,
    description: task.description,
    allowedFiles: task.allowedFiles,
    doNotTouchFiles: task.doNotTouchFiles,
  });
}

/**
 * Check if a file matches a glob-like pattern.
 * Simple implementation: supports *, **, and exact matches.
 */
function matchFilePattern(filePath: string, pattern: string): boolean {
  // Exact match
  if (filePath === pattern) return true;

  // Simple wildcard: convert pattern to regex
  const regexPattern = pattern
    .replace(/\./g, "\\.")
    .replace(/\*\*/g, "___DOUBLE_STAR___")
    .replace(/\*/g, "[^/]*")
    .replace(/___DOUBLE_STAR___/g, ".*");

  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(filePath);
}

/**
 * Get human-readable explanation for risk level.
 */
export function riskExplanation(level: RiskLevel): string {
  switch (level) {
    case "safe":
      return "Safe: Isolated type fixes, documentation, non-breaking refactors";
    case "low":
      return "Low: Isolated feature addition, existing UI updates";
    case "medium":
      return "Medium: File deletion, package install, schema changes, API route additions";
    case "high":
      return "High: Authentication changes, security-critical code, DB structure changes";
    case "critical":
      return "Critical: Deployment, auth bypass, DB migration, git push/merge";
    default:
      return "Unknown risk level";
  }
}
