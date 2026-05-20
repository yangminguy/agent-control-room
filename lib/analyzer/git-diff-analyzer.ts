import { execSync } from "child_process";
import type { CompletionJudgment } from "@/lib/types";

/**
 * T019 — Git Diff Analyzer
 * Captures git diff, analyzes against acceptance criteria, and produces completion judgment.
 */

export interface DiffAnalysisInput {
  cwd: string;
  branchName?: string | null;
  acceptanceCriteria: string[];
}

export interface DiffAnalysisOutput {
  changedFiles: string[];
  addedLines: number;
  removedLines: number;
  diffSummary: string;
  completionJudgment: CompletionJudgment;
  nextPrompt: string;
}

/**
 * Captures `git diff --name-only` to get list of changed files.
 */
export function captureChangedFiles(cwd: string): string[] {
  try {
    const output = execSync("git diff --name-only", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    return output
      .trim()
      .split("\n")
      .filter((file) => file.length > 0);
  } catch (error) {
    console.error("Failed to capture changed files:", error);
    return [];
  }
}

/**
 * Captures `git diff` and returns the full diff text.
 */
export function captureDiffText(cwd: string): string {
  try {
    return execSync("git diff", {
      cwd,
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch (error) {
    console.error("Failed to capture diff text:", error);
    return "";
  }
}

/**
 * Parses diff text to extract added/removed line counts.
 * Counts lines starting with "+" (added) and "-" (removed), excluding diff headers.
 */
export function parseDiffStats(diffText: string): {
  addedLines: number;
  removedLines: number;
} {
  if (!diffText) return { addedLines: 0, removedLines: 0 };

  let addedLines = 0;
  let removedLines = 0;

  const lines = diffText.split("\n");
  for (const line of lines) {
    // Skip diff headers and context lines
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) {
      continue;
    }
    if (line.startsWith("+")) {
      addedLines++;
    } else if (line.startsWith("-")) {
      removedLines++;
    }
  }

  return { addedLines, removedLines };
}

/**
 * Generates a plain-language summary of diff changes.
 * Conservative approach: summarizes what was changed without claiming completion.
 */
export function generateDiffSummary(
  changedFiles: string[],
  addedLines: number,
  removedLines: number,
  diffText: string,
): string {
  if (changedFiles.length === 0) {
    return "No files changed.";
  }

  const lines: string[] = [];
  lines.push(`Modified ${changedFiles.length} file(s):`);
  changedFiles.forEach((f) => {
    lines.push(`  - ${f}`);
  });

  if (addedLines > 0 || removedLines > 0) {
    lines.push(`Changes: +${addedLines} lines, -${removedLines} lines`);
  }

  return lines.join("\n");
}

/**
 * Analyzes diff against acceptance criteria.
 * Conservative judgment: only marks as "completed" if clear evidence supports it.
 */
export function analyzeDiffAgainstTask(
  diffText: string,
  changedFiles: string[],
  acceptanceCriteria: string[],
): CompletionJudgment {
  if (changedFiles.length === 0) {
    return "not_completed";
  }

  // Conservative heuristic:
  // - If no diff or no acceptance criteria, mark pending
  if (!diffText || acceptanceCriteria.length === 0) {
    return "pending";
  }

  // Check if changed files appear to address acceptance criteria
  const diffLower = diffText.toLowerCase();
  const criteriaMatches = acceptanceCriteria.filter((criterion) => {
    // Simple keyword matching: look for criterion keywords in diff
    const keywords = criterion
      .split(/\s+/)
      .filter((w) => w.length > 3)
      .map((w) => w.toLowerCase());

    return keywords.some((keyword) => diffLower.includes(keyword));
  });

  const matchPercentage = criteriaMatches.length / acceptanceCriteria.length;

  // Judgment logic
  if (matchPercentage >= 0.8) {
    return "completed";
  } else if (matchPercentage >= 0.3) {
    return "partial";
  } else {
    return "not_completed";
  }
}

/**
 * Maps completion judgment to PlanTaskStatus.
 */
export function mapJudgmentToTaskStatus(
  judgment: CompletionJudgment,
): "done" | "partial" | "blocked" | "needs_review" {
  switch (judgment) {
    case "completed":
      return "done";
    case "partial":
      return "partial";
    case "not_completed":
      return "needs_review";
    case "pending":
      return "blocked";
  }
}

/**
 * Generates next recommended prompt based on completion judgment.
 */
export function generateNextPrompt(
  completionJudgment: CompletionJudgment,
  acceptanceCriteria: string[],
  diffSummary: string,
): string {
  switch (completionJudgment) {
    case "completed":
      return "Work completed. Consider moving to the next task.";

    case "partial":
      return `Work partially completed. Remaining acceptance criteria to address:\n${acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`;

    case "not_completed":
      return `Work not yet complete. All acceptance criteria still need implementation:\n${acceptanceCriteria.map((c) => `- ${c}`).join("\n")}`;

    case "pending":
      return `Cannot determine completion. Review diff and acceptance criteria manually.\n\nDiff summary:\n${diffSummary}`;
  }
}

/**
 * Builds a session report draft from analysis results.
 */
export function buildSessionReportDraft(output: DiffAnalysisOutput): {
  summary: string;
  changedFiles: string[];
  completionJudgment: CompletionJudgment;
} {
  return {
    summary: output.diffSummary,
    changedFiles: output.changedFiles,
    completionJudgment: output.completionJudgment,
  };
}

/**
 * Main analysis function: captures git diff, analyzes, and returns results.
 */
export async function analyzeDiff(
  input: DiffAnalysisInput,
): Promise<DiffAnalysisOutput> {
  const { cwd, branchName, acceptanceCriteria } = input;

  const changedFiles = captureChangedFiles(cwd);
  const diffText = captureDiffText(cwd);
  const { addedLines, removedLines } = parseDiffStats(diffText);

  const diffSummary = generateDiffSummary(
    changedFiles,
    addedLines,
    removedLines,
    diffText,
  );

  const completionJudgment = analyzeDiffAgainstTask(
    diffText,
    changedFiles,
    acceptanceCriteria,
  );

  const nextPrompt = generateNextPrompt(
    completionJudgment,
    acceptanceCriteria,
    diffSummary,
  );

  return {
    changedFiles,
    addedLines,
    removedLines,
    diffSummary,
    completionJudgment,
    nextPrompt,
  };
}
