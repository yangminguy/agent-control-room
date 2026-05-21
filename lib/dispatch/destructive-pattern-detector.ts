/**
 * T-AUTO-010: Destructive Pattern Detector
 * Detects destructive patterns in prompts and task descriptions.
 */

export type DestructivePattern = {
  detected: boolean;
  patterns: string[];
  severity: "none" | "warning" | "critical";
};

const DESTRUCTIVE_PATTERNS = [
  "rm -rf",
  "rm -f /",
  "rm -r /",
  "git reset --hard",
  "git push --force",
  "git push -f",
  "git force-push",
  "DROP TABLE",
  "DROP DATABASE",
  "DELETE FROM",
  "TRUNCATE",
  "truncate table",
  "delete all",
  "wipe",
  "destroy",
  "erase",
  "format",
  "reformat",
  "factory reset",
  "hard reset",
];

/**
 * Detect destructive patterns in text (prompt, description, etc.)
 * Returns found patterns and severity level.
 */
export function detectDestructivePatterns(text: string): DestructivePattern {
  if (!text) {
    return {
      detected: false,
      patterns: [],
      severity: "none",
    };
  }

  const found: string[] = [];
  const lowercaseText = text.toLowerCase();

  for (const pattern of DESTRUCTIVE_PATTERNS) {
    if (lowercaseText.includes(pattern.toLowerCase())) {
      found.push(pattern);
    }
  }

  return {
    detected: found.length > 0,
    patterns: found,
    severity: found.length > 0 ? "critical" : "none",
  };
}

/**
 * Get human-readable explanation for detected patterns.
 */
export function destructivePatternExplanation(patterns: string[]): string {
  if (patterns.length === 0) {
    return "No destructive patterns detected.";
  }

  return `Destructive patterns detected: ${patterns.join(", ")}. These operations cannot be undone.`;
}
