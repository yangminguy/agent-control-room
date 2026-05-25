// Detect dangerous commands in prompts that require ActionEnvelope approval

import { ActionType } from "./action-envelope";

export type DangerousCommandDetectionResult = {
  isDangerous: boolean;
  actionType?: ActionType;
  reason?: string;
  matchedPatterns?: string[];
};

const DANGEROUS_PATTERNS: Array<{
  regex: RegExp;
  actionType: ActionType;
  reason: string;
}> = [
  {
    regex: /git\s+push(?:\s+--force|-f)?/i,
    actionType: "git_push",
    reason: "Git push operations can affect remote repository state",
  },
  {
    regex: /git\s+reset\s+--hard/i,
    actionType: "destructive_git",
    reason: "Hard reset discards local changes permanently",
  },
  {
    regex: /git\s+clean\s+-(?:.*f|f.*d)/i,
    actionType: "destructive_git",
    reason: "Git clean with force flag permanently deletes files",
  },
  {
    regex: /rm\s+-(?:.*r|r.*f|.*f.*r)/i,
    actionType: "destructive_git",
    reason: "Recursive force remove permanently deletes files",
  },
  {
    regex: /npm\s+install|pnpm\s+install|yarn\s+install|npm\s+ci/i,
    actionType: "package_install",
    reason: "Package installation can modify dependencies and lockfile",
  },
  {
    regex: /npm\s+upgrade|npm\s+update|pnpm\s+update|yarn\s+upgrade/i,
    actionType: "package_install",
    reason: "Package upgrades can change dependency versions significantly",
  },
  {
    regex: /(\.env|\.env\.local|\.env\.prod|\.env\.secret)\s*=/i,
    actionType: "env_change",
    reason: "Environment variable changes can affect runtime behavior",
  },
  {
    regex: /process\.env\[.*\]\s*=|process\.env\.[A-Z_]+\s*=/i,
    actionType: "env_change",
    reason: "Direct environment variable assignment in code",
  },
  {
    regex: /DATABASE_URL|API_KEY|SECRET|PASSWORD|TOKEN|PRIVATE_KEY/i,
    actionType: "env_change",
    reason: "Command references sensitive secrets",
  },
  {
    regex: /deploy|release|publish|production/i,
    actionType: "production_deploy",
    reason: "Deploy/release operations can affect live systems",
  },
  {
    regex: /migrate|migration|schema change|alter table/i,
    actionType: "db_migration",
    reason: "Database schema modifications require careful coordination",
  },
];

export function detectDangerousCommand(prompt: string): DangerousCommandDetectionResult {
  const matchedPatterns: string[] = [];

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.regex.test(prompt)) {
      matchedPatterns.push(pattern.reason);

      // Return first match (most dangerous first)
      return {
        isDangerous: true,
        actionType: pattern.actionType,
        reason: pattern.reason,
        matchedPatterns,
      };
    }
  }

  return {
    isDangerous: false,
    matchedPatterns: [],
  };
}

/**
 * Extract the actual command from a dangerous prompt
 * Used for intentHash verification
 */
export function extractCommandFromPrompt(prompt: string): string {
  // For most cases, the prompt itself is the command
  // This could be enhanced to parse structured commands
  return prompt;
}
