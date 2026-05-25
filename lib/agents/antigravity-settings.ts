// Antigravity settings.json 관리
import { promises as fs } from "fs";
import path from "path";

export type AntigravitySettings = {
  model?: string;
  colorScheme?: string;
  trustedWorkspaces?: string[];
  [key: string]: unknown;
};

export type AntigravitySettingsResult = {
  success: boolean;
  path: string;
  settings?: AntigravitySettings;
  error?: string;
};

export type AntigravityBackupInfo = {
  backupPath: string;
  originalPath: string;
  timestamp: string;
};

export const getAntigravitySettingsPath = (): string => {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  if (process.platform === "win32") {
    return path.join(homeDir, ".gemini", "antigravity-cli", "settings.json");
  }
  return path.join(homeDir, ".gemini", "antigravity-cli", "settings.json");
};

export const readAntigravitySettings = async (): Promise<AntigravitySettingsResult> => {
  try {
    const settingsPath = getAntigravitySettingsPath();
    const content = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(content);
    return { success: true, path: settingsPath, settings };
  } catch (error) {
    return {
      success: false,
      path: getAntigravitySettingsPath(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};

export const writeAntigravitySettings = async (
  settings: AntigravitySettings,
  options?: { backup?: boolean }
): Promise<AntigravitySettingsResult> => {
  try {
    const settingsPath = getAntigravitySettingsPath();
    const dir = path.dirname(settingsPath);

    if (options?.backup) {
      await backupAntigravitySettings();
    }

    await fs.mkdir(dir, { recursive: true });

    const tmpPath = `${settingsPath}.tmp`;
    await fs.writeFile(tmpPath, JSON.stringify(settings, null, 2), "utf-8");
    await fs.rename(tmpPath, settingsPath);

    return { success: true, path: settingsPath, settings };
  } catch (error) {
    return {
      success: false,
      path: getAntigravitySettingsPath(),
      error: `Failed to write settings.json: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
};

export const backupAntigravitySettings = async (): Promise<AntigravityBackupInfo | null> => {
  try {
    const settingsPath = getAntigravitySettingsPath();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const backupPath = `${settingsPath}.backup-${timestamp}`;

    await fs.copyFile(settingsPath, backupPath);

    return { backupPath, originalPath: settingsPath, timestamp };
  } catch (error) {
    return null;
  }
};

export const restoreAntigravitySettingsFromBackup = async (
  backupPath: string
): Promise<AntigravitySettingsResult> => {
  try {
    const settingsPath = getAntigravitySettingsPath();
    await fs.copyFile(backupPath, settingsPath);

    const content = await fs.readFile(settingsPath, "utf-8");
    const settings = JSON.parse(content);

    return { success: true, path: settingsPath, settings };
  } catch (error) {
    return {
      success: false,
      path: getAntigravitySettingsPath(),
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
