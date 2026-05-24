/**
 * Antigravity Model Detection & Switch Capability
 *
 * Detects current Antigravity model from settings.json.
 * Provides capability information for automatic model switching via config_write.
 */
import fs from "fs";
import os from "os";
import path from "path";
import {
  readAntigravitySettings,
  writeAntigravitySettings,
  backupAntigravitySettings,
  getAntigravitySettingsPath,
} from "./antigravity-settings";

/** Resolve the agy binary path without importing the runner (avoids circular dep). */
function resolveAgyBinaryPath(): string {
  const candidates = [
    path.join(os.homedir(), ".local", "bin", "agy"),
    path.join("/opt", "homebrew", "bin", "agy"),
    path.join("/usr", "local", "bin", "agy"),
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  return "agy";
}

export type AntigravityModelSwitchCapability = {
  canDetectCurrentModel: boolean;
  canSwitchAutomatically: boolean;
  switchMethod?: "config_write" | "tty" | "session_state" | "unsupported";
  currentModel?: string;
  settingsPath?: string;
  binaryPath?: string;
  lastCheckedAt: string;
  failureReason?: string;
};

export type AntigravityModelSwitchResult = {
  success: boolean;
  previousModel?: string;
  targetModel?: string;
  backupPath?: string;
  message: string;
};

// Re-exported from runner for backward compatibility
export type { AntigravityRunOptions } from "./antigravity-runner";

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
 * Detect current Antigravity model from settings.json.
 * Returns the model string if the key exists, undefined otherwise.
 */
export async function detectAntigravityCurrentModel(): Promise<
  string | undefined
> {
  const result = await readAntigravitySettings();
  if (!result.success || !result.settings) {
    return undefined;
  }
  const model = result.settings.model;
  return typeof model === "string" ? model : undefined;
}

/**
 * Get Antigravity model switch capability status synchronously.
 * Uses only sync I/O so it can be called without await (backward compatible).
 * For full async detection (reads settings.json model), use checkAntigravityModelSwitchCapability().
 */
export function getAntigravityModelSwitchCapability(): AntigravityModelSwitchCapability {
  const binaryPath = resolveAgyBinaryPath();
  const settingsPath = getAntigravitySettingsPath();

  const binaryExists = fs.existsSync(binaryPath);
  if (!binaryExists) {
    return {
      canDetectCurrentModel: false,
      canSwitchAutomatically: false,
      switchMethod: "unsupported",
      binaryPath,
      settingsPath,
      lastCheckedAt: new Date().toISOString(),
      failureReason: `agy binary not found at ${binaryPath}`,
    };
  }

  const settingsExists = fs.existsSync(settingsPath);
  if (!settingsExists) {
    return {
      canDetectCurrentModel: false,
      canSwitchAutomatically: false,
      switchMethod: "unsupported",
      binaryPath,
      settingsPath,
      lastCheckedAt: new Date().toISOString(),
      failureReason: `settings.json does not exist at ${settingsPath}`,
    };
  }

  return {
    canDetectCurrentModel: true,
    canSwitchAutomatically: true,
    switchMethod: "config_write",
    binaryPath,
    settingsPath,
    lastCheckedAt: new Date().toISOString(),
  };
}

/**
 * Full async capability check — also reads settings.json to detect current model.
 */
export async function checkAntigravityModelSwitchCapability(): Promise<AntigravityModelSwitchCapability> {
  const base = getAntigravityModelSwitchCapability();
  if (!base.canDetectCurrentModel) return base;

  const settingsResult = await readAntigravitySettings();
  if (!settingsResult.success) {
    return {
      ...base,
      canDetectCurrentModel: false,
      canSwitchAutomatically: false,
      switchMethod: "unsupported",
      failureReason: `settings.json parse error: ${settingsResult.error}`,
    };
  }

  return {
    ...base,
    currentModel: settingsResult.settings?.model as string | undefined,
  };
}

/**
 * Check if automatic model switch is possible (sync).
 */
export function canSwitchAntigravityModelAutomatically(): boolean {
  return getAntigravityModelSwitchCapability().canSwitchAutomatically;
}

/**
 * Get description of why automatic switching is not available (sync).
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
 * Attempt to switch Antigravity model via config_write.
 * Backs up settings.json, updates only the model key, preserves all other keys.
 */
export async function attemptAntigravityModelSwitch(
  targetModelName: string
): Promise<AntigravityModelSwitchResult> {
  const readResult = await readAntigravitySettings();
  if (!readResult.success || !readResult.settings) {
    const settingsPath = getAntigravitySettingsPath();
    return {
      success: false,
      targetModel: targetModelName,
      message: `settings.json does not exist at ${settingsPath}`,
    };
  }

  const previousModel = readResult.settings.model as string | undefined;

  const backup = await backupAntigravitySettings();
  if (!backup) {
    const settingsPath = getAntigravitySettingsPath();
    return {
      success: false,
      previousModel,
      targetModel: targetModelName,
      message: `Failed to write settings.json: backup failed for ${settingsPath}`,
    };
  }

  const updated = { ...readResult.settings, model: targetModelName };
  const writeResult = await writeAntigravitySettings(updated);

  if (!writeResult.success) {
    return {
      success: false,
      previousModel,
      targetModel: targetModelName,
      backupPath: backup.backupPath,
      message: writeResult.error ?? `Failed to write settings.json: unknown error`,
    };
  }

  return {
    success: true,
    previousModel,
    targetModel: targetModelName,
    backupPath: backup.backupPath,
    message: `Switched model from ${previousModel ?? "(none)"} to ${targetModelName}`,
  };
}

/**
 * Execute fn() with a temporary Antigravity model change.
 * Restores the previous model in a finally block — even if fn() throws.
 */
export async function withAntigravityModel<T>(
  targetModel: string,
  fn: () => Promise<T>
): Promise<T> {
  const previousModel = await detectAntigravityCurrentModel();

  await attemptAntigravityModelSwitch(targetModel);

  try {
    return await fn();
  } finally {
    if (previousModel !== undefined) {
      await attemptAntigravityModelSwitch(previousModel);
    }
  }
}
