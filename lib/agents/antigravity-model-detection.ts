/**
 * Antigravity Model Detection & Switch Capability
 *
 * Detects current Antigravity model from session metadata or transcript.
 * Provides capability information for automatic model switching.
 */

export type AntigravityModelSwitchCapability = {
  canDetectCurrentModel: boolean;
  canSwitchAutomatically: boolean;
  switchMethod?: "tty" | "session_state" | "unsupported";
  currentModel?: string;
  lastCheckedAt: string;
  failureReason?: string;
};

// Expected Antigravity models
const ANTIGRAVITY_MODELS = [
  "Gemini 3.5 Flash (Medium)",
  "Gemini 3.5 Flash (High)",
  "Gemini 3.1 Pro (Low)",
  "Gemini 3.1 Pro (High)",
  "Claude Sonnet 4.6 (Thinking)",
  "Claude Opus 4.6 (Thinking)",
  "GPT-OSS 120B (Medium)",
];

// Map display names to model IDs
const MODEL_DISPLAY_TO_ID: Record<string, string> = {
  "Gemini 3.5 Flash (Medium)": "gemini-3.5-flash-medium",
  "Gemini 3.5 Flash (High)": "gemini-3.5-flash-high",
  "Gemini 3.1 Pro (Low)": "gemini-3.1-pro-low",
  "Gemini 3.1 Pro (High)": "gemini-3.1-pro-high",
  "Claude Sonnet 4.6 (Thinking)": "claude-sonnet-4.6-thinking",
  "Claude Opus 4.6 (Thinking)": "claude-opus-4.6-thinking",
  "GPT-OSS 120B (Medium)": "gpt-oss-120b-medium",
};

/**
 * Detect current Antigravity model from session metadata
 *
 * Approach B: Check for recent model selection metadata in Antigravity brain directory
 * Path: ~/.gemini/antigravity-cli/brain/
 *
 * For now, returns detection capability status without actually reading files.
 * In production, would read:
 * - ~/.gemini/antigravity-cli/settings.json for current model setting
 * - transcript metadata for model selection events
 */
export async function detectAntigravityCurrentModel(): Promise<
  string | undefined
> {
  // TODO: Implement actual detection from ~/.gemini/antigravity-cli/brain
  // For now, this is a placeholder that returns undefined (no current model detected)
  // Production implementation would:
  // 1. Check ~/.gemini/antigravity-cli/settings.json
  // 2. Parse recent model selection metadata
  // 3. Return detected model name or undefined

  return undefined;
}

/**
 * Get Antigravity model switch capability status
 *
 * Determines:
 * - Whether we can detect the current model
 * - Whether we can switch models automatically
 * - What method would be used (TTY, session state, or unsupported)
 */
export function getAntigravityModelSwitchCapability(): AntigravityModelSwitchCapability {
  // Current status: TTY-based automation is not yet implemented
  // Session state detection is possible but not yet wired
  // Fallback behavior is implemented instead

  return {
    canDetectCurrentModel: false,
    canSwitchAutomatically: false,
    switchMethod: "unsupported",
    lastCheckedAt: new Date().toISOString(),
    failureReason:
      "TTY-based model switching not yet implemented. System will fallback to suitable agent instead.",
  };
}

/**
 * Check if automatic model switch is possible
 */
export function canSwitchAntigravityModelAutomatically(): boolean {
  const capability = getAntigravityModelSwitchCapability();
  return capability.canSwitchAutomatically;
}

/**
 * Get description of why automatic switching is not available
 */
export function getAntigravityModelSwitchExplanation(): string {
  const capability = getAntigravityModelSwitchCapability();

  if (capability.canSwitchAutomatically) {
    return `Model can be switched via ${capability.switchMethod}`;
  }

  if (capability.failureReason) {
    return capability.failureReason;
  }

  return "Antigravity automatic model switching is not supported at this time";
}

/**
 * Convert Antigravity display name to model ID
 */
export function antigravityDisplayToModelId(
  displayName: string
): string | undefined {
  return MODEL_DISPLAY_TO_ID[displayName];
}

/**
 * Check if a string is a valid Antigravity model name
 */
export function isValidAntigravityModel(modelName: string): boolean {
  return ANTIGRAVITY_MODELS.includes(modelName);
}

/**
 * Get all valid Antigravity model names
 */
export function getValidAntigravityModels(): string[] {
  return [...ANTIGRAVITY_MODELS];
}

/**
 * Recommend a model for Antigravity based on task complexity
 */
export function recommendAntigravityModel(taskComplexity: "light" | "medium" | "complex"): {
  modelId: string;
  displayName: string;
  reason: string;
} {
  switch (taskComplexity) {
    case "light":
      return {
        modelId: "gemini-3.5-flash-medium",
        displayName: "Gemini 3.5 Flash (Medium)",
        reason: "Fast for light UI copy and simple edits",
      };
    case "medium":
      return {
        modelId: "gemini-3.1-pro-low",
        displayName: "Gemini 3.1 Pro (Low)",
        reason: "Good balance for medium UI structure work",
      };
    case "complex":
      return {
        modelId: "gemini-3.1-pro-high",
        displayName: "Gemini 3.1 Pro (High)",
        reason: "Better reasoning for complex UI/UX layout",
      };
  }
}

/**
 * For future TTY-based implementation:
 * Skeleton for sending /model command to interactive agy session
 */
export async function attemptAntigravityModelSwitch(
  _targetModelName: string
): Promise<{
  success: boolean;
  message: string;
}> {
  // This is where TTY-based automation would go:
  // 1. Start agy interactive process
  // 2. Send "/model" command
  // 3. Select model by name
  // 4. Confirm and return to prompt

  return {
    success: false,
    message:
      "TTY-based Antigravity model switching not yet implemented. System will fallback to suitable agent instead.",
  };
}
